using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly string _connStr;
        private readonly ILogger<TasksController> _logger;

        public TasksController(IConfiguration config, ILogger<TasksController> logger)
        {
            _connStr = config.GetConnectionString("DefaultConnection");
            _logger = logger;
        }

        // ============================
        // GET ALL TASKS
        // ============================
        [HttpGet]
        public async Task<IActionResult> GetAllTasks()
        {
            var list = new List<object>();

            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();

            var sql = @"SELECT ""Id"", ""Title"", ""Description"", ""Status"", ""Priority"", ""DueDate""
                        FROM public.""Tasks""
                        ORDER BY ""Id"" DESC";

            await using var cmd = new NpgsqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    id = reader.GetInt64(0),
                    title = reader.GetString(1),
                    description = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    status = reader.GetInt32(3),   // INT
                    priority = reader.GetInt32(4), // INT
                    dueDate = reader.IsDBNull(5) ? (DateTime?)null : reader.GetDateTime(5)
                });
            }

            return Ok(list);
        }

        // ============================
        // CREATE TASK
        // ============================
        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] TaskDto dto)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connStr);
                await conn.OpenAsync();

                int status = dto.Status ?? 0;
                int priority = dto.Priority ?? 1;

                var sql = @"
                    INSERT INTO public.""Tasks""
                    (""Title"", ""Description"", ""Status"", ""Priority"", ""DueDate"")
                    VALUES (@t, @d, @s, @p, @dd)
                    RETURNING ""Id"";
                ";

                await using var cmd = new NpgsqlCommand(sql, conn);

                cmd.Parameters.AddWithValue("t", dto.Title ?? "");
                cmd.Parameters.AddWithValue("d", (object?)dto.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("s", status);
                cmd.Parameters.AddWithValue("p", priority);
                cmd.Parameters.AddWithValue("dd", (object?)dto.DueDate ?? DBNull.Value);

                var id = await cmd.ExecuteScalarAsync();

                return Ok(new { id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                return StatusCode(500, ex.Message);
            }
        }

        // ============================
        // UPDATE TASK ✅ FIXED
        // ============================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(long id, [FromBody] TaskDto dto)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connStr);
                await conn.OpenAsync();

                int status = dto.Status ?? 0;
                int priority = dto.Priority ?? 1;

                var sql = @"
                    UPDATE public.""Tasks""
                    SET ""Title""=@t,
                        ""Description""=@d,
                        ""Status""=@s,
                        ""Priority""=@p,
                        ""DueDate""=@dd
                    WHERE ""Id""=@id;
                ";

                await using var cmd = new NpgsqlCommand(sql, conn);

                cmd.Parameters.AddWithValue("id", id);
                cmd.Parameters.AddWithValue("t", dto.Title ?? "");
                cmd.Parameters.AddWithValue("d", (object?)dto.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("s", status);
                cmd.Parameters.AddWithValue("p", priority);
                cmd.Parameters.AddWithValue("dd", (object?)dto.DueDate ?? DBNull.Value);

                var rows = await cmd.ExecuteNonQueryAsync();

                if (rows == 0) return NotFound();

                return Ok(new { message = "Updated" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating task");
                return StatusCode(500, ex.Message);
            }
        }

        // ============================
        // DELETE
        // ============================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(long id)
        {
            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();

            var sql = @"DELETE FROM public.""Tasks"" WHERE ""Id""=@id";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("id", id);

            await cmd.ExecuteNonQueryAsync();

            return Ok();
        }

        // ============================
        // CALENDAR FIX ✅
        // ============================
        [HttpGet("calendar")]
        public async Task<IActionResult> GetCalendarTasks()
        {
            return await GetAllTasks(); // reuse
        }

        // ============================
        // DTO
        // ============================
        public class TaskDto
        {
            public string? Title { get; set; }
            public string? Description { get; set; }
            public int? Status { get; set; }   // INT
            public int? Priority { get; set; } // INT
            public DateTime? DueDate { get; set; }
        }
    }
}
