using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        // -----------------------------------------------------------------
        //  Schema reference (live DB):
        //
        //  public."Tasks"          PascalCase table, PascalCase columns
        //                          ("Id", "Title", "Description", "Status",
        //                           "Priority", "DueDate", "AssigneeId" legacy)
        //
        //  public."TaskAssignees"  PascalCase table — POLYMORPHIC join:
        //      "TaskId"       bigint     references "Tasks"."Id"
        //      "AssigneeType" varchar    'user' | 'team'  (CHECK constraint)
        //      "AssigneeId"   text       user Guid as text, OR team bigint as text
        //      "AssignedAt"   timestamptz
        //      PK ("TaskId", "AssigneeType", "AssigneeId")
        //
        //  public.users            lowercase table, lowercase columns
        //                          (id, displayname, username, email,
        //                           profilephotourl, ...)
        //
        //  public."Teams"          PascalCase table, PascalCase columns
        //                          ("Id" bigint, "Name", ...)
        // -----------------------------------------------------------------

        private readonly string _connStr;
        private readonly ILogger<TasksController> _logger;
        private readonly IChatService _chatService;
        private readonly IHubContext<ChatHub> _chatHub;

        public TasksController(IConfiguration config, ILogger<TasksController> logger, IChatService chatService, IHubContext<ChatHub> chatHub)
        {
            _connStr = config.GetConnectionString("DefaultConnection");
            _logger = logger;
            _chatService = chatService;
            _chatHub = chatHub;
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

            // ---- tasks ----
            // NOTE: Tasks."AssigneeId" is uuid (legacy single-assignee field).
            // It is deliberately NOT selected here — the source of truth for
            // assignments is the polymorphic "TaskAssignees" table loaded below.
            var taskSql = @"
SELECT ""Id"", ""Title"", ""Description"", ""Status"", ""Priority"", ""DueDate""
FROM public.""Tasks""
ORDER BY ""Id"" DESC";

            var taskIds = new List<long>();
            var taskRows = new List<Dictionary<string, object?>>();

            await using (var cmd = new NpgsqlCommand(taskSql, conn))
            await using (var reader = await cmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    var id = reader.GetInt64(0);
                    taskIds.Add(id);
                    taskRows.Add(new Dictionary<string, object?>
                    {
                        ["id"]          = id,
                        ["title"]       = reader.GetString(1),
                        ["description"] = reader.IsDBNull(2) ? "" : reader.GetString(2),
                        ["status"]      = reader.GetInt32(3),
                        ["priority"]    = reader.GetInt32(4),
                        ["dueDate"]     = reader.IsDBNull(5) ? (DateTime?)null : reader.GetDateTime(5),
                    });
                }
            }

            var assigneesByTask = new Dictionary<long, List<object>>();
            foreach (var id in taskIds) assigneesByTask[id] = new List<object>();

            // ---- assignees (single polymorphic join) ----
            if (taskIds.Count > 0)
            {
                var assigneeSql = @"
SELECT ta.""TaskId"",
       ta.""AssigneeType"",
       ta.""AssigneeId"",
       u.displayname,
       u.username,
       u.email,
       u.profilephotourl,
       t.""Name""
FROM public.""TaskAssignees"" ta
LEFT JOIN public.users      u ON ta.""AssigneeType"" = 'user' AND u.id::text = ta.""AssigneeId""
LEFT JOIN public.""Teams""  t ON ta.""AssigneeType"" = 'team' AND t.""Id""::text = ta.""AssigneeId""
WHERE ta.""TaskId"" = ANY(@ids)";

                await using var cmd = new NpgsqlCommand(assigneeSql, conn);
                cmd.Parameters.Add(new NpgsqlParameter("ids", NpgsqlDbType.Array | NpgsqlDbType.Bigint) { Value = taskIds.ToArray() });
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var taskId   = reader.GetInt64(0);
                    var type     = reader.GetString(1);                              // 'user' | 'team'
                    var rawId    = reader.GetString(2);                              // text
                    var display  = reader.IsDBNull(3) ? null : reader.GetString(3);
                    var username = reader.IsDBNull(4) ? null : reader.GetString(4);
                    var email    = reader.IsDBNull(5) ? null : reader.GetString(5);
                    var photo    = reader.IsDBNull(6) ? null : reader.GetString(6);
                    var teamName = reader.IsDBNull(7) ? null : reader.GetString(7);

                    if (!assigneesByTask.TryGetValue(taskId, out var bucket)) continue;

                    if (string.Equals(type, "team", StringComparison.OrdinalIgnoreCase))
                    {
                        bucket.Add(new
                        {
                            id = rawId,
                            type = "team",
                            name = teamName ?? "Team",
                        });
                    }
                    else
                    {
                        bucket.Add(new
                        {
                            id = rawId,
                            type = "user",
                            name = display ?? username ?? email ?? "User",
                            displayName = display,
                            email = email,
                            avatarUrl = photo,
                        });
                    }
                }
            }

            foreach (var row in taskRows)
            {
                var id = (long)row["id"]!;
                list.Add(new
                {
                    id          = row["id"],
                    title       = row["title"],
                    description = row["description"],
                    status      = row["status"],
                    priority    = row["priority"],
                    dueDate     = row["dueDate"],
                    assigneeId  = (object?)null, // legacy field — always null going forward
                    assignees   = assigneesByTask.TryGetValue(id, out var a) ? a : new List<object>(),
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
                await using var tx = await conn.BeginTransactionAsync();

                int status = dto.Status ?? 0;
                int priority = dto.Priority ?? 1;

                // Tasks."AssigneeId" (uuid) is the deprecated single-assignee
                // column. We don't write to it; "TaskAssignees" carries the
                // actual user/team assignments.
                var sql = @"
INSERT INTO public.""Tasks""
(""Title"", ""Description"", ""Status"", ""Priority"", ""DueDate"")
VALUES (@t, @d, @s, @p, @dd)
RETURNING ""Id"";";

                long newId;
                await using (var cmd = new NpgsqlCommand(sql, conn, tx))
                {
                    cmd.Parameters.AddWithValue("t",  dto.Title ?? "");
                    cmd.Parameters.AddWithValue("d",  (object?)dto.Description ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("s",  status);
                    cmd.Parameters.AddWithValue("p",  priority);
                    cmd.Parameters.AddWithValue("dd", (object?)dto.DueDate ?? DBNull.Value);

                    var idObj = await cmd.ExecuteScalarAsync();
                    if (idObj == null) { await tx.RollbackAsync(); return StatusCode(500, "Insert returned no id"); }
                    newId = Convert.ToInt64(idObj);
                }

                await WriteAssigneesAsync(conn, tx, newId, dto.Assignees, replaceExisting: false);

                await tx.CommitAsync();

                await NotifyTaskAssigneesAsync(dto, newId, isUpdate: false);

                return Ok(new { id = newId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                return StatusCode(500, ex.Message);
            }
        }

        // ============================
        // UPDATE TASK
        // ============================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(long id, [FromBody] TaskDto dto)
        {
            try
            {
                await using var conn = new NpgsqlConnection(_connStr);
                await conn.OpenAsync();
                await using var tx = await conn.BeginTransactionAsync();

                int status = dto.Status ?? 0;
                int priority = dto.Priority ?? 1;

                // Skipping the legacy uuid "AssigneeId" column — assignees
                // are managed exclusively via "TaskAssignees" below.
                var sql = @"
UPDATE public.""Tasks""
   SET ""Title""=@t,
       ""Description""=@d,
       ""Status""=@s,
       ""Priority""=@p,
       ""DueDate""=@dd
 WHERE ""Id""=@id;";

                int rows;
                await using (var cmd = new NpgsqlCommand(sql, conn, tx))
                {
                    cmd.Parameters.AddWithValue("id", id);
                    cmd.Parameters.AddWithValue("t",  dto.Title ?? "");
                    cmd.Parameters.AddWithValue("d",  (object?)dto.Description ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("s",  status);
                    cmd.Parameters.AddWithValue("p",  priority);
                    cmd.Parameters.AddWithValue("dd", (object?)dto.DueDate ?? DBNull.Value);

                    rows = await cmd.ExecuteNonQueryAsync();
                }

                if (rows == 0) { await tx.RollbackAsync(); return NotFound(); }

                await WriteAssigneesAsync(conn, tx, id, dto.Assignees, replaceExisting: true);

                await tx.CommitAsync();

                await NotifyTaskAssigneesAsync(dto, id, isUpdate: true);

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

            // FK ON DELETE CASCADE handles the TaskAssignees rows.
            var sql = @"DELETE FROM public.""Tasks"" WHERE ""Id""=@id";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("id", id);

            await cmd.ExecuteNonQueryAsync();

            return Ok();
        }

        // ============================
        // CALENDAR
        // ============================
        [HttpGet("calendar")]
        public async Task<IActionResult> GetCalendarTasks()
        {
            return await GetAllTasks();
        }

        // ============================
        // ASSIGNEE WRITE HELPER
        // ============================
        private async Task WriteAssigneesAsync(
            NpgsqlConnection conn,
            NpgsqlTransaction tx,
            long taskId,
            List<TaskAssigneeDto>? assignees,
            bool replaceExisting)
        {
            if (replaceExisting)
            {
                await using var del = new NpgsqlCommand(
                    @"DELETE FROM public.""TaskAssignees"" WHERE ""TaskId"" = @t;", conn, tx);
                del.Parameters.AddWithValue("t", taskId);
                await del.ExecuteNonQueryAsync();
            }

            if (assignees == null || assignees.Count == 0) return;

            // Dedupe by (type, id). Validate IDs.
            var seen = new HashSet<(string Type, string Id)>();
            foreach (var a in assignees)
            {
                if (a?.Id == null) continue;
                var type = (a.Type ?? "user").Trim().ToLowerInvariant();
                if (type != "user" && type != "team") continue;

                string canonId;
                if (type == "user")
                {
                    if (!Guid.TryParse(a.Id, out var uid)) continue;
                    canonId = uid.ToString();
                }
                else
                {
                    if (!long.TryParse(a.Id, out var tid)) continue;
                    canonId = tid.ToString();
                }

                if (!seen.Add((type, canonId))) continue;

                await using var ins = new NpgsqlCommand(
                    @"INSERT INTO public.""TaskAssignees"" (""TaskId"", ""AssigneeType"", ""AssigneeId"")
                      VALUES (@t, @ty, @id)
                      ON CONFLICT DO NOTHING;", conn, tx);
                ins.Parameters.AddWithValue("t",  taskId);
                ins.Parameters.AddWithValue("ty", type);
                ins.Parameters.AddWithValue("id", canonId);
                await ins.ExecuteNonQueryAsync();
            }
        }

        // ============================
        // DTO + helpers
        // ============================
        private Guid GetCurrentUserId() =>
            Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        private async Task NotifyTaskAssigneesAsync(TaskDto dto, long taskId, bool isUpdate)
        {
            var senderId = GetCurrentUserId();
            if (senderId == Guid.Empty) return;

            var assigneeIds = new HashSet<Guid>();
            var teamIds = new List<long>();

            foreach (var assignee in dto.Assignees ?? new List<TaskAssigneeDto>())
            {
                var type = (assignee?.Type ?? "user").Trim().ToLowerInvariant();
                if (type == "user" && Guid.TryParse(assignee?.Id, out var userId) && userId != Guid.Empty && userId != senderId)
                {
                    assigneeIds.Add(userId);
                }
                else if (type == "team" && long.TryParse(assignee?.Id, out var teamId))
                {
                    teamIds.Add(teamId);
                }
            }

            if (teamIds.Count > 0)
            {
                await foreach (var memberId in LoadTeamMemberIdsAsync(teamIds.Distinct().ToList()))
                {
                    if (memberId != Guid.Empty && memberId != senderId)
                        assigneeIds.Add(memberId);
                }
            }

            if (assigneeIds.Count == 0) return;

            var action = isUpdate ? "updated" : "assigned";
            var due = dto.DueDate.HasValue ? $" Due: {dto.DueDate:dd-MMM-yyyy}." : string.Empty;
            var description = string.IsNullOrWhiteSpace(dto.Description)
                ? string.Empty
                : $"\n\nDescription:\n{dto.Description.Trim()}";
            var text = $"Task {action}: {dto.Title ?? "Untitled task"}{description}{due}";

            foreach (var assigneeId in assigneeIds)
            {
                try
                {
                    var chat = await _chatService.CreateOrGetDirectChatAsync(senderId, assigneeId);
                    var message = await _chatService.AddMessageAsync(chat.Id, senderId, text, "task");
                    await _chatHub.Clients.Users(new[] { senderId.ToString(), assigneeId.ToString() })
                        .SendAsync("ReceiveMessage", message);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send task assignment chat notification for task {TaskId} to {UserId}", taskId, assigneeId);
                }
            }
        }

        private async IAsyncEnumerable<Guid> LoadTeamMemberIdsAsync(IReadOnlyList<long> teamIds)
        {
            if (teamIds.Count == 0) yield break;

            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();

            await using var cmd = new NpgsqlCommand(@"
SELECT DISTINCT userid
FROM public.teammembers
WHERE teamid = ANY(@teamIds);", conn);
            cmd.Parameters.AddWithValue("teamIds", NpgsqlDbType.Array | NpgsqlDbType.Bigint, teamIds.ToArray());

            await using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                if (!rdr.IsDBNull(0) && Guid.TryParse(rdr.GetValue(0)?.ToString(), out var userId))
                    yield return userId;
            }
        }

        public class TaskAssigneeDto
        {
            public string? Id { get; set; }
            public string? Type { get; set; }
        }

        public class TaskDto
        {
            public string? Title { get; set; }
            public string? Description { get; set; }
            public int? Status { get; set; }
            public int? Priority { get; set; }
            public DateTime? DueDate { get; set; }
            public long? AssigneeId { get; set; }
            public List<TaskAssigneeDto>? Assignees { get; set; }
        }
    }
}
