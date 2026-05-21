using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;
using Npgsql;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Net;
using Mahima.Api.v3.clean.Helpers;
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.SignalR;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly string _connStr;
    private readonly ILogger<AuthController> _logger;
    private readonly JwtTokenService _jwtService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;
    private readonly IPastorBotService _pastorBot;
    private readonly IHubContext<ChatHub> _chatHub;
        //private readonly PasswordHasher<object> _pwHasher = new PasswordHasher<object>();
		//private readonly PasswordHasher<string> _pwHasher = new PasswordHasher<string>();
		private readonly PasswordHasher<object> _pwHasher = new PasswordHasher<object>();
    public AuthController(
        IConfiguration config,
        ILogger<AuthController> logger,
        JwtTokenService jwtService,
        IEmailService emailService,
        IPastorBotService pastorBot,
        IHubContext<ChatHub> chatHub)
    {
        _logger = logger;
        _jwtService = jwtService;
        _emailService = emailService;
        _config = config;
        _pastorBot = pastorBot;
        _chatHub = chatHub;
        _connStr = config.GetConnectionString("DefaultConnection")
                   ?? throw new InvalidOperationException("Connection string missing");
    }

    private async Task SendNewUserWelcomeAsync(Guid userId, string? displayName)
    {
        try
        {
            var sent = await _pastorBot.SendJaiMasihMessageAsync(
                MinistryMessageFactory.BuildNewUserWelcome(displayName),
                HttpContext.RequestAborted);

            await _chatHub.Clients.All.SendAsync("ReceiveMessage", sent, HttpContext.RequestAborted);
            _logger.LogInformation("AI Pastor welcome sent for registered user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI Pastor welcome could not be sent for registered user {UserId}", userId);
        }
    }

    public class LoginDto
    {
        public string? UsernameOrEmail { get; set; }
        public string? Password { get; set; }
    }

    public class RegisterDto
    {
        public string? Username { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string? DisplayName { get; set; }
        public string? Phone { get; set; }
    }

    private static string QuoteIdentifier(string identifier) =>
        "\"" + identifier.Replace("\"", "\"\"") + "\"";

    private static async Task<string?> GetUserColumnAsync(NpgsqlConnection conn, params string[] candidates)
    {
        foreach (var candidate in candidates)
        {
            await using var cmd = new NpgsqlCommand(@"
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND LOWER(column_name) = LOWER(@column)
LIMIT 1;", conn);
            cmd.Parameters.AddWithValue("column", NpgsqlTypes.NpgsqlDbType.Text, candidate);
            var value = await cmd.ExecuteScalarAsync();
            if (value != null && value != DBNull.Value)
                return value.ToString();
        }

        return null;
    }

    private static async Task<string> GenerateUserCodeAsync(NpgsqlConnection conn, string userCodeColumn)
    {
        for (var attempt = 0; attempt < 50; attempt++)
        {
            var code = $"MHN{RandomNumberGenerator.GetInt32(1, 999999):D6}";
            await using var cmd = new NpgsqlCommand(
                $"SELECT COUNT(*) FROM public.users WHERE {QuoteIdentifier(userCodeColumn)} = @code;",
                conn);
            cmd.Parameters.AddWithValue("code", NpgsqlTypes.NpgsqlDbType.Text, code);
            var exists = Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
            if (!exists) return code;
        }

        return $"MHN{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 100000000:D8}";
    }

    private static async Task EnsureAuthSecurityTablesAsync(NpgsqlConnection conn)
    {
        await using var cmd = new NpgsqlCommand(@"
CREATE TABLE IF NOT EXISTS public.security_events (
    id bigserial PRIMARY KEY,
    event_type text NOT NULL,
    severity text NOT NULL DEFAULT 'medium',
    username text NULL,
    user_id uuid NULL,
    path text NULL,
    ip_address text NULL,
    user_agent text NULL,
    details text NULL,
    created_at_utc timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_security_events_created_at
    ON public.security_events(created_at_utc);

CREATE TABLE IF NOT EXISTS public.user_access_blocks (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    reason text NULL,
    blocked_by uuid NULL,
    blocked_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    is_active boolean NOT NULL DEFAULT true
);", conn);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task RecordSecurityEventAsync(
        NpgsqlConnection conn,
        string eventType,
        string severity,
        string? username,
        Guid? userId,
        string details)
    {
        try
        {
            await using var cmd = new NpgsqlCommand(@"
INSERT INTO public.security_events
    (event_type, severity, username, user_id, path, ip_address, user_agent, details)
VALUES
    (@event_type, @severity, @username, @user_id, @path, @ip_address, @user_agent, @details);", conn);
            cmd.Parameters.AddWithValue("event_type", NpgsqlTypes.NpgsqlDbType.Text, eventType);
            cmd.Parameters.AddWithValue("severity", NpgsqlTypes.NpgsqlDbType.Text, severity);
            cmd.Parameters.AddWithValue("username", NpgsqlTypes.NpgsqlDbType.Text, (object?)username ?? DBNull.Value);
            cmd.Parameters.AddWithValue("user_id", NpgsqlTypes.NpgsqlDbType.Uuid, userId.HasValue ? (object)userId.Value : DBNull.Value);
            cmd.Parameters.AddWithValue("path", NpgsqlTypes.NpgsqlDbType.Text, HttpContext?.Request?.Path.ToString() ?? "/api/auth/login");
            cmd.Parameters.AddWithValue("ip_address", NpgsqlTypes.NpgsqlDbType.Text, HttpContext?.Connection?.RemoteIpAddress?.ToString() ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("user_agent", NpgsqlTypes.NpgsqlDbType.Text, HttpContext?.Request?.Headers.UserAgent.ToString() ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("details", NpgsqlTypes.NpgsqlDbType.Text, details);
            await cmd.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Security event logging failed for {EventType}", eventType);
        }
    }

    private static async Task<string?> GetActiveUserBlockReasonAsync(NpgsqlConnection conn, Guid userId)
    {
        await using var cmd = new NpgsqlCommand(@"
SELECT reason
FROM public.user_access_blocks
WHERE user_id = @user_id AND is_active = true
LIMIT 1;", conn);
        cmd.Parameters.AddWithValue("user_id", NpgsqlTypes.NpgsqlDbType.Uuid, userId);
        var value = await cmd.ExecuteScalarAsync();
        return value == null || value == DBNull.Value ? null : value.ToString();
    }

    // ============================
    // 🔥 GET CURRENT USER (FIXED)
    // ============================
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        try
        {
            var userIdText =
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub") ??
                User.FindFirstValue("nameid");

            if (!Guid.TryParse(userIdText, out var userId))
                return Unauthorized(new { message = "Invalid login session." });

            using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();
            await EnsureAuthSecurityTablesAsync(conn);

            var blockReason = await GetActiveUserBlockReasonAsync(conn, userId);
            if (!string.IsNullOrWhiteSpace(blockReason))
            {
                await RecordSecurityEventAsync(conn, "BlockedSession", "high", null, userId, blockReason);
                return StatusCode(423, new { message = "Your access is blocked. Please contact Mahima Ministry admin.", reason = blockReason });
            }

            var sql = @"
SELECT
  u.id,
  u.username,
  u.displayname,
  u.email,
  u.phone,
  r.name as role
FROM users u
JOIN roles r ON r.id = u.role::int
WHERE u.id = @id
LIMIT 1;";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.Add("id", NpgsqlTypes.NpgsqlDbType.Uuid).Value = userId;

            await using var rdr = await cmd.ExecuteReaderAsync();
            if (!await rdr.ReadAsync())
                return Unauthorized(new { message = "User not found." });

            var id = rdr["id"];
            var uname = rdr["username"]?.ToString();
            var display = rdr["displayname"]?.ToString();
            var email = rdr["email"]?.ToString();
            var phone = rdr["phone"]?.ToString();
            var role = rdr["role"]?.ToString();

            await rdr.CloseAsync();

            var pages = await LoadPermissions(conn, role);

            return Ok(new
            {
                id,
                username = uname,
                display,
                displayName = display,
                email,
                phone,
                role,
                pages
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in /me");
            return StatusCode(500, new { message = "Could not load current user.", detail = ex.Message });
        }
    }

    // ================= REGISTER =================
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var username = dto?.Username?.Trim();
        var email = dto?.Email?.Trim();
        var phone = dto?.Phone?.Trim();
        var display = (dto?.DisplayName ?? username)?.Trim();
        var password = dto?.Password;

        if (string.IsNullOrWhiteSpace(username))
            return BadRequest(new { message = "Username is required" });
        if (string.IsNullOrWhiteSpace(password))
            return BadRequest(new { message = "Password is required" });
        if (password.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters" });

        try
        {
            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();

            await using (var dupCmd = new NpgsqlCommand(@"
SELECT COUNT(*)
FROM users
WHERE LOWER(TRIM(username)) = @username
   OR (@email <> '' AND LOWER(TRIM(COALESCE(email, ''))) = @email);", conn))
            {
                dupCmd.Parameters.AddWithValue("username", NpgsqlTypes.NpgsqlDbType.Text, username.ToLowerInvariant());
                dupCmd.Parameters.AddWithValue("email", NpgsqlTypes.NpgsqlDbType.Text, (email ?? "").ToLowerInvariant());
                var existing = Convert.ToInt32(await dupCmd.ExecuteScalarAsync());
                if (existing > 0)
                    return Conflict(new { message = "Username or email already exists" });
            }

            var memberRoleId = 2;
            var memberRoleName = "Member";
            await using (var roleCmd = new NpgsqlCommand(@"
SELECT id, name
FROM roles
WHERE LOWER(name) = 'member'
LIMIT 1;", conn))
            await using (var roleRdr = await roleCmd.ExecuteReaderAsync())
            {
                if (await roleRdr.ReadAsync())
                {
                    memberRoleId = Convert.ToInt32(roleRdr["id"]);
                    memberRoleName = roleRdr["name"]?.ToString() ?? "Member";
                }
            }

            var passwordHash = _pwHasher.HashPassword(null, password);

            var insertColumns = new List<string>
            {
                QuoteIdentifier("username"),
                QuoteIdentifier("email"),
                QuoteIdentifier("passwordhash"),
                QuoteIdentifier("role"),
                QuoteIdentifier("joindate"),
                QuoteIdentifier("phone"),
                QuoteIdentifier("displayname"),
            };
            var insertValues = new List<string>
            {
                "@username",
                "@email",
                "@passwordhash",
                "@role",
                "NOW()",
                "@phone",
                "@displayname",
            };

            var userCodeColumn = await GetUserColumnAsync(conn, "UserCode", "usercode");
            var profilePhotoColumn = await GetUserColumnAsync(conn, "profilephotourl", "ProfilePhotoUrl");

            if (!string.IsNullOrWhiteSpace(userCodeColumn))
            {
                insertColumns.Insert(0, QuoteIdentifier(userCodeColumn));
                insertValues.Insert(0, "@usercode");
            }

            if (!string.IsNullOrWhiteSpace(profilePhotoColumn))
            {
                insertColumns.Add(QuoteIdentifier(profilePhotoColumn));
                insertValues.Add("NULL");
            }

            var insertSql = $@"
INSERT INTO public.users ({string.Join(", ", insertColumns)})
VALUES ({string.Join(", ", insertValues)})
RETURNING id;";

            await using var insertCmd = new NpgsqlCommand(insertSql, conn);
            if (!string.IsNullOrWhiteSpace(userCodeColumn))
            {
                var generatedCode = await GenerateUserCodeAsync(conn, userCodeColumn);
                insertCmd.Parameters.AddWithValue("usercode", NpgsqlTypes.NpgsqlDbType.Text, generatedCode);
            }
            insertCmd.Parameters.AddWithValue("username", NpgsqlTypes.NpgsqlDbType.Text, username);
            insertCmd.Parameters.AddWithValue("email", NpgsqlTypes.NpgsqlDbType.Text, (object?)email ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("passwordhash", NpgsqlTypes.NpgsqlDbType.Text, passwordHash);
            insertCmd.Parameters.AddWithValue("role", NpgsqlTypes.NpgsqlDbType.Text, memberRoleId.ToString());
            insertCmd.Parameters.AddWithValue("phone", NpgsqlTypes.NpgsqlDbType.Text, (object?)phone ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("displayname", NpgsqlTypes.NpgsqlDbType.Text, string.IsNullOrWhiteSpace(display) ? username : display);

            var id = await insertCmd.ExecuteScalarAsync();
            var userId = Guid.Parse(id?.ToString() ?? Guid.Empty.ToString());
            var pages = await LoadPermissions(conn, memberRoleName);
            var token = _jwtService.GenerateToken(userId, username, string.IsNullOrWhiteSpace(display) ? username : display, memberRoleName);
            await SendNewUserWelcomeAsync(userId, string.IsNullOrWhiteSpace(display) ? username : display);

            return Ok(new
            {
                token,
                user = new
                {
                    id,
                    username,
                    display = string.IsNullOrWhiteSpace(display) ? username : display,
                    email,
                    phone,
                    role = memberRoleName,
                    pages
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Registration failed for {User}", username);
            return StatusCode(500, new { message = "Registration failed", detail = ex.Message });
        }
    }

    // ================= LOGIN =================
[AllowAnonymous]
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginDto dto)
{
    if (dto == null || string.IsNullOrWhiteSpace(dto.UsernameOrEmail))
        return BadRequest(new { message = "Username/email required" });

    try
    {
        using var conn = new NpgsqlConnection(_connStr);
        await conn.OpenAsync();
        await EnsureAuthSecurityTablesAsync(conn);

       var sql = @"
SELECT 
  u.id,
  u.username,
  u.displayname,
  u.email,
  u.phone,
  r.name as role,
  u.passwordhash
FROM users u
JOIN roles r ON r.id = u.role::int
WHERE LOWER(TRIM(u.username)) = @u 
   OR LOWER(TRIM(u.email)) = @u
LIMIT 1;
";

        await using var cmd = new NpgsqlCommand(sql, conn);
        //cmd.Parameters.AddWithValue("u", dto.UsernameOrEmail);
		//var input = dto.UsernameOrEmail?.Trim();
		var input = dto.UsernameOrEmail?.Trim().ToLower();
		//cmd.Parameters.AddWithValue("u", input);
        cmd.Parameters.AddWithValue("u", NpgsqlTypes.NpgsqlDbType.Text, input.ToLower());
		await using var rdr = await cmd.ExecuteReaderAsync();
        if (!await rdr.ReadAsync())
        {
            _logger.LogWarning("Login failed: user not found {User}", dto.UsernameOrEmail);
            await rdr.CloseAsync();
            await RecordSecurityEventAsync(conn, "LoginFailed", "medium", dto.UsernameOrEmail, null, "User not found.");
            return Unauthorized(new { message = "Invalid credentials" });
        }

        var id = rdr["id"];
        var username = rdr["username"]?.ToString();
        var display = rdr["displayname"]?.ToString();
        var email = rdr["email"]?.ToString();
        var phone = rdr["phone"]?.ToString();
        var role = rdr["role"]?.ToString() ?? "";
        var storedHash = rdr["passwordhash"]?.ToString();

        if (string.IsNullOrWhiteSpace(dto.Password))
            return Unauthorized(new { message = "Password required" });

        if (string.IsNullOrWhiteSpace(storedHash))
        {
            _logger.LogWarning("Login failed: password hash missing for {User}", dto.UsernameOrEmail);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        //var result = _pwHasher.VerifyHashedPassword(null, storedHash, dto.Password);
		//var result = _pwHasher.VerifyHashedPassword(username, storedHash, dto.Password);
        //var result = _pwHasher.VerifyHashedPassword(null, storedHash, dto.Password);
		
		var result = _pwHasher.VerifyHashedPassword(null, storedHash, dto.Password);

		// 🔥 DEBUG LOG (ADD THIS)
		_logger.LogWarning("LOGIN DEBUG → User: {User}", username);
		_logger.LogWarning("LOGIN DEBUG → Hash: {Hash}", storedHash);
		_logger.LogWarning("LOGIN DEBUG → Password length: {Len}", dto.Password?.Length ?? 0);
		_logger.LogWarning("LOGIN DEBUG → Result: {Result}", result);
		_logger.LogWarning("LOGIN INPUT → '{Input}' LENGTH={Len}", input, input?.Length);
		_logger.LogWarning("LOGIN DEBUG → Result: {Result}", result);
		
		
		//if (result != PasswordVerificationResult.Success)
        if (result != PasswordVerificationResult.Success && result != PasswordVerificationResult.SuccessRehashNeeded)
		{
            _logger.LogWarning("Login failed: invalid password for {User}", dto.UsernameOrEmail);
            await rdr.CloseAsync();
            Guid? failedUserId = Guid.TryParse(id?.ToString(), out var parsedFailedUserId) ? parsedFailedUserId : null;
            await RecordSecurityEventAsync(conn, "LoginFailed", "medium", dto.UsernameOrEmail, failedUserId, "Invalid password.");
            return Unauthorized(new { message = "Invalid credentials" });
        }

        await rdr.CloseAsync(); // safe now

       // var token = _jwtService.GenerateToken(Guid.NewGuid(), username, display, role);
        var userGuid = Guid.Parse(id.ToString());
        var blockReason = await GetActiveUserBlockReasonAsync(conn, userGuid);
        if (!string.IsNullOrWhiteSpace(blockReason))
        {
            await RecordSecurityEventAsync(conn, "BlockedLogin", "high", username, userGuid, blockReason);
            return StatusCode(423, new { message = "Your access is blocked. Please contact Mahima Ministry admin.", reason = blockReason });
        }

	var token = _jwtService.GenerateToken(userGuid, username, display, role);
        var pages = await LoadPermissions(conn, role);

        return Ok(new
        {
            token,
            user = new
            {
                id,
                username,
                display,
                email,
                phone,
                role,
                pages
            }
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Login failed");

        return StatusCode(500, new
        {
            message = "Database error",
            detail = ex.Message
        });
    }
}

    // ============================
    // 🔥 PERMISSION LOADER
    // ============================
    private async Task<List<string>> LoadPermissions(NpgsqlConnection conn, string? role)
    {
        var pages = new List<string>();

        var permSql = @"
SELECT rp.page_key
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE LOWER(r.name) = LOWER(@role);";

        await using var permCmd = new NpgsqlCommand(permSql, conn);
        permCmd.Parameters.AddWithValue("role", role ?? "");

        await using var permRdr = await permCmd.ExecuteReaderAsync();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (await permRdr.ReadAsync())
        {
            var pageKey = permRdr.GetString(0).Trim().ToUpperInvariant();
            if (pageKey.Length > 0 && seen.Add(pageKey))
                pages.Add(pageKey);
        }

        return pages;
    }

    // ====================================================================
    //  FORGOT PASSWORD
    // ====================================================================
    public class ForgotPasswordDto
    {
        public string? UsernameOrEmail { get; set; }
    }

    public class ResetPasswordDto
    {
        public string? Token { get; set; }
        public string? NewPassword { get; set; }
    }

    /// <summary>
    /// Issues a single-use password reset token. To prevent account
    /// enumeration we always respond 200 OK with the same body regardless
    /// of whether the user was found.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var generic = new {
            message = "If an account exists for that address, a password reset link has been sent."
        };

        if (dto == null || string.IsNullOrWhiteSpace(dto.UsernameOrEmail))
            return Ok(generic);

        var input = dto.UsernameOrEmail.Trim().ToLowerInvariant();

        try
        {
            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();

            // Find the user (username OR email, case-insensitive).
            var lookupSql = @"
SELECT id, email, username, displayname
FROM users
WHERE LOWER(TRIM(username)) = @u OR LOWER(TRIM(email)) = @u
LIMIT 1;";

            Guid userId = Guid.Empty;
            string? email = null, username = null, displayName = null;

            await using (var cmd = new NpgsqlCommand(lookupSql, conn))
            {
                cmd.Parameters.AddWithValue("u", input);
                await using var rdr = await cmd.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    userId      = rdr.GetGuid(0);
                    email       = rdr.IsDBNull(1) ? null : rdr.GetString(1);
                    username    = rdr.IsDBNull(2) ? null : rdr.GetString(2);
                    displayName = rdr.IsDBNull(3) ? null : rdr.GetString(3);
                }
            }

            // No user, or user has no email on file — return the same response.
            if (userId == Guid.Empty || string.IsNullOrWhiteSpace(email))
                return Ok(generic);

            // Generate a high-entropy token (32 bytes ≈ 256 bits) and store
            // only its SHA-256 hash. Link in the email carries the plaintext.
            var rawToken = GenerateUrlSafeToken(32);
            var tokenHash = Sha256Hex(rawToken);
            var expiresAt = DateTime.UtcNow.AddHours(1);

            // Invalidate any prior unused tokens for this user (best-effort).
            await using (var inv = new NpgsqlCommand(
                @"UPDATE public.password_reset_tokens
                     SET used_at = now()
                   WHERE user_id = @u AND used_at IS NULL;", conn))
            {
                inv.Parameters.Add("u", NpgsqlTypes.NpgsqlDbType.Uuid).Value = userId;
                await inv.ExecuteNonQueryAsync();
            }

            await using (var ins = new NpgsqlCommand(
                @"INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at, ip)
                  VALUES (@u, @h, @e, @ip);", conn))
            {
                ins.Parameters.Add("u",  NpgsqlTypes.NpgsqlDbType.Uuid).Value = userId;
                ins.Parameters.AddWithValue("h",  tokenHash);
                ins.Parameters.AddWithValue("e",  expiresAt);
                ins.Parameters.AddWithValue("ip", (object?)HttpContext.Connection.RemoteIpAddress?.ToString() ?? DBNull.Value);
                await ins.ExecuteNonQueryAsync();
            }

            // Build the email
            // The frontend uses HashRouter (URLs look like https://site/#/reset-password),
            // so we include the hash here. If you switch to BrowserRouter, change
            // App:ResetPath to "/reset-password" (no '#').
            var publicUrl  = (_config["App:PublicUrl"] ?? "https://www.mahimaministries.in").TrimEnd('/');
            var resetPath  = _config["App:ResetPath"] ?? "/#/reset-password";
            var resetUrl   = $"{publicUrl}{resetPath}?token={WebUtility.UrlEncode(rawToken)}";
            var greeting  = !string.IsNullOrWhiteSpace(displayName) ? displayName! : (username ?? "there");

            var html = BuildResetEmailHtml(greeting, resetUrl);
            var text = BuildResetEmailText(greeting, resetUrl);

            try
            {
                await _emailService.SendAsync(email!, "Reset your Mahima Ministries password", html, text);
            }
            catch (Exception sendEx)
            {
                _logger.LogError(sendEx, "Password reset email failed to send for user {UserId}", userId);
                // Still return the generic message; do not leak failure to client.
            }

            return Ok(generic);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ForgotPassword error");
            return Ok(generic);
        }
    }

    /// <summary>
    /// Consumes a reset token and sets a new password. Token is single-use
    /// and verified against its SHA-256 hash. New password is hashed with
    /// the same PasswordHasher used at login time.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPasswordEndpoint([FromBody] ResetPasswordDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Token))
            return BadRequest(new { message = "Reset token is required." });

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            return BadRequest(new { message = "New password must be at least 6 characters." });

        var tokenHash = Sha256Hex(dto.Token);

        try
        {
            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();
            await using var tx = await conn.BeginTransactionAsync();

            Guid userId = Guid.Empty;
            long tokenId = 0;

            await using (var look = new NpgsqlCommand(
                @"SELECT id, user_id
                    FROM public.password_reset_tokens
                   WHERE token_hash = @h
                     AND used_at IS NULL
                     AND expires_at > now()
                   LIMIT 1;", conn, tx))
            {
                look.Parameters.AddWithValue("h", tokenHash);
                await using var rdr = await look.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    tokenId = rdr.GetInt64(0);
                    userId  = rdr.GetGuid(1);
                }
            }

            if (userId == Guid.Empty)
                return BadRequest(new { message = "This reset link is invalid or has expired." });

            // Hash the new password with the same hasher used in Login.
            var newHash = _pwHasher.HashPassword(null!, dto.NewPassword!);

            await using (var upd = new NpgsqlCommand(
                @"UPDATE users SET passwordhash = @h WHERE id = @id;", conn, tx))
            {
                upd.Parameters.AddWithValue("h", newHash);
                upd.Parameters.Add("id", NpgsqlTypes.NpgsqlDbType.Uuid).Value = userId;
                await upd.ExecuteNonQueryAsync();
            }

            await using (var consume = new NpgsqlCommand(
                @"UPDATE public.password_reset_tokens SET used_at = now() WHERE id = @id;", conn, tx))
            {
                consume.Parameters.AddWithValue("id", tokenId);
                await consume.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();

            return Ok(new { message = "Your password has been updated. You can now sign in." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ResetPassword error");
            return StatusCode(500, new { message = "Something went wrong. Please request a new reset link." });
        }
    }

    // -------- helpers --------
    private static string GenerateUrlSafeToken(int byteLength)
    {
        var bytes = new byte[byteLength];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static string Sha256Hex(string input)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes) sb.Append(b.ToString("x2"));
        return sb.ToString();
    }

    private static string BuildResetEmailHtml(string greeting, string resetUrl)
    {
        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1"" />
  <title>Reset your password</title>
</head>
<body style=""margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#f5f7fb;padding:32px 12px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);"">
          <!-- header -->
          <tr>
            <td style=""padding:28px 28px 0;text-align:center;"">
              <div style=""display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef);color:#fff;padding:10px 14px;border-radius:14px;font-weight:700;letter-spacing:0.5px;font-size:14px;"">
                MAHIMA MINISTRIES
              </div>
            </td>
          </tr>
          <tr>
            <td style=""padding:24px 32px 8px;"">
              <h1 style=""margin:0 0 6px;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;"">Reset your password</h1>
              <p style=""margin:0;color:#475569;font-size:14px;line-height:1.55;"">Hi {WebUtility.HtmlEncode(greeting)},</p>
            </td>
          </tr>
          <tr>
            <td style=""padding:8px 32px 0;"">
              <p style=""margin:0 0 14px;color:#475569;font-size:14px;line-height:1.55;"">
                We received a request to reset the password for your Mahima Ministries account.
                Click the button below to choose a new password. This link will expire in 1 hour.
              </p>
            </td>
          </tr>
          <tr>
            <td align=""center"" style=""padding:18px 32px 6px;"">
              <a href=""{resetUrl}"" style=""display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;box-shadow:0 6px 18px rgba(99,102,241,0.35);"">
                Reset password
              </a>
            </td>
          </tr>
          <tr>
            <td style=""padding:16px 32px 0;"">
              <p style=""margin:0 0 6px;color:#64748b;font-size:12px;line-height:1.55;"">
                Or copy and paste this link into your browser:
              </p>
              <p style=""margin:0 0 18px;color:#1e293b;font-size:12px;line-height:1.55;word-break:break-all;"">
                <a href=""{resetUrl}"" style=""color:#6366f1;text-decoration:none;"">{resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style=""padding:0 32px;"">
              <div style=""border-top:1px solid #e2e8f0;margin:8px 0 16px;""></div>
              <p style=""margin:0;color:#94a3b8;font-size:12px;line-height:1.55;"">
                Didn't request this? You can safely ignore this email — your password will stay the same.
                For security, this link can only be used once.
              </p>
            </td>
          </tr>
          <tr>
            <td style=""padding:18px 32px 28px;text-align:center;color:#94a3b8;font-size:11px;"">
              © {DateTime.UtcNow.Year} Mahima Ministries · This is an automated message, please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }

    private static string BuildResetEmailText(string greeting, string resetUrl)
    {
        return
$@"Hi {greeting},

We received a request to reset the password for your Mahima Ministries account.
Use the link below to choose a new password (valid for 1 hour, single-use):

{resetUrl}

If you didn't request this, you can safely ignore this email.

— Mahima Ministries";
    }
}
