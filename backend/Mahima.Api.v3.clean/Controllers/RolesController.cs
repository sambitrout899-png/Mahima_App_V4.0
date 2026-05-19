using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RolesController : ControllerBase
    {
        private readonly string? _connectionString;
        private readonly ILogger<RolesController> _logger;
        private readonly IHostEnvironment _env;

        public RolesController(IConfiguration configuration, ILogger<RolesController> logger, IHostEnvironment env)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _env = env ?? throw new ArgumentNullException(nameof(env));
        }

        // GET api/roles
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = @"
SELECT r.id, r.name, r.description,
       COALESCE(ARRAY_AGG(DISTINCT UPPER(rp.page_key)) FILTER (WHERE rp.page_key IS NOT NULL), ARRAY[]::text[]) AS pages
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP BY r.id, r.name, r.description
ORDER BY r.id;
";
                await using var cmd = new NpgsqlCommand(sql, conn);
                var items = new List<object>();
                await using var rdr = await cmd.ExecuteReaderAsync();
                while (await rdr.ReadAsync())
                {
                    items.Add(new
                    {
                        id = Convert.ToInt32(rdr["id"]),
                        name = rdr["name"] is DBNull ? null : rdr["name"].ToString(),
                        description = rdr["description"] is DBNull ? null : rdr["description"].ToString(),
                        pages = rdr["pages"] is DBNull ? new string[0] : (string[])rdr["pages"]
                    });
                }

                return Ok(new { items, total = items.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving roles.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error retrieving roles.");
            }
        }

        // GET api/roles/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var sql = @"
SELECT r.id, r.name, r.description,
       COALESCE(ARRAY_AGG(DISTINCT UPPER(rp.page_key)) FILTER (WHERE rp.page_key IS NOT NULL), ARRAY[]::text[]) AS pages
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
WHERE r.id = @id
GROUP BY r.id, r.name, r.description;
";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Integer, id);

                await using var rdr = await cmd.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    return Ok(new
                    {
                        id = Convert.ToInt32(rdr["id"]),
                        name = rdr["name"] is DBNull ? null : rdr["name"].ToString(),
                        description = rdr["description"] is DBNull ? null : rdr["description"].ToString(),
                        pages = rdr["pages"] is DBNull ? new string[0] : (string[])rdr["pages"]
                    });
                }
                return NotFound();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving role {Id}", id);
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error retrieving role.");
            }
        }

        // POST api/roles
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] RoleCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            if (string.IsNullOrWhiteSpace(dto?.Name)) return BadRequest("Name is required.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await using var tx = await conn.BeginTransactionAsync();

                var insertSql = @"INSERT INTO roles (name, description) VALUES (@name, @description) RETURNING id;";
                await using (var cmd = new NpgsqlCommand(insertSql, conn) { Transaction = tx })
                {
                    cmd.Parameters.AddWithValue("name", NpgsqlTypes.NpgsqlDbType.Text, dto.Name);
                    cmd.Parameters.AddWithValue("description", string.IsNullOrWhiteSpace(dto.Description) ? (object)DBNull.Value : dto.Description);
                    var idObj = await cmd.ExecuteScalarAsync();
                    var roleId = Convert.ToInt32(idObj);

                    // assign pages (page keys)
                    if (dto.Pages != null && dto.Pages.Length > 0)
                    {
                        foreach (var pk in NormalizePageKeys(dto.Pages))
                        {
                            await using var rel = new NpgsqlCommand(@"INSERT INTO role_permissions(role_id, page_key) VALUES (@r, @pk);", conn) { Transaction = tx };
                            rel.Parameters.AddWithValue("r", NpgsqlTypes.NpgsqlDbType.Integer, roleId);
                            rel.Parameters.AddWithValue("pk", NpgsqlTypes.NpgsqlDbType.Text, pk);
                            await rel.ExecuteNonQueryAsync();
                        }
                    }

                    await tx.CommitAsync();
                    return CreatedAtAction(nameof(GetById), new { id = roleId }, new { id = roleId, dto.Name });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating role.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error creating role.");
            }
        }

        // PUT api/roles/{id}
        [AcceptVerbs("PUT", "PATCH", "POST")]
        [Route("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] RoleUpdateDto dto)
        {
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await using var tx = await conn.BeginTransactionAsync();

                // update name/description if provided
                var setParts = new List<string>();
                var cmd = new NpgsqlCommand { Connection = conn, Transaction = tx, CommandType = CommandType.Text };
                if (!string.IsNullOrWhiteSpace(dto.Name))
                {
                    setParts.Add(@"""name"" = @name");
                    cmd.Parameters.AddWithValue("name", NpgsqlTypes.NpgsqlDbType.Text, dto.Name);
                }
                if (dto.Description != null)
                {
                    setParts.Add(@"""description"" = @description");
                    cmd.Parameters.AddWithValue("description", string.IsNullOrWhiteSpace(dto.Description) ? (object)DBNull.Value : dto.Description);
                }

                if (setParts.Count > 0)
                {
                    cmd.CommandText = $"UPDATE roles SET {string.Join(", ", setParts)} WHERE id = @id";
                    cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Integer, id);
                    var rows = await cmd.ExecuteNonQueryAsync();
                    if (rows == 0) { await tx.RollbackAsync(); return NotFound(); }
                }

                // replace pages mapping if provided
                if (dto.Pages != null)
                {
                    // delete existing mappings
                    await using var del = new NpgsqlCommand("DELETE FROM role_permissions WHERE role_id = @r", conn) { Transaction = tx };
                    del.Parameters.AddWithValue("r", NpgsqlTypes.NpgsqlDbType.Integer, id);
                    await del.ExecuteNonQueryAsync();

                    // insert new mappings
                    foreach (var pk in NormalizePageKeys(dto.Pages))
                    {
                        await using var rel = new NpgsqlCommand(@"INSERT INTO role_permissions(role_id, page_key) VALUES (@r, @pk);", conn) { Transaction = tx };
                        rel.Parameters.AddWithValue("r", NpgsqlTypes.NpgsqlDbType.Integer, id);
                        rel.Parameters.AddWithValue("pk", NpgsqlTypes.NpgsqlDbType.Text, pk);
                        await rel.ExecuteNonQueryAsync();
                    }
                }

                await tx.CommitAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating role {Id}", id);
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error updating role.");
            }
        }

        // DELETE api/roles/{id}
        [AcceptVerbs("DELETE", "POST")]
        [Route("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (string.IsNullOrWhiteSpace(_connectionString)) return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                var cmd = new NpgsqlCommand("DELETE FROM roles WHERE id = @id", conn);
                cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Integer, id);
                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting role {Id}", id);
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error deleting role.");
            }
        }

        // DTOs
        public class RoleCreateDto
        {
            public string Name { get; set; } = "";
            public string? Description { get; set; }
            public string[]? Pages { get; set; } // page keys
        }

        public class RoleUpdateDto
        {
            public string? Name { get; set; }
            public string? Description { get; set; }
            public string[]? Pages { get; set; } // page keys
        }

        private static IEnumerable<string> NormalizePageKeys(IEnumerable<string> pageKeys)
        {
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var pageKey in pageKeys)
            {
                var normalized = (pageKey ?? "").Trim().ToUpperInvariant();
                if (normalized.Length == 0 || !seen.Add(normalized)) continue;
                yield return normalized;
            }
        }
    }
}
