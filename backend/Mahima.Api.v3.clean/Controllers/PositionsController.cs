using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/positions")]
    public class PositionsController : ControllerBase
    {
        private static readonly SemaphoreSlim PositionSchemaLock = new(1, 1);
        private static volatile bool PositionSchemaReady;
        private readonly string? _connectionString;
        private readonly ILogger<PositionsController> _logger;
        private readonly IHostEnvironment _env;

        public PositionsController(IConfiguration configuration, ILogger<PositionsController> logger, IHostEnvironment env)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
            _logger = logger;
            _env = env;
        }

        public class PositionDto
        {
            public string? Name { get; set; }
            public string? Description { get; set; }
            public long? ParentPositionId { get; set; }
            public string? VisibilityScope { get; set; }
            public bool IsActive { get; set; } = true;
        }

        public class AssignPositionDto
        {
            public Guid UserId { get; set; }
            public long PositionId { get; set; }
            public bool IsPrimary { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsurePositionTablesAsync(conn);
                var items = await LoadPositionsAsync(conn);
                return Ok(new { items, total = items.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading positions.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error loading positions.");
            }
        }

        [HttpPost]
        [Authorize(Roles = "admin,ADMIN")]
        public async Task<IActionResult> Create([FromBody] PositionDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Name)) return BadRequest("Name is required.");
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsurePositionTablesAsync(conn);
                await using var cmd = new NpgsqlCommand(@"
INSERT INTO public.positions (name, description, parent_position_id, visibility_scope, is_active, created_at_utc, updated_at_utc)
VALUES (@name, @description, @parent, @scope, @active, now(), now())
RETURNING id;", conn);
                cmd.Parameters.AddWithValue("name", NpgsqlDbType.Text, dto.Name.Trim());
                cmd.Parameters.AddWithValue("description", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(dto.Description) ? (object)DBNull.Value : dto.Description.Trim());
                cmd.Parameters.AddWithValue("parent", NpgsqlDbType.Bigint, dto.ParentPositionId.HasValue ? (object)dto.ParentPositionId.Value : DBNull.Value);
                cmd.Parameters.AddWithValue("scope", NpgsqlDbType.Text, NormalizeScope(dto.VisibilityScope));
                cmd.Parameters.AddWithValue("active", NpgsqlDbType.Boolean, dto.IsActive);
                var id = await cmd.ExecuteScalarAsync();
                return CreatedAtAction(nameof(GetAll), new { id }, new { id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating position.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error creating position.");
            }
        }

        [HttpPut("{id:long}")]
        [Authorize(Roles = "admin,ADMIN")]
        public async Task<IActionResult> Update(long id, [FromBody] PositionDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Name)) return BadRequest("Name is required.");
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsurePositionTablesAsync(conn);
                await using var cmd = new NpgsqlCommand(@"
UPDATE public.positions
SET name = @name,
    description = @description,
    parent_position_id = NULLIF(@parent, 0),
    visibility_scope = @scope,
    is_active = @active,
    updated_at_utc = now()
WHERE id = @id;", conn);
                cmd.Parameters.AddWithValue("id", NpgsqlDbType.Bigint, id);
                cmd.Parameters.AddWithValue("name", NpgsqlDbType.Text, dto.Name.Trim());
                cmd.Parameters.AddWithValue("description", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(dto.Description) ? (object)DBNull.Value : dto.Description.Trim());
                cmd.Parameters.AddWithValue("parent", NpgsqlDbType.Bigint, dto.ParentPositionId.HasValue && dto.ParentPositionId.Value != id ? dto.ParentPositionId.Value : 0L);
                cmd.Parameters.AddWithValue("scope", NpgsqlDbType.Text, NormalizeScope(dto.VisibilityScope));
                cmd.Parameters.AddWithValue("active", NpgsqlDbType.Boolean, dto.IsActive);
                var rows = await cmd.ExecuteNonQueryAsync();
                return rows == 0 ? NotFound() : NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating position {Id}", id);
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error updating position.");
            }
        }

        [HttpDelete("{id:long}")]
        [Authorize(Roles = "admin,ADMIN")]
        public async Task<IActionResult> Delete(long id)
        {
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsurePositionTablesAsync(conn);
                await using var cmd = new NpgsqlCommand("UPDATE public.positions SET is_active = false, updated_at_utc = now() WHERE id = @id;", conn);
                cmd.Parameters.AddWithValue("id", NpgsqlDbType.Bigint, id);
                var rows = await cmd.ExecuteNonQueryAsync();
                return rows == 0 ? NotFound() : NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting position {Id}", id);
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error deleting position.");
            }
        }

        [HttpGet("assignments")]
        [Authorize(Roles = "admin,ADMIN")]
        public async Task<IActionResult> GetAssignments([FromQuery] Guid? userId = null)
        {
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsurePositionTablesAsync(conn);
                var sql = @"
SELECT up.user_id, up.position_id, up.is_primary, up.assigned_at_utc,
       p.name, p.visibility_scope,
       u.username, u.displayname
FROM public.user_positions up
JOIN public.positions p ON p.id = up.position_id
JOIN public.users u ON u.id = up.user_id
WHERE (@user_id IS NULL OR up.user_id = @user_id)
ORDER BY COALESCE(u.displayname, u.username), up.is_primary DESC, p.name;";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId.HasValue ? (object)userId.Value : DBNull.Value);
                var items = new List<object>();
                await using var rdr = await cmd.ExecuteReaderAsync();
                while (await rdr.ReadAsync())
                {
                    items.Add(new
                    {
                        userId = rdr.GetGuid(0),
                        positionId = rdr.GetInt64(1),
                        isPrimary = rdr.GetBoolean(2),
                        assignedAtUtc = rdr.GetDateTime(3),
                        positionName = rdr.GetString(4),
                        visibilityScope = rdr.GetString(5),
                        username = rdr.IsDBNull(6) ? null : rdr.GetString(6),
                        displayName = rdr.IsDBNull(7) ? null : rdr.GetString(7)
                    });
                }
                return Ok(new { items, total = items.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading position assignments.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error loading position assignments.");
            }
        }

        [HttpPost("assignments")]
        [Authorize(Roles = "admin,ADMIN")]
        public async Task<IActionResult> Assign([FromBody] AssignPositionDto dto)
        {
            if (dto.UserId == Guid.Empty || dto.PositionId <= 0) return BadRequest("User and position are required.");
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsurePositionTablesAsync(conn);
                var targetScope = await LoadPositionScopeAsync(conn, dto.PositionId);
                if (targetScope == null) return BadRequest("Position not found.");
                if (targetScope.Equals("ChurchLevel", StringComparison.OrdinalIgnoreCase) && !await UserHasAdminRoleAsync(conn, dto.UserId))
                {
                    return BadRequest("Church Level positions can only be assigned to admin users.");
                }
                await using var tx = await conn.BeginTransactionAsync();
                if (dto.IsPrimary)
                {
                    await using var clear = new NpgsqlCommand("UPDATE public.user_positions SET is_primary = false WHERE user_id = @user_id;", conn, tx);
                    clear.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, dto.UserId);
                    await clear.ExecuteNonQueryAsync();
                }
                await using var cmd = new NpgsqlCommand(@"
INSERT INTO public.user_positions (user_id, position_id, is_primary, assigned_at_utc)
VALUES (@user_id, @position_id, @primary, now())
ON CONFLICT (user_id, position_id)
DO UPDATE SET is_primary = EXCLUDED.is_primary;", conn, tx);
                cmd.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, dto.UserId);
                cmd.Parameters.AddWithValue("position_id", NpgsqlDbType.Bigint, dto.PositionId);
                cmd.Parameters.AddWithValue("primary", NpgsqlDbType.Boolean, dto.IsPrimary);
                await cmd.ExecuteNonQueryAsync();
                await tx.CommitAsync();
                return Ok(new { saved = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error assigning position.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error assigning position.");
            }
        }

        [HttpDelete("assignments/{userId:guid}/{positionId:long}")]
        [Authorize(Roles = "admin,ADMIN")]
        public async Task<IActionResult> Unassign(Guid userId, long positionId)
        {
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsurePositionTablesAsync(conn);
                await using var cmd = new NpgsqlCommand("DELETE FROM public.user_positions WHERE user_id = @user_id AND position_id = @position_id;", conn);
                cmd.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId);
                cmd.Parameters.AddWithValue("position_id", NpgsqlDbType.Bigint, positionId);
                var rows = await cmd.ExecuteNonQueryAsync();
                return rows == 0 ? NotFound() : NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing position assignment.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error removing position assignment.");
            }
        }

        [HttpGet("mine")]
        public async Task<IActionResult> Mine()
        {
            var userId = CurrentUserId();
            if (userId == Guid.Empty) return Unauthorized();
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            await EnsureDefaultMemberPositionForUserAsync(conn, userId);
            var positions = await LoadUserPositionsAsync(conn, userId);
            return Ok(new
            {
                positions,
                primaryPosition = positions.FirstOrDefault()
            });
        }

        [HttpPost("backfill-default-member")]
        public async Task<IActionResult> BackfillDefaultMember()
        {
            var userId = CurrentUserId();
            if (userId == Guid.Empty) return Unauthorized();
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsurePositionTablesAsync(conn);

                if (!await UserHasAdminRoleAsync(conn, userId)) return Forbid();

                var assigned = await BackfillDefaultMemberPositionsAsync(conn);
                return Ok(new
                {
                    defaultPosition = "Member",
                    assigned
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error backfilling default Member positions.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error backfilling default Member positions.");
            }
        }

        private Guid CurrentUserId() => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        private static string NormalizeScope(string? value)
        {
            var raw = (value ?? "My").Trim().ToLowerInvariant().Replace("_", " ").Replace("-", " ");
            return raw switch
            {
                "church" or "church level" or "churchlevel" => "ChurchLevel",
                "team" or "teams" or "my teams" or "myteams" => "MyTeams",
                _ => "My"
            };
        }

        public static async Task EnsurePositionTablesAsync(NpgsqlConnection conn)
        {
            if (PositionSchemaReady) return;
            await PositionSchemaLock.WaitAsync();
            try
            {
                if (PositionSchemaReady) return;
                await using var cmd = new NpgsqlCommand(@"
CREATE TABLE IF NOT EXISTS public.positions (
    id bigserial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text NULL,
    parent_position_id bigint NULL REFERENCES public.positions(id) ON DELETE SET NULL,
    visibility_scope text NOT NULL DEFAULT 'My',
    is_active boolean NOT NULL DEFAULT true,
    created_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    updated_at_utc timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_positions (
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    position_id bigint NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
    is_primary boolean NOT NULL DEFAULT false,
    assigned_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, position_id)
);

CREATE INDEX IF NOT EXISTS ix_positions_parent ON public.positions(parent_position_id);
CREATE INDEX IF NOT EXISTS ix_user_positions_user ON public.user_positions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_positions_primary ON public.user_positions(user_id) WHERE is_primary;

INSERT INTO public.positions (name, description, visibility_scope)
SELECT 'Member', 'Default personal data visibility for ordinary members.', 'My'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.positions
    WHERE lower(name) = lower('Member')
)
ON CONFLICT (name) DO UPDATE
SET description = COALESCE(public.positions.description, EXCLUDED.description),
    visibility_scope = EXCLUDED.visibility_scope,
    is_active = true,
    updated_at_utc = now();

INSERT INTO public.positions (name, description, visibility_scope)
SELECT 'Call Center Manager', 'Receives prayer follow-up alerts and coordinates prayer response handling.', 'MyTeams'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.positions
    WHERE lower(regexp_replace(name, '[^a-z0-9]+', '', 'g')) IN ('callcentermanager', 'callcentremanager')
)
ON CONFLICT (name) DO UPDATE
SET description = COALESCE(public.positions.description, EXCLUDED.description),
    visibility_scope = EXCLUDED.visibility_scope,
    is_active = true,
    updated_at_utc = now();
", conn);
                await cmd.ExecuteNonQueryAsync();
                PositionSchemaReady = true;
            }
            finally
            {
                PositionSchemaLock.Release();
            }
        }

        public static async Task<int> BackfillDefaultMemberPositionsAsync(NpgsqlConnection conn)
        {
            await EnsurePositionTablesAsync(conn);
            var memberPositionId = await EnsureMemberPositionAsync(conn);
            await using var cmd = new NpgsqlCommand(@"
INSERT INTO public.user_positions (user_id, position_id, is_primary, assigned_at_utc)
SELECT u.id, @member_position_id, true, now()
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_positions up
    WHERE up.user_id = u.id
);", conn);
            cmd.Parameters.AddWithValue("member_position_id", NpgsqlDbType.Bigint, memberPositionId);
            return await cmd.ExecuteNonQueryAsync();
        }

        public static async Task EnsureDefaultMemberPositionForUserAsync(NpgsqlConnection conn, Guid userId)
        {
            if (userId == Guid.Empty) return;
            await EnsurePositionTablesAsync(conn);
            var memberPositionId = await EnsureMemberPositionAsync(conn);

            await using (var existing = new NpgsqlCommand("SELECT EXISTS (SELECT 1 FROM public.user_positions WHERE user_id = @user_id);", conn))
            {
                existing.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId);
                if (await existing.ExecuteScalarAsync() is bool hasAnyPosition && hasAnyPosition) return;
            }

            await using var assign = new NpgsqlCommand(@"
INSERT INTO public.user_positions (user_id, position_id, is_primary, assigned_at_utc)
VALUES (@user_id, @position_id, true, now())
ON CONFLICT (user_id, position_id) DO UPDATE
SET is_primary = true;", conn);
            assign.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId);
            assign.Parameters.AddWithValue("position_id", NpgsqlDbType.Bigint, memberPositionId);
            await assign.ExecuteNonQueryAsync();
        }

        private static async Task<long> EnsureMemberPositionAsync(NpgsqlConnection conn)
        {
            await using (var select = new NpgsqlCommand("SELECT id FROM public.positions WHERE lower(name) = lower('Member') LIMIT 1;", conn))
            {
                var existing = await select.ExecuteScalarAsync();
                if (existing != null && existing != DBNull.Value)
                {
                    var memberId = Convert.ToInt64(existing);
                    await using var update = new NpgsqlCommand(@"
UPDATE public.positions
SET visibility_scope = 'My',
    is_active = true,
    updated_at_utc = now()
WHERE id = @id;", conn);
                    update.Parameters.AddWithValue("id", NpgsqlDbType.Bigint, memberId);
                    await update.ExecuteNonQueryAsync();
                    return memberId;
                }
            }

            await using var upsert = new NpgsqlCommand(@"
INSERT INTO public.positions (name, description, visibility_scope, is_active)
VALUES ('Member', 'Default personal data visibility for ordinary members.', 'My', true)
ON CONFLICT (name) DO UPDATE
SET visibility_scope = EXCLUDED.visibility_scope,
    is_active = true,
    updated_at_utc = now()
RETURNING id;", conn);
            var id = await upsert.ExecuteScalarAsync();
            return Convert.ToInt64(id);
        }

        private static async Task<string?> LoadPositionScopeAsync(NpgsqlConnection conn, long positionId)
        {
            await using var cmd = new NpgsqlCommand("SELECT visibility_scope FROM public.positions WHERE id = @id AND is_active = true;", conn);
            cmd.Parameters.AddWithValue("id", NpgsqlDbType.Bigint, positionId);
            var value = await cmd.ExecuteScalarAsync();
            return value?.ToString();
        }

        private static async Task<bool> UserHasAdminRoleAsync(NpgsqlConnection conn, Guid userId)
        {
            await using (var legacy = new NpgsqlCommand(@"
SELECT EXISTS (
    SELECT 1
    FROM public.users u
    LEFT JOIN public.roles r ON r.id::text = COALESCE(u.role, '') OR lower(r.name) = lower(COALESCE(u.role, ''))
    WHERE u.id = @user_id
      AND (lower(COALESCE(u.role, '')) = 'admin' OR lower(COALESCE(r.name, '')) = 'admin')
);", conn))
            {
                legacy.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId);
                if (await legacy.ExecuteScalarAsync() is bool isAdmin && isAdmin) return true;
            }

            await using (var exists = new NpgsqlCommand("SELECT to_regclass('public.user_roles') IS NOT NULL AND to_regclass('public.roles') IS NOT NULL;", conn))
            {
                if (await exists.ExecuteScalarAsync() is not bool hasRoleTables || !hasRoleTables) return false;
            }

            await using var cmd = new NpgsqlCommand(@"
SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = @user_id AND lower(r.name) = 'admin'
);", conn);
            cmd.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId);
            return await cmd.ExecuteScalarAsync() is bool assignedAdmin && assignedAdmin;
        }
        private static async Task<List<object>> LoadPositionsAsync(NpgsqlConnection conn)
        {
            var items = new List<object>();
            await using var cmd = new NpgsqlCommand(@"
SELECT p.id, p.name, p.description, p.parent_position_id, parent.name AS parent_name,
       p.visibility_scope, p.is_active, p.created_at_utc, p.updated_at_utc,
       COUNT(up.user_id) AS assigned_count
FROM public.positions p
LEFT JOIN public.positions parent ON parent.id = p.parent_position_id
LEFT JOIN public.user_positions up ON up.position_id = p.id
GROUP BY p.id, parent.name
ORDER BY COALESCE(parent.name, p.name), p.name;", conn);
            await using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                items.Add(new
                {
                    id = rdr.GetInt64(0),
                    name = rdr.GetString(1),
                    description = rdr.IsDBNull(2) ? null : rdr.GetString(2),
                    parentPositionId = rdr.IsDBNull(3) ? (long?)null : rdr.GetInt64(3),
                    parentName = rdr.IsDBNull(4) ? null : rdr.GetString(4),
                    visibilityScope = rdr.GetString(5),
                    isActive = rdr.GetBoolean(6),
                    createdAtUtc = rdr.GetDateTime(7),
                    updatedAtUtc = rdr.GetDateTime(8),
                    assignedCount = rdr.GetInt64(9)
                });
            }
            return items;
        }

        public static async Task<List<object>> LoadUserPositionsAsync(NpgsqlConnection conn, Guid userId)
        {
            await EnsurePositionTablesAsync(conn);
            var items = new List<object>();
            await using (var cmd = new NpgsqlCommand(@"
SELECT p.id, p.name, p.description, p.parent_position_id, parent.name AS parent_name,
       p.visibility_scope, up.is_primary
FROM public.user_positions up
JOIN public.positions p ON p.id = up.position_id AND p.is_active = true
LEFT JOIN public.positions parent ON parent.id = p.parent_position_id
WHERE up.user_id = @user_id
ORDER BY up.is_primary DESC, p.name;", conn))
            {
                cmd.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId);
                await using var rdr = await cmd.ExecuteReaderAsync();
                while (await rdr.ReadAsync())
                {
                    items.Add(new
                    {
                        id = rdr.GetInt64(0),
                        name = rdr.GetString(1),
                        description = rdr.IsDBNull(2) ? null : rdr.GetString(2),
                        parentPositionId = rdr.IsDBNull(3) ? (long?)null : rdr.GetInt64(3),
                        parentName = rdr.IsDBNull(4) ? null : rdr.GetString(4),
                        visibilityScope = rdr.GetString(5),
                        isPrimary = rdr.GetBoolean(6)
                    });
                }
            }
            if (items.Count == 0)
            {
                await using var fallback = new NpgsqlCommand("SELECT id, name, description, visibility_scope FROM public.positions WHERE name = 'Member' LIMIT 1;", conn);
                await using var fr = await fallback.ExecuteReaderAsync();
                if (await fr.ReadAsync())
                {
                    items.Add(new
                    {
                        id = fr.GetInt64(0),
                        name = fr.GetString(1),
                        description = fr.IsDBNull(2) ? null : fr.GetString(2),
                        parentPositionId = (long?)null,
                        parentName = (string?)null,
                        visibilityScope = fr.GetString(3),
                        isPrimary = true
                    });
                }
            }
            return items;
        }
    }
}






