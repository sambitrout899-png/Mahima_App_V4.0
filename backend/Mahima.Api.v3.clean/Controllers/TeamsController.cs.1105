using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Data;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TeamsController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<TeamsController> _logger;

        public TeamsController(IConfiguration configuration, ILogger<TeamsController> logger)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger;
        }

        public class TeamCreateDto
        {
            public string? Name { get; set; }
            public string? Description { get; set; }
        }

        public class TeamDto
        {
            public object? Id { get; set; }   // could be int, long, guid depending on your schema
            public string? Name { get; set; }
            public string? Description { get; set; }
        }

        // POST /api/teams
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TeamCreateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { error = "Missing name" });

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                // Postgres: RETURNING Id, Name, Description
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO ""Teams"" (""Name"", ""Description"", ""CreatedAt"")
                    VALUES (@name, @desc, now())
                    RETURNING ""Id"", ""Name"", ""Description"";";
                cmd.Parameters.AddWithValue("name", dto.Name.Trim());
                cmd.Parameters.AddWithValue("desc", (object?)dto.Description ?? DBNull.Value);

                await using var rdr = await cmd.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    var created = new TeamDto
                    {
                        Id = rdr["Id"],
                        Name = rdr["Name"] is DBNull ? null : rdr["Name"]?.ToString(),
                        Description = rdr["Description"] is DBNull ? null : rdr["Description"]?.ToString()
                    };

                    // Return 201 Created + Location header for REST clients
                    return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
                }

                // Insert succeeded but returning failed
                return StatusCode(500, "Failed to return created team.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating team");
                return StatusCode(500, "Error creating team.");
            }
        }

        // GET /api/teams
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                await using var cmd = conn.CreateCommand();
                cmd.CommandText = @"SELECT ""Id"", ""Name"", ""Description"" FROM ""Teams"" ORDER BY ""Id"" DESC;";
                await using var rdr = await cmd.ExecuteReaderAsync();

                var list = new System.Collections.Generic.List<TeamDto>();
                while (await rdr.ReadAsync())
                {
                    list.Add(new TeamDto
                    {
                        Id = rdr["Id"],
                        Name = rdr["Name"] is DBNull ? null : rdr["Name"]?.ToString(),
                        Description = rdr["Description"] is DBNull ? null : rdr["Description"]?.ToString()
                    });
                }

                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading teams");
                return StatusCode(500, "Error reading teams.");
            }
        }

        // GET /api/teams/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                await using var cmd = conn.CreateCommand();
                cmd.CommandText = @"SELECT ""Id"", ""Name"", ""Description"" FROM ""Teams"" WHERE CAST(""Id"" AS text) = @id LIMIT 1;";
                cmd.Parameters.AddWithValue("id", id);

                await using var rdr = await cmd.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    var team = new TeamDto
                    {
                        Id = rdr["Id"],
                        Name = rdr["Name"] is DBNull ? null : rdr["Name"]?.ToString(),
                        Description = rdr["Description"] is DBNull ? null : rdr["Description"]?.ToString()
                    };
                    return Ok(team);
                }
                return NotFound();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading team {Id}", id);
                return StatusCode(500, "Error reading team.");
            }
        }

        // PUT /api/teams/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] TeamCreateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { error = "Missing name" });

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                await using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    UPDATE ""Teams""
                    SET ""Name"" = @name, ""Description"" = @desc, ""UpdatedAt"" = now()
                    WHERE CAST(""Id"" AS text) = @id
                    RETURNING ""Id"", ""Name"", ""Description"";";
                cmd.Parameters.AddWithValue("name", dto.Name.Trim());
                cmd.Parameters.AddWithValue("desc", (object?)dto.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("id", id);

                await using var rdr = await cmd.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    var updated = new TeamDto
                    {
                        Id = rdr["Id"],
                        Name = rdr["Name"] is DBNull ? null : rdr["Name"]?.ToString(),
                        Description = rdr["Description"] is DBNull ? null : rdr["Description"]?.ToString()
                    };
                    return Ok(updated);
                }

                return NotFound();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating team {Id}", id);
                return StatusCode(500, "Error updating team.");
            }
        }

        // DELETE /api/teams/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                await using var cmd = conn.CreateCommand();
                cmd.CommandText = @"DELETE FROM ""Teams"" WHERE CAST(""Id"" AS text) = @id RETURNING ""Id"";";
                cmd.Parameters.AddWithValue("id", id);

                await using var rdr = await cmd.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    return NoContent(); // deleted
                }

                return NotFound();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting team {Id}", id);
                return StatusCode(500, "Error deleting team.");
            }
        }
    }
}
