using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;

namespace Mahima.Api.v3.clean.Services
{
    public sealed class TaskAutomationQueueService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<ChatHub> _hub;
        private readonly IConfiguration _config;
        private readonly ILogger<TaskAutomationQueueService> _logger;

        public TaskAutomationQueueService(
            IServiceScopeFactory scopeFactory,
            IHubContext<ChatHub> hub,
            IConfiguration config,
            ILogger<TaskAutomationQueueService> logger)
        {
            _scopeFactory = scopeFactory;
            _hub = hub;
            _config = config;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var pollSeconds = Math.Clamp(GetInt("TaskAutomation:PollSeconds", 60), 15, 3600);
            _logger.LogInformation("Task automation queue started. PollSeconds={PollSeconds}", pollSeconds);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessDueAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Task automation queue failed.");
                }

                await Task.Delay(TimeSpan.FromSeconds(pollSeconds), stoppingToken);
            }
        }

        private int GetInt(string key, int fallback)
        {
            return int.TryParse(_config[key], out var value) ? value : fallback;
        }

        private async Task ProcessDueAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MahimaDbContext>();
            var chat = scope.ServiceProvider.GetRequiredService<IChatService>();
            var pastorBot = scope.ServiceProvider.GetRequiredService<IPastorBotService>();
            var botUserId = await pastorBot.EnsurePastorBotUserAsync(ct);

            var conn = db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync(ct);

            await EnsureSchemaAsync(conn, ct);

            var queueIds = await ClaimDueRowsAsync(conn, ct);
            foreach (var queueId in queueIds)
            {
                try
                {
                    await ProcessOneAsync(conn, chat, botUserId, queueId, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Task automation queue item {QueueId} failed.", queueId);
                    await MarkFailedAsync(conn, queueId, ex.Message, ct);
                }
            }
        }

        private static async Task EnsureSchemaAsync(System.Data.Common.DbConnection conn, CancellationToken ct)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
<<<<<<< HEAD
=======
ALTER TABLE public.""Tasks""
    ADD COLUMN IF NOT EXISTS ""ProcessStage"" text NOT NULL DEFAULT 'intake',
    ADD COLUMN IF NOT EXISTS ""UpdatedAt"" timestamp without time zone NULL;

>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
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
CREATE UNIQUE INDEX IF NOT EXISTS ux_task_automation_queue_task_key
    ON public.""TaskAutomationQueue"" (""TaskId"", ""AutomationKey"");
CREATE INDEX IF NOT EXISTS ix_task_automation_queue_due
    ON public.""TaskAutomationQueue"" (""Status"", ""ScheduledAtUtc"");";
            await cmd.ExecuteNonQueryAsync(ct);
        }

        private static async Task<IReadOnlyList<long>> ClaimDueRowsAsync(System.Data.Common.DbConnection conn, CancellationToken ct)
        {
            var ids = new List<long>();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
WITH due AS (
    SELECT ""Id""
    FROM public.""TaskAutomationQueue""
    WHERE ""Status"" = 'pending'
      AND ""ScheduledAtUtc"" <= now()
    ORDER BY ""ScheduledAtUtc"", ""Id""
    LIMIT 25
    FOR UPDATE SKIP LOCKED
)
UPDATE public.""TaskAutomationQueue"" q
SET ""Status"" = 'processing',
    ""AttemptCount"" = ""AttemptCount"" + 1,
    ""UpdatedAtUtc"" = now()
FROM due
WHERE q.""Id"" = due.""Id""
RETURNING q.""Id"";";
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct)) ids.Add(reader.GetInt64(0));
            return ids;
        }

        private async Task ProcessOneAsync(System.Data.Common.DbConnection conn, IChatService chat, Guid botUserId, long queueId, CancellationToken ct)
        {
            var row = await LoadQueueRowAsync(conn, queueId, ct);
            if (row == null)
            {
                await MarkSkippedAsync(conn, queueId, "Queue row not found.", ct);
                return;
            }

            if (row.TaskStatus == 2 || row.TaskStatus == 3)
            {
                await MarkSkippedAsync(conn, queueId, "Task is completed or on hold.", ct);
                return;
            }

            var recipients = await ResolveRecipientsAsync(conn, row.TaskId, ct);
            if (recipients.LinkRecipients.Count == 0 && recipients.NotifyOnlyRecipients.Count == 0)
            {
                await MarkSkippedAsync(conn, queueId, "No recipients resolved.", ct);
                return;
            }

            var link = BuildTaskLink(row.TaskId);
            var linkedMessage = $"{row.Message}\n\nOpen task: {link}";

            foreach (var userId in recipients.LinkRecipients)
                await SendDirectAsync(chat, botUserId, userId, linkedMessage, ct);

            foreach (var userId in recipients.NotifyOnlyRecipients.Except(recipients.LinkRecipients))
                await SendDirectAsync(chat, botUserId, userId, row.Message, ct);

            await MarkSentAsync(conn, queueId, recipients.LinkRecipients.Count, recipients.NotifyOnlyRecipients.Count, ct);
            await MarkTaskDoneAsync(conn, row.TaskId, ct);
        }

        private string BuildTaskLink(long taskId)
        {
            var publicUrl = (_config["App:PublicUrl"] ?? "https://www.mahimaministries.in").TrimEnd('/');
            return $"{publicUrl}/#/home/tasks?taskId={taskId}";
        }

        private async Task SendDirectAsync(IChatService chat, Guid botUserId, Guid recipientId, string message, CancellationToken ct)
        {
            if (recipientId == Guid.Empty || recipientId == botUserId) return;
            var direct = await chat.CreateOrGetDirectChatAsync(botUserId, recipientId);
            var sent = await chat.AddMessageAsync(direct.Id, botUserId, message, "task-reminder");
            await _hub.Clients.Users(new[] { botUserId.ToString(), recipientId.ToString() })
                .SendAsync("ReceiveMessage", sent, ct);
        }

        private static async Task<QueueRow?> LoadQueueRowAsync(System.Data.Common.DbConnection conn, long queueId, CancellationToken ct)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
SELECT q.""TaskId"", q.""Message"", t.""Title"", t.""Status""
FROM public.""TaskAutomationQueue"" q
JOIN public.""Tasks"" t ON t.""Id"" = q.""TaskId""
WHERE q.""Id"" = @id;";
            var p = cmd.CreateParameter(); p.ParameterName = "id"; p.Value = queueId; cmd.Parameters.Add(p);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            if (!await reader.ReadAsync(ct)) return null;
            return new QueueRow(reader.GetInt64(0), reader.GetString(1), reader.GetString(2), reader.GetInt32(3));
        }

        private static async Task<RecipientSet> ResolveRecipientsAsync(System.Data.Common.DbConnection conn, long taskId, CancellationToken ct)
        {
            var linkRecipients = new HashSet<Guid>();
            var notifyOnlyRecipients = new HashSet<Guid>();
            var teamIds = new List<long>();

            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT ""AssigneeType"", ""AssigneeId""
FROM public.""TaskAssignees""
WHERE ""TaskId"" = @taskId;";
                var p = cmd.CreateParameter(); p.ParameterName = "taskId"; p.Value = taskId; cmd.Parameters.Add(p);
                await using var reader = await cmd.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    var type = reader.GetString(0);
                    var idText = reader.GetString(1);
                    if (string.Equals(type, "user", StringComparison.OrdinalIgnoreCase) && Guid.TryParse(idText, out var userId))
                    {
                        linkRecipients.Add(userId);
                    }
                    else if (string.Equals(type, "team", StringComparison.OrdinalIgnoreCase) && long.TryParse(idText, out var teamId))
                    {
                        teamIds.Add(teamId);
                    }
                }
            }

            if (teamIds.Count > 0)
            {
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
SELECT DISTINCT tm.userid,
       COALESCE(tm.""IsLeader"", false) OR (teams.""LeadUserId"" IS NOT NULL AND teams.""LeadUserId"" = tm.userid) AS is_leader
FROM public.teammembers tm
LEFT JOIN public.""Teams"" teams ON teams.""Id"" = tm.teamid
WHERE tm.teamid = ANY(@teamIds);";
                var p = cmd.CreateParameter();
                p.ParameterName = "teamIds";
                p.Value = teamIds.Distinct().ToArray();
                if (p is NpgsqlParameter npg) npg.NpgsqlDbType = NpgsqlDbType.Array | NpgsqlDbType.Bigint;
                cmd.Parameters.Add(p);
                await using var reader = await cmd.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    if (reader.IsDBNull(0)) continue;
                    var userId = reader.GetGuid(0);
                    var isLeader = !reader.IsDBNull(1) && reader.GetBoolean(1);
                    if (isLeader) linkRecipients.Add(userId);
                    else notifyOnlyRecipients.Add(userId);
                }
            }

            return new RecipientSet(linkRecipients, notifyOnlyRecipients);
        }

        private static async Task MarkTaskDoneAsync(System.Data.Common.DbConnection conn, long taskId, CancellationToken ct)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
UPDATE public.""Tasks""
SET ""Status"" = 2,
    ""ProcessStage"" = 'done',
    ""UpdatedAt"" = COALESCE(""UpdatedAt"", now())
WHERE ""Id"" = @taskId
  AND ""Status"" NOT IN (2, 3);";
            var p = cmd.CreateParameter(); p.ParameterName = "taskId"; p.Value = taskId; cmd.Parameters.Add(p);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        private static async Task MarkSentAsync(System.Data.Common.DbConnection conn, long queueId, int linkedCount, int notifyOnlyCount, CancellationToken ct)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
UPDATE public.""TaskAutomationQueue""
SET ""Status"" = 'sent',
    ""SentAtUtc"" = now(),
    ""LastError"" = NULL,
    ""UpdatedAtUtc"" = now()
WHERE ""Id"" = @id;";
            var p = cmd.CreateParameter(); p.ParameterName = "id"; p.Value = queueId; cmd.Parameters.Add(p);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        private static async Task MarkSkippedAsync(System.Data.Common.DbConnection conn, long queueId, string reason, CancellationToken ct)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
UPDATE public.""TaskAutomationQueue""
SET ""Status"" = 'skipped',
    ""LastError"" = @reason,
    ""UpdatedAtUtc"" = now()
WHERE ""Id"" = @id;";
            var p1 = cmd.CreateParameter(); p1.ParameterName = "id"; p1.Value = queueId; cmd.Parameters.Add(p1);
            var p2 = cmd.CreateParameter(); p2.ParameterName = "reason"; p2.Value = reason; cmd.Parameters.Add(p2);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        private static async Task MarkFailedAsync(System.Data.Common.DbConnection conn, long queueId, string error, CancellationToken ct)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
UPDATE public.""TaskAutomationQueue""
SET ""Status"" = CASE WHEN ""AttemptCount"" >= 5 THEN 'failed' ELSE 'pending' END,
    ""LastError"" = @error,
    ""UpdatedAtUtc"" = now()
WHERE ""Id"" = @id;";
            var p1 = cmd.CreateParameter(); p1.ParameterName = "id"; p1.Value = queueId; cmd.Parameters.Add(p1);
            var p2 = cmd.CreateParameter(); p2.ParameterName = "error"; p2.Value = error.Length > 1000 ? error.Substring(0, 1000) : error; cmd.Parameters.Add(p2);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        private sealed record QueueRow(long TaskId, string Message, string Title, int TaskStatus);
        private sealed record RecipientSet(HashSet<Guid> LinkRecipients, HashSet<Guid> NotifyOnlyRecipients);
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
