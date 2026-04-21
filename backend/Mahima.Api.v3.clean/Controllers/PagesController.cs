using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PagesController : ControllerBase
    {
        private readonly string? _connectionString;
        private readonly ILogger<PagesController> _logger;
        private readonly IHostEnvironment _env;

        public PagesController(IConfiguration configuration, ILogger<PagesController> logger, IHostEnvironment env)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _env = env ?? throw new ArgumentNullException(nameof(env));
        }

        // GET api/pages
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                // Select by key (string), not numeric id — compatible with role_permissions.page_key
                var cmd = new NpgsqlCommand(@"SELECT key, title, description, created_at, updated_at FROM pages ORDER BY key;", conn);
                var items = new List<object>();
                await using var rdr = await cmd.ExecuteReaderAsync();
                while (await rdr.ReadAsync())
                {
                    items.Add(new
                    {
                        key = rdr["key"] is DBNull ? null : rdr["key"].ToString(),
                        title = rdr["title"] is DBNull ? null : rdr["title"].ToString(),
                        description = rdr["description"] is DBNull ? null : rdr["description"].ToString(),
                        createdAt = rdr["created_at"] is DBNull ? null : rdr["created_at"].ToString(),
                        updatedAt = rdr["updated_at"] is DBNull ? null : rdr["updated_at"].ToString()
                    });
                }

                return Ok(new { items, total = items.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving pages.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error retrieving pages.");
            }
        }

        // GET api/pages/{key}
        [HttpGet("{key}")]
        public async Task<IActionResult> GetByKey(string key)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            if (string.IsNullOrWhiteSpace(key)) return BadRequest("key is required.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var cmd = new NpgsqlCommand(@"SELECT key, title, description, created_at, updated_at FROM pages WHERE key = @key;", conn);
                cmd.Parameters.AddWithValue("key", NpgsqlTypes.NpgsqlDbType.Text, key);

                await using var rdr = await cmd.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    return Ok(new
                    {
                        key = rdr["key"] is DBNull ? null : rdr["key"].ToString(),
                        title = rdr["title"] is DBNull ? null : rdr["title"].ToString(),
                        description = rdr["description"] is DBNull ? null : rdr["description"].ToString(),
                        createdAt = rdr["created_at"] is DBNull ? null : rdr["created_at"].ToString(),
                        updatedAt = rdr["updated_at"] is DBNull ? null : rdr["updated_at"].ToString()
                    });
                }

                return NotFound();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving page {Key}", key);
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error retrieving page.");
            }
        }

        // POST api/pages
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PageCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            if (dto == null || string.IsNullOrWhiteSpace(dto.Key) || string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Key and Title are required.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var cmd = new NpgsqlCommand(@"INSERT INTO pages (key, title, description, created_at, updated_at) 
                                             VALUES (@key, @title, @description, now(), now())
                                             ON CONFLICT (key) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = now()
                                             RETURNING key;", conn);
                cmd.Parameters.AddWithValue("key", NpgsqlTypes.NpgsqlDbType.Text, dto.Key);
                cmd.Parameters.AddWithValue("title", NpgsqlTypes.NpgsqlDbType.Text, dto.Title);
                cmd.Parameters.AddWithValue("description", string.IsNullOrWhiteSpace(dto.Description) ? (object)DBNull.Value : dto.Description);

                var res = await cmd.ExecuteScalarAsync();
                var newKey = res?.ToString() ?? dto.Key;
                return CreatedAtAction(nameof(GetByKey), new { key = newKey }, new { key = newKey, dto.Title });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating page.");
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error creating page.");
            }
        }

        // PUT api/pages/{key}
        [AcceptVerbs("PUT", "PATCH", "POST")]
        [Route("{key}")]
        public async Task<IActionResult> Update(string key, [FromBody] PageCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            if (string.IsNullOrWhiteSpace(key)) return BadRequest("key is required.");
            if (dto == null) return BadRequest("payload required.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var setParts = new List<string>();
                var cmd = new NpgsqlCommand { Connection = conn, CommandType = CommandType.Text };

                if (!string.IsNullOrWhiteSpace(dto.Title))
                {
                    setParts.Add(@"""title"" = @title");
                    cmd.Parameters.AddWithValue("title", NpgsqlTypes.NpgsqlDbType.Text, dto.Title);
                }
                if (dto.Description != null)
                {
                    setParts.Add(@"""description"" = @description");
                    cmd.Parameters.AddWithValue("description", string.IsNullOrWhiteSpace(dto.Description) ? (object)DBNull.Value : dto.Description);
                }

                if (setParts.Count == 0) return BadRequest("Nothing to update.");

                cmd.CommandText = $"UPDATE pages SET {string.Join(", ", setParts)}, updated_at = now() WHERE key = @key";
                cmd.Parameters.AddWithValue("key", NpgsqlTypes.NpgsqlDbType.Text, key);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating page {Key}", key);
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error updating page.");
            }
        }

        // DELETE api/pages/{key}
        [AcceptVerbs("DELETE", "POST")]
        [Route("{key}")]
        public async Task<IActionResult> Delete(string key)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");

            if (string.IsNullOrWhiteSpace(key)) return BadRequest("key is required.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var cmd = new NpgsqlCommand("DELETE FROM pages WHERE key = @key", conn);
                cmd.Parameters.AddWithValue("key", NpgsqlTypes.NpgsqlDbType.Text, key);
                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting page {Key}", key);
                return _env.IsDevelopment() ? StatusCode(500, ex.ToString()) : StatusCode(500, "Error deleting page.");
            }
        }

        public class PageCreateDto
        {
            public string Key { get; set; } = "";
            public string Title { get; set; } = "";
            public string? Description { get; set; }
        }
    }
}
