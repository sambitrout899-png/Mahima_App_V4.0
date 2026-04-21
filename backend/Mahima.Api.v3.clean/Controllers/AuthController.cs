using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;
using Npgsql;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mahima.Api.v3.clean.Helpers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly string _connStr;
    private readonly ILogger<AuthController> _logger;
    private readonly JwtTokenService _jwtService;
        //private readonly PasswordHasher<object> _pwHasher = new PasswordHasher<object>();
		//private readonly PasswordHasher<string> _pwHasher = new PasswordHasher<string>();
		private readonly PasswordHasher<object> _pwHasher = new PasswordHasher<object>();
    public AuthController(IConfiguration config, ILogger<AuthController> logger, JwtTokenService jwtService)
    {
        _logger = logger;
        _jwtService = jwtService;
        _connStr = config.GetConnectionString("DefaultConnection")
                   ?? throw new InvalidOperationException("Connection string missing");
    }

    public class LoginDto
    {
        public string? UsernameOrEmail { get; set; }
        public string? Password { get; set; }
    }

    // ============================
    // 🔥 GET CURRENT USER (FIXED)
    // ============================
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        try
        {
            // ⚠️ TEMP (replace with JWT later)
            var username = "SamM";

            using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();

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
WHERE u.email = @u OR u.username = @u
LIMIT 1;";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("u", username);

            await using var rdr = await cmd.ExecuteReaderAsync();
            if (!await rdr.ReadAsync())
                return Unauthorized();

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
                email,
                phone,
                role,
                pages
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in /me");
            return StatusCode(500, ex.Message);
        }
    }

    // ================= LOGIN =================
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginDto dto)
{
    if (dto == null || string.IsNullOrWhiteSpace(dto.UsernameOrEmail))
        return BadRequest(new { message = "Username/email required" });

    try
    {
        using var conn = new NpgsqlConnection(_connStr);
        await conn.OpenAsync();

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
		_logger.LogWarning("LOGIN DEBUG → Password Entered: {Pwd}", dto.Password);
		_logger.LogWarning("LOGIN DEBUG → Result: {Result}", result);
		_logger.LogWarning("LOGIN INPUT → '{Input}' LENGTH={Len}", input, input?.Length);
		_logger.LogWarning("LOGIN DEBUG → Result: {Result}", result);
		
		
		//if (result != PasswordVerificationResult.Success)
        if (result != PasswordVerificationResult.Success && result != PasswordVerificationResult.SuccessRehashNeeded)
		{
            _logger.LogWarning("Login failed: invalid password for {User}", dto.UsernameOrEmail);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        await rdr.CloseAsync(); // safe now

       // var token = _jwtService.GenerateToken(Guid.NewGuid(), username, display, role);
	var token = _jwtService.GenerateToken(Guid.Parse(id.ToString()), username, display, role);
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
WHERE r.name = @role;";

        await using var permCmd = new NpgsqlCommand(permSql, conn);
        permCmd.Parameters.AddWithValue("role", role ?? "");

        await using var permRdr = await permCmd.ExecuteReaderAsync();
        while (await permRdr.ReadAsync())
        {
            pages.Add(permRdr.GetString(0));
        }

        return pages;
    }
}
