using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
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
        //  public."TaskAssignees"  PascalCase table â€” POLYMORPHIC join:
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

        private static volatile bool _processSchemaReady = false;

        private async Task EnsureProcessSchemaAsync(NpgsqlConnection conn)
        {
            if (_processSchemaReady) return;

            const string sql = @"
ALTER TABLE public.""Tasks""
    ADD COLUMN IF NOT EXISTS ""ParentTaskId"" bigint NULL,
    ADD COLUMN IF NOT EXISTS ""TaskType"" text NOT NULL DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS ""ProcessStage"" text NOT NULL DEFAULT 'intake',
    ADD COLUMN IF NOT EXISTS ""FollowUpDate"" timestamp without time zone NULL,
    ADD COLUMN IF NOT EXISTS ""FollowUpNotes"" text NULL,
    ADD COLUMN IF NOT EXISTS ""CreatedById"" uuid NULL,
    ADD COLUMN IF NOT EXISTS ""OwnerPositionId"" bigint NULL,
    ADD COLUMN IF NOT EXISTS ""UpdatedById"" uuid NULL,
    ADD COLUMN IF NOT EXISTS ""AssignedByUserId"" uuid NULL,
    ADD COLUMN IF NOT EXISTS ""AssignedByPositionId"" bigint NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_parent_task') THEN
        ALTER TABLE public.""Tasks""
            ADD CONSTRAINT fk_tasks_parent_task
            FOREIGN KEY (""ParentTaskId"") REFERENCES public.""Tasks""(""Id"") ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.""TaskActivityLog"" (
    ""Id"" bigserial PRIMARY KEY,
    ""TaskId"" bigint NOT NULL REFERENCES public.""Tasks""(""Id"") ON DELETE CASCADE,
    ""Action"" text NOT NULL,
    ""Details"" text NULL,
    ""CreatedById"" uuid NULL,
    ""CreatedAt"" timestamp without time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.""TaskAssignees""
    ADD COLUMN IF NOT EXISTS ""AssignedByUserId"" uuid NULL,
    ADD COLUMN IF NOT EXISTS ""AssignedByPositionId"" bigint NULL;

CREATE TABLE IF NOT EXISTS public.""TaskAutomationQueue"" (
    ""Id"" bigserial PRIMARY KEY,
    ""TaskId"" bigint NOT NULL REFERENCES public.""Tasks""(""Id"") ON DELETE CASCADE,
    ""AutomationKey"" text NOT NULL,
    ""ScheduledAtUtc"" timestamp with time zone NOT NULL,
    ""Message"" text NOT NULL,
    ""Status"" text NOT NULL DEFAULT 'pending',
    ""SentAtUtc"" timestamp with time zone NULL,
    ""AttemptCount"" integer NOT NULL DEFAULT 0,
    ""LastError"" text NULL,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT now(),
    ""UpdatedAtUtc"" timestamp with time zone NULL
);

CREATE INDEX IF NOT EXISTS ix_task_activity_log_task_created ON public.""TaskActivityLog"" (""TaskId"", ""CreatedAt"" DESC);
CREATE INDEX IF NOT EXISTS ix_tasks_parent_task ON public.""Tasks"" (""ParentTaskId"");
CREATE INDEX IF NOT EXISTS ix_tasks_type_stage ON public.""Tasks"" (""TaskType"", ""ProcessStage"");
CREATE INDEX IF NOT EXISTS ix_tasks_owner_user ON public.""Tasks"" (""CreatedById"");
CREATE INDEX IF NOT EXISTS ix_tasks_owner_position ON public.""Tasks"" (""OwnerPositionId"");
CREATE UNIQUE INDEX IF NOT EXISTS ux_task_automation_queue_task_key ON public.""TaskAutomationQueue"" (""TaskId"", ""AutomationKey"");
CREATE INDEX IF NOT EXISTS ix_task_automation_queue_due ON public.""TaskAutomationQueue"" (""Status"", ""ScheduledAtUtc"");";

            await using var cmd = new NpgsqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync();
            _processSchemaReady = true;
        }

        private static string NormalizeTaskType(string? value)
        {
            var v = (value ?? "general").Trim().ToLowerInvariant();
            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "general", "pastoral-care", "prayer-follow-up", "member-care", "visitor-follow-up",
                "service-planning", "worship", "sermon-prep", "event", "outreach", "discipleship",
                "children-youth", "admin", "finance", "facility", "media", "volunteer", "counselling"
            };
            return allowed.Contains(v) ? v : "general";
        }

        private static string NormalizeProcessStage(string? value)
        {
            var v = (value ?? "intake").Trim().ToLowerInvariant();
            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "intake", "assigned", "in-progress", "waiting", "follow-up", "review", "done"
            };
            return allowed.Contains(v) ? v : "intake";
        }

        private static (int Status, string ProcessStage) NormalizeStatusAndStage(int? requestedStatus, string? requestedStage)
        {
            var stage = NormalizeProcessStage(requestedStage);
            var status = requestedStatus ?? 0;
            if (status < 0 || status > 3) status = 0;

            if (stage == "done") status = 2;
            if (status == 2) stage = "done";

            return (status, stage);
        }


        private static bool IsPositionAncestorOrSelf(PositionVisibilityContext visibility, long? ownerPositionId)
        {
            return ownerPositionId.HasValue && visibility.PositionTreeIds.Any(id => id == ownerPositionId.Value);
        }

        private static bool LooksLikeAdminRole(string? value)
        {
            var normalized = new string((value ?? "")
                .Trim()
                .ToLowerInvariant()
                .Where(char.IsLetterOrDigit)
                .ToArray());

            return normalized == "admin"
                || normalized == "administrator"
                || normalized == "superadmin"
                || normalized.Contains("admin");
        }

        private async Task<bool> IsAdminUserAsync(NpgsqlConnection conn)
        {
            var roleClaims = User.Claims
                .Where(c =>
                    string.Equals(c.Type, ClaimTypes.Role, StringComparison.OrdinalIgnoreCase)
                    || string.Equals(c.Type, "role", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(c.Type, "roles", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(c.Type, "Role", StringComparison.OrdinalIgnoreCase))
                .SelectMany(c => (c.Value ?? "").Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries))
                .Select(v => v.Trim());

            if (roleClaims.Any(LooksLikeAdminRole)) return true;

            var currentUserId = GetCurrentUserId();
            if (currentUserId == Guid.Empty) return false;

            await using var cmd = new NpgsqlCommand(@"
SELECT COALESCE(r.name, u.role)
FROM public.users u
LEFT JOIN public.roles r
  ON u.role ~ '^[0-9]+$'
 AND r.id = u.role::integer
WHERE u.id = @user_id
LIMIT 1;", conn);
            cmd.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, currentUserId);
            var dbRole = await cmd.ExecuteScalarAsync();
            return LooksLikeAdminRole(dbRole?.ToString());
        }

        private static DateTime? ResolveFlushCutoffUtc(string? range)
        {
            var now = DateTime.UtcNow;
            return (range ?? "").Trim().ToLowerInvariant() switch
            {
                "1d" or "1day" or "day" => now.AddDays(-1),
                "3d" or "3days" => now.AddDays(-3),
                "7d" or "7days" or "week" => now.AddDays(-7),
                "15d" or "15days" => now.AddDays(-15),
                "30d" or "30days" or "month" => now.AddDays(-30),
                "3m" or "3months" => now.AddMonths(-3),
                "6m" or "6months" => now.AddMonths(-6),
                "12m" or "12months" or "1y" or "1year" => now.AddMonths(-12),
                _ => null
            };
        }

        private static async Task<bool> HasDirectTaskAssignmentAsync(NpgsqlConnection conn, long taskId, Guid userId)
        {
            if (userId == Guid.Empty) return false;
            await using var cmd = new NpgsqlCommand(@"
SELECT EXISTS (
    SELECT 1
    FROM public.""TaskAssignees"" ta
    WHERE ta.""TaskId"" = @task_id
      AND ta.""AssigneeType"" = 'user'
      AND ta.""AssigneeId"" = @user_id
);", conn);
            cmd.Parameters.AddWithValue("task_id", taskId);
            cmd.Parameters.AddWithValue("user_id", NpgsqlDbType.Text, userId.ToString());
            return Convert.ToBoolean(await cmd.ExecuteScalarAsync());
        }

        private async Task<bool> CanModifyTaskAsync(NpgsqlConnection conn, long taskId, PositionVisibilityContext visibility)
        {
            if (await IsAdminUserAsync(conn)) return true;

            await using var cmd = new NpgsqlCommand(@"
SELECT ""CreatedById"", ""OwnerPositionId""
FROM public.""Tasks""
WHERE ""Id"" = @task_id;", conn);
            cmd.Parameters.AddWithValue("task_id", taskId);
            Guid? ownerUserId = null;
            long? ownerPositionId = null;
            await using (var rdr = await cmd.ExecuteReaderAsync())
            {
                if (!await rdr.ReadAsync()) return false;
                ownerUserId = rdr.IsDBNull(0) ? null : rdr.GetGuid(0);
                ownerPositionId = rdr.IsDBNull(1) ? null : rdr.GetInt64(1);
            }

            if (visibility.IsChurchLevel) return true;
            if (ownerUserId.HasValue && ownerUserId.Value == visibility.UserId) return true;
            if (visibility.IsMemberPosition) return false;
            if (IsPositionAncestorOrSelf(visibility, ownerPositionId) && ownerPositionId != visibility.PositionId) return true;
            return await HasDirectTaskAssignmentAsync(conn, taskId, visibility.UserId);
        }
        private async Task LogTaskActivityAsync(NpgsqlConnection conn, NpgsqlTransaction? tx, long taskId, string action, string? details = null)
        {
            await using var cmd = new NpgsqlCommand(@"
INSERT INTO public.""TaskActivityLog"" (""TaskId"", ""Action"", ""Details"", ""CreatedById"", ""CreatedAt"")
VALUES (@taskId, @action, @details, @createdById, now());", conn, tx);
            cmd.Parameters.AddWithValue("taskId", taskId);
            cmd.Parameters.AddWithValue("action", action);
            cmd.Parameters.AddWithValue("details", (object?)details ?? DBNull.Value);
            var userId = GetCurrentUserId();
            cmd.Parameters.AddWithValue("createdById", userId == Guid.Empty ? DBNull.Value : (object)userId);
            await cmd.ExecuteNonQueryAsync();
        }

        private static string? ExtractAutomationKey(string? description)
        {
            var match = Regex.Match(description ?? string.Empty, @"^Automation:\s*(.+)$", RegexOptions.IgnoreCase | RegexOptions.Multiline);
            return match.Success ? match.Groups[1].Value.Trim() : null;
        }

        private static bool IsAutomationTaskDto(TaskDto dto) => !string.IsNullOrWhiteSpace(ExtractAutomationKey(dto.Description));

        private static string? ExtractAutomationMessage(TaskDto dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.FollowUpNotes)) return dto.FollowUpNotes.Trim();
            var match = Regex.Match(dto.Description ?? string.Empty, @"^JaiMasihMessage:\s*(.+)$", RegexOptions.IgnoreCase | RegexOptions.Multiline);
            return match.Success ? match.Groups[1].Value.Trim() : null;
        }

        private static async Task UpsertTaskAutomationQueueAsync(NpgsqlConnection conn, NpgsqlTransaction tx, long taskId, TaskDto dto, bool replacePending)
        {
            var key = ExtractAutomationKey(dto.Description);
            if (string.IsNullOrWhiteSpace(key)) return;

            if (replacePending)
            {
                await using var clear = new NpgsqlCommand(@"
DELETE FROM public.""TaskAutomationQueue""
WHERE ""TaskId"" = @taskId
  AND ""Status"" IN ('pending', 'processing');", conn, tx);
                clear.Parameters.AddWithValue("taskId", taskId);
                await clear.ExecuteNonQueryAsync();
            }

            if (!dto.DueDate.HasValue || dto.Status == 2 || dto.Status == 3) return;
            var scheduledAtUtc = dto.DueDate.Value.Kind == DateTimeKind.Utc
                ? dto.DueDate.Value
                : DateTime.SpecifyKind(dto.DueDate.Value, DateTimeKind.Local).ToUniversalTime();

            if (scheduledAtUtc <= DateTime.UtcNow) return;

            var message = ExtractAutomationMessage(dto);
            if (string.IsNullOrWhiteSpace(message)) return;

            await using var cmd = new NpgsqlCommand(@"
INSERT INTO public.""TaskAutomationQueue"" (""TaskId"", ""AutomationKey"", ""ScheduledAtUtc"", ""Message"", ""Status"", ""CreatedAtUtc"")
VALUES (@taskId, @automationKey, @scheduledAtUtc, @message, 'pending', now())
ON CONFLICT (""TaskId"", ""AutomationKey"") DO UPDATE
SET ""ScheduledAtUtc"" = EXCLUDED.""ScheduledAtUtc"",
    ""Message"" = EXCLUDED.""Message"",
    ""Status"" = CASE WHEN public.""TaskAutomationQueue"".""Status"" IN ('sent', 'skipped') THEN public.""TaskAutomationQueue"".""Status"" ELSE 'pending' END,
    ""LastError"" = NULL,
    ""UpdatedAtUtc"" = now();", conn, tx);
            cmd.Parameters.AddWithValue("taskId", taskId);
            cmd.Parameters.AddWithValue("automationKey", key);
            cmd.Parameters.AddWithValue("scheduledAtUtc", NpgsqlDbType.TimestampTz, scheduledAtUtc);
            cmd.Parameters.AddWithValue("message", message);
            await cmd.ExecuteNonQueryAsync();
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
            await EnsureProcessSchemaAsync(conn);
            var visibility = await PositionVisibilityService.ResolveAsync(HttpContext, conn);
            var isAdmin = await IsAdminUserAsync(conn);
            var visibleTeamIds = visibility.IsMyTeams ? await LoadCurrentUserTeamIdsAsync(conn, visibility.UserId) : new List<long>();
            var visiblePositionIds = visibility.PositionTreeIds.Count > 0
                ? visibility.PositionTreeIds.ToArray()
                : (visibility.PositionId.HasValue ? new[] { visibility.PositionId.Value } : Array.Empty<long>());

            // ---- tasks ----
            // NOTE: Tasks."AssigneeId" is uuid (legacy single-assignee field).
            // It is deliberately NOT selected here â€” the source of truth for
            // assignments is the polymorphic "TaskAssignees" table loaded below.
            var taskSql = @"
SELECT ""Id"", ""Title"", ""Description"", ""Status"", ""Priority"", ""DueDate"",
       ""ParentTaskId"", ""TaskType"", ""ProcessStage"", ""FollowUpDate"", ""FollowUpNotes"",
       ""CreatedById"", ""OwnerPositionId"", ""AssignedByUserId"", ""AssignedByPositionId""
FROM public.""Tasks"" task_record";
            if (!visibility.IsChurchLevel)
            {
                taskSql += @"
WHERE (
    task_record.""CreatedById"" = @current_user_uuid
    OR (@current_position_id IS NOT NULL AND task_record.""OwnerPositionId"" = @current_position_id)
    OR (@include_position_tree AND task_record.""OwnerPositionId"" = ANY(@visible_position_ids))
    OR EXISTS (
        SELECT 1
        FROM public.""TaskAssignees"" ta
        WHERE ta.""TaskId"" = task_record.""Id""
          AND (
              (ta.""AssigneeType"" = 'user' AND ta.""AssigneeId"" = @current_user_id)
              OR (@include_teams AND ta.""AssigneeType"" = 'team' AND ta.""AssigneeId"" = ANY(@visible_team_ids))
          )
    )
)";
            }
            taskSql += @"
ORDER BY ""Id"" DESC";

            var taskIds = new List<long>();
            var taskRows = new List<Dictionary<string, object?>>();

            await using (var cmd = new NpgsqlCommand(taskSql, conn))
            {
                if (!visibility.IsChurchLevel)
                {
                    cmd.Parameters.AddWithValue("current_user_id", NpgsqlDbType.Text, visibility.UserId.ToString());
                    cmd.Parameters.AddWithValue("current_user_uuid", NpgsqlDbType.Uuid, visibility.UserId);
                    cmd.Parameters.AddWithValue("current_position_id", visibility.PositionId.HasValue ? (object)visibility.PositionId.Value : DBNull.Value);
                    cmd.Parameters.AddWithValue("include_position_tree", NpgsqlDbType.Boolean, visiblePositionIds.Length > 0);
                    cmd.Parameters.Add(new NpgsqlParameter("visible_position_ids", NpgsqlDbType.Array | NpgsqlDbType.Bigint) { Value = visiblePositionIds });
                    cmd.Parameters.AddWithValue("include_teams", NpgsqlDbType.Boolean, visibility.IsMyTeams && visibleTeamIds.Count > 0);
                    cmd.Parameters.Add(new NpgsqlParameter("visible_team_ids", NpgsqlDbType.Array | NpgsqlDbType.Text)
                    {
                        Value = visibleTeamIds.Select(id => id.ToString()).ToArray()
                    });
                }
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
                        ["parentTaskId"] = reader.IsDBNull(6) ? (long?)null : reader.GetInt64(6),
                        ["taskType"] = reader.IsDBNull(7) ? "general" : reader.GetString(7),
                        ["processStage"] = reader.IsDBNull(8) ? "intake" : reader.GetString(8),
                        ["followUpDate"] = reader.IsDBNull(9) ? (DateTime?)null : reader.GetDateTime(9),
                        ["followUpNotes"] = reader.IsDBNull(10) ? "" : reader.GetString(10),
                        ["createdById"] = reader.IsDBNull(11) ? (Guid?)null : reader.GetGuid(11),
                        ["ownerPositionId"] = reader.IsDBNull(12) ? (long?)null : reader.GetInt64(12),
                        ["assignedByUserId"] = reader.IsDBNull(13) ? (Guid?)null : reader.GetGuid(13),
                        ["assignedByPositionId"] = reader.IsDBNull(14) ? (long?)null : reader.GetInt64(14),
                    });
                }
            }
            }

            var assigneesByTask = new Dictionary<long, List<object>>();
            var assignedUserIdsByTask = new Dictionary<long, HashSet<string>>();
            foreach (var id in taskIds)
            {
                assigneesByTask[id] = new List<object>();
                assignedUserIdsByTask[id] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            }

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
                    if (string.Equals(type, "user", StringComparison.OrdinalIgnoreCase) && assignedUserIdsByTask.TryGetValue(taskId, out var assignedUsers))
                    {
                        assignedUsers.Add(rawId);
                    }

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

            var activityByTask = new Dictionary<long, List<object>>();
            foreach (var id in taskIds) activityByTask[id] = new List<object>();
            if (taskIds.Count > 0)
            {
                await using var activityCmd = new NpgsqlCommand(@"
SELECT ""TaskId"", ""Action"", ""Details"", ""CreatedById"", ""CreatedAt""
FROM public.""TaskActivityLog""
WHERE ""TaskId"" = ANY(@ids)
ORDER BY ""CreatedAt"" DESC;", conn);
                activityCmd.Parameters.Add(new NpgsqlParameter("ids", NpgsqlDbType.Array | NpgsqlDbType.Bigint) { Value = taskIds.ToArray() });
                await using var activityReader = await activityCmd.ExecuteReaderAsync();
                while (await activityReader.ReadAsync())
                {
                    var taskId = activityReader.GetInt64(0);
                    if (!activityByTask.TryGetValue(taskId, out var bucket)) continue;
                    bucket.Add(new
                    {
                        action = activityReader.GetString(1),
                        details = activityReader.IsDBNull(2) ? null : activityReader.GetString(2),
                        createdById = activityReader.IsDBNull(3) ? null : activityReader.GetGuid(3).ToString(),
                        createdAt = activityReader.GetDateTime(4),
                    });
                }
            }

            var childrenByParent = taskRows
                .Where(r => r["parentTaskId"] != null)
                .GroupBy(r => (long)r["parentTaskId"]!)
                .ToDictionary(g => g.Key, g => g.Select(r => (long)r["id"]!).ToList());

            foreach (var row in taskRows)
            {
                var id = (long)row["id"]!;
                var ownerUserId = row["createdById"] is Guid createdGuid ? createdGuid : (Guid?)null;
                var ownerPositionId = row["ownerPositionId"] is long ownerPositionLong ? ownerPositionLong : (long?)null;
                var isOwner = ownerUserId.HasValue && ownerUserId.Value == visibility.UserId;
                var isAssigned = assignedUserIdsByTask.TryGetValue(id, out var assignedUsers) && assignedUsers.Contains(visibility.UserId.ToString());
                var isLeader = IsPositionAncestorOrSelf(visibility, ownerPositionId) && ownerPositionId != visibility.PositionId;
                var isSamePosition = visibility.PositionId.HasValue && ownerPositionId.HasValue && visibility.PositionId.Value == ownerPositionId.Value;
                var canUpdate = isAdmin || visibility.IsChurchLevel || isOwner || (!visibility.IsMemberPosition && (isAssigned || isLeader));
                var visibilityReason = isOwner
                    ? "owner"
                    : isAssigned
                        ? (visibility.IsMemberPosition ? "member-assigned-readonly" : "assigned")
                    : isLeader
                            ? (visibility.IsMemberPosition ? "member-position-readonly" : "position-leader")
                            : isSamePosition
                                ? "same-position-readonly"
                                : isAdmin
                                    ? "admin"
                                : visibility.IsChurchLevel
                                    ? "church-level"
                                    : visibility.IsMemberPosition
                                        ? "member-own-records-only"
                                        : "position-scope";

                list.Add(new
                {
                    id          = row["id"],
                    title       = row["title"],
                    description = row["description"],
                    status      = row["status"],
                    priority    = row["priority"],
                    dueDate     = row["dueDate"],
                    parentTaskId = row["parentTaskId"],
                    taskType = row["taskType"],
                    processStage = row["processStage"],
                    followUpDate = row["followUpDate"],
                    followUpNotes = row["followUpNotes"],
                    createdById = ownerUserId?.ToString(),
                    ownerPositionId = ownerPositionId,
                    canUpdate = canUpdate,
                    readOnly = !canUpdate,
                    visibilityReason = visibilityReason,
                    subTaskIds = childrenByParent.TryGetValue(id, out var childIds) ? childIds : new List<long>(),
                    subTaskCount = childrenByParent.TryGetValue(id, out var childCountIds) ? childCountIds.Count : 0,
                    activityLog = activityByTask.TryGetValue(id, out var log) ? log.Take(8).ToList() : new List<object>(),
                    assigneeId  = (object?)null,
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
                await EnsureProcessSchemaAsync(conn);
                var visibility = await PositionVisibilityService.ResolveAsync(HttpContext, conn);
                await using var tx = await conn.BeginTransactionAsync();

                var statusStage = NormalizeStatusAndStage(dto.Status, dto.ProcessStage);
                int status = statusStage.Status;
                int priority = dto.Priority ?? 1;

                var sql = @"
INSERT INTO public.""Tasks""
(""Title"", ""Description"", ""Status"", ""Priority"", ""DueDate"", ""ParentTaskId"", ""TaskType"", ""ProcessStage"", ""FollowUpDate"", ""FollowUpNotes"", ""CreatedById"", ""OwnerPositionId"", ""AssignedByUserId"", ""AssignedByPositionId"")
VALUES (@t, @d, @s, @p, @dd, @parentTaskId, @taskType, @processStage, @followUpDate, @followUpNotes, @createdById, @ownerPositionId, @assignedByUserId, @assignedByPositionId)
RETURNING ""Id"";";

                long newId;
                await using (var cmd = new NpgsqlCommand(sql, conn, tx))
                {
                    cmd.Parameters.AddWithValue("t", dto.Title ?? "");
                    cmd.Parameters.AddWithValue("d", (object?)dto.Description ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("s", status);
                    cmd.Parameters.AddWithValue("p", priority);
                    cmd.Parameters.AddWithValue("dd", (object?)dto.DueDate ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("parentTaskId", (object?)dto.ParentTaskId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("taskType", NormalizeTaskType(dto.TaskType));
                    cmd.Parameters.AddWithValue("processStage", statusStage.ProcessStage);
                    cmd.Parameters.AddWithValue("followUpDate", (object?)dto.FollowUpDate ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("followUpNotes", string.IsNullOrWhiteSpace(dto.FollowUpNotes) ? DBNull.Value : dto.FollowUpNotes.Trim());
                    cmd.Parameters.AddWithValue("createdById", visibility.UserId == Guid.Empty ? DBNull.Value : (object)visibility.UserId);
                    cmd.Parameters.AddWithValue("ownerPositionId", visibility.PositionId.HasValue ? (object)visibility.PositionId.Value : DBNull.Value);
                    cmd.Parameters.AddWithValue("assignedByUserId", visibility.UserId == Guid.Empty ? DBNull.Value : (object)visibility.UserId);
                    cmd.Parameters.AddWithValue("assignedByPositionId", visibility.PositionId.HasValue ? (object)visibility.PositionId.Value : DBNull.Value);

                    var idObj = await cmd.ExecuteScalarAsync();
                    if (idObj == null) { await tx.RollbackAsync(); return StatusCode(500, "Insert returned no id"); }
                    newId = Convert.ToInt64(idObj);
                }

                await WriteAssigneesAsync(conn, tx, newId, dto.Assignees, replaceExisting: false, visibility);
                await LogTaskActivityAsync(conn, tx, newId, dto.ParentTaskId.HasValue ? "subtask-created" : "task-created", $"Type: {NormalizeTaskType(dto.TaskType)}; Status: {status}; Stage: {statusStage.ProcessStage}");
                await UpsertTaskAutomationQueueAsync(conn, tx, newId, dto, replacePending: false);

                await tx.CommitAsync();

                if (!IsAutomationTaskDto(dto))
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
                await EnsureProcessSchemaAsync(conn);
                var visibility = await PositionVisibilityService.ResolveAsync(HttpContext, conn);
                if (!await CanModifyTaskAsync(conn, id, visibility)) return Forbid();
                await using var tx = await conn.BeginTransactionAsync();

                var statusStage = NormalizeStatusAndStage(dto.Status, dto.ProcessStage);
                int status = statusStage.Status;
                int priority = dto.Priority ?? 1;

                var sql = @"
UPDATE public.""Tasks""
   SET ""Title""=@t,
       ""Description""=@d,
       ""Status""=@s,
       ""Priority""=@p,
       ""DueDate""=@dd,
       ""ParentTaskId""=@parentTaskId,
       ""TaskType""=@taskType,
       ""ProcessStage""=@processStage,
       ""FollowUpDate""=@followUpDate,
       ""FollowUpNotes""=@followUpNotes,
       ""UpdatedById""=@updatedById
 WHERE ""Id""=@id;";

                int rows;
                await using (var cmd = new NpgsqlCommand(sql, conn, tx))
                {
                    cmd.Parameters.AddWithValue("id", id);
                    cmd.Parameters.AddWithValue("t", dto.Title ?? "");
                    cmd.Parameters.AddWithValue("d", (object?)dto.Description ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("s", status);
                    cmd.Parameters.AddWithValue("p", priority);
                    cmd.Parameters.AddWithValue("dd", (object?)dto.DueDate ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("parentTaskId", (object?)dto.ParentTaskId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("taskType", NormalizeTaskType(dto.TaskType));
                    cmd.Parameters.AddWithValue("processStage", statusStage.ProcessStage);
                    cmd.Parameters.AddWithValue("followUpDate", (object?)dto.FollowUpDate ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("followUpNotes", string.IsNullOrWhiteSpace(dto.FollowUpNotes) ? DBNull.Value : dto.FollowUpNotes.Trim());
                    cmd.Parameters.AddWithValue("updatedById", visibility.UserId == Guid.Empty ? DBNull.Value : (object)visibility.UserId);

                    rows = await cmd.ExecuteNonQueryAsync();
                }

                if (rows == 0) { await tx.RollbackAsync(); return NotFound(); }

                await WriteAssigneesAsync(conn, tx, id, dto.Assignees, replaceExisting: true, visibility);
                await LogTaskActivityAsync(conn, tx, id, "task-updated", $"Status: {status}; Stage: {statusStage.ProcessStage}");
                await UpsertTaskAutomationQueueAsync(conn, tx, id, dto, replacePending: true);

                await tx.CommitAsync();

                if (!IsAutomationTaskDto(dto))
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
        [HttpDelete("flush")]
        public async Task<IActionResult> FlushTasks([FromQuery] string range)
        {
            var cutoffUtc = ResolveFlushCutoffUtc(range);
            if (!cutoffUtc.HasValue)
            {
                return BadRequest(new
                {
                    message = "Unsupported range. Use one of: 1d, 3d, 7d, 15d, 30d, 3m, 6m, 12m."
                });
            }

            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();
            await EnsureProcessSchemaAsync(conn);
            if (!await IsAdminUserAsync(conn)) return Forbid();

            await using var tx = await conn.BeginTransactionAsync();
            await using var cmd = new NpgsqlCommand(@"
WITH RECURSIVE target AS (
    SELECT ""Id""
    FROM public.""Tasks""
    WHERE ""CreatedAt"" >= @cutoff
    UNION
    SELECT child.""Id""
    FROM public.""Tasks"" child
    INNER JOIN target parent ON child.""ParentTaskId"" = parent.""Id""
),
target_count AS (
    SELECT COUNT(*)::bigint AS count FROM target
),
assignee_delete AS (
    DELETE FROM public.""TaskAssignees""
    WHERE ""TaskId"" IN (SELECT ""Id"" FROM target)
    RETURNING 1
),
log_delete AS (
    DELETE FROM public.""TaskActivityLog""
    WHERE ""TaskId"" IN (SELECT ""Id"" FROM target)
    RETURNING 1
),
task_delete AS (
    DELETE FROM public.""Tasks""
    WHERE ""Id"" IN (SELECT ""Id"" FROM target)
    RETURNING 1
)
SELECT
    (SELECT count FROM target_count) AS matched,
    (SELECT COUNT(*)::bigint FROM assignee_delete) AS assignees_deleted,
    (SELECT COUNT(*)::bigint FROM log_delete) AS activity_logs_deleted,
    (SELECT COUNT(*)::bigint FROM task_delete) AS tasks_deleted;", conn, tx);

            cmd.Parameters.AddWithValue("cutoff", NpgsqlDbType.TimestampTz, cutoffUtc.Value);

            long matched = 0;
            long assigneesDeleted = 0;
            long activityLogsDeleted = 0;
            long tasksDeleted = 0;
            await using (var reader = await cmd.ExecuteReaderAsync())
            {
                if (await reader.ReadAsync())
                {
                    matched = reader.GetInt64(0);
                    assigneesDeleted = reader.GetInt64(1);
                    activityLogsDeleted = reader.GetInt64(2);
                    tasksDeleted = reader.GetInt64(3);
                }
            }

            await tx.CommitAsync();
            return Ok(new
            {
                range,
                cutoffUtc = cutoffUtc.Value,
                matched,
                tasksDeleted,
                assigneesDeleted,
                activityLogsDeleted
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(long id)
        {
            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();
            await EnsureProcessSchemaAsync(conn);
            var visibility = await PositionVisibilityService.ResolveAsync(HttpContext, conn);
            if (!await CanModifyTaskAsync(conn, id, visibility)) return Forbid();

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
            bool replaceExisting,
            PositionVisibilityContext visibility)
        {
            if (replaceExisting)
            {
                await using var del = new NpgsqlCommand(
                    @"DELETE FROM public.""TaskAssignees"" WHERE ""TaskId"" = @t;", conn, tx);
                del.Parameters.AddWithValue("t", taskId);
                await del.ExecuteNonQueryAsync();
            }

            if (assignees == null || assignees.Count == 0) return;

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
                    @"INSERT INTO public.""TaskAssignees"" (""TaskId"", ""AssigneeType"", ""AssigneeId"", ""AssignedByUserId"", ""AssignedByPositionId"")
                      VALUES (@t, @ty, @id, @assignedByUserId, @assignedByPositionId)
                      ON CONFLICT DO NOTHING;", conn, tx);
                ins.Parameters.AddWithValue("t", taskId);
                ins.Parameters.AddWithValue("ty", type);
                ins.Parameters.AddWithValue("id", canonId);
                ins.Parameters.AddWithValue("assignedByUserId", visibility.UserId == Guid.Empty ? DBNull.Value : (object)visibility.UserId);
                ins.Parameters.AddWithValue("assignedByPositionId", visibility.PositionId.HasValue ? (object)visibility.PositionId.Value : DBNull.Value);
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

        private static async Task<List<long>> LoadCurrentUserTeamIdsAsync(NpgsqlConnection conn, Guid userId)
        {
            var ids = new List<long>();
            if (userId == Guid.Empty) return ids;
            await using var cmd = new NpgsqlCommand(@"
SELECT DISTINCT teamid
FROM public.teammembers
WHERE userid = @user_id;", conn);
            cmd.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId);
            await using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                if (!rdr.IsDBNull(0)) ids.Add(Convert.ToInt64(rdr.GetValue(0)));
            }
            return ids;
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
            public long? ParentTaskId { get; set; }
            public string? TaskType { get; set; }
            public string? ProcessStage { get; set; }
            public DateTime? FollowUpDate { get; set; }
            public string? FollowUpNotes { get; set; }
            public long? AssigneeId { get; set; }
            public List<TaskAssigneeDto>? Assignees { get; set; }
        }
    }
}














