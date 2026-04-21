using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Mahima.Api.v3.clean.Helpers;

namespace Mahima.Api.v3.clean
{
	/*
    // BackgroundService that polls tasks and sends recurring notifications
    public class RecurringTaskNotifier : BackgroundService
    {
        /*private readonly ILogger<RecurringTaskNotifier> _logger;
        private readonly IConfiguration _config;
        private readonly string _connStr;
        private readonly TimeSpan _pollInterval;

        public RecurringTaskNotifier(IConfiguration config, ILogger<RecurringTaskNotifier> logger)
        {
            _config = config;
            _logger = logger;
            _connStr = config.GetConnectionString("DefaultConnection")
                       ?? config["ConnectionStrings:DefaultConnection"]
                       ?? throw new InvalidOperationException("Connection string missing");
            _pollInterval = TimeSpan.FromMinutes(5);
            SmsHelper.Initialize(config, logger);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("RecurringTaskNotifier started, pollInterval={Interval}", _pollInterval);
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessDueNotifications(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while processing recurring notifications");
                }

                await Task.Delay(_pollInterval, stoppingToken);
            }
        }

        private async Task ProcessDueNotifications(CancellationToken ct)
        {
            var now = DateTime.UtcNow;

            // NOTE: table name uses lowercase public.tasks (matching your psql)
            // columns remain quoted since your schema appears to use mixed-case column names
            var query = @"
SELECT t.""Id"", t.""Title"", t.""Description"", t.""Recurrence"", t.""RecurrenceInterval"", t.""RecurrenceDays"", t.""NextNotifyAt""
FROM public.tasks t
WHERE t.""RecurrenceEnabled"" = true
  AND t.""NextNotifyAt"" IS NOT NULL
  AND t.""NextNotifyAt"" <= @now
  AND coalesce(t.""Status"", '') != 'Completed'";

            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync(ct);

            await using (var cmd = new NpgsqlCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("now", now);
                await using var rdr = await cmd.ExecuteReaderAsync(ct);
                var dueTasks = new List<(int Id, string? Title, string? Description, string? Recurrence, int? Interval, string? Days, DateTime? NextNotify)>();

                while (await rdr.ReadAsync(ct))
                {
                    var id = rdr.GetInt32(0);
                    var title = rdr.IsDBNull(1) ? null : rdr.GetString(1);
                    var desc = rdr.IsDBNull(2) ? null : rdr.GetString(2);
                    var rec = rdr.IsDBNull(3) ? null : rdr.GetString(3);
                    var interval = rdr.IsDBNull(4) ? (int?)null : rdr.GetInt32(4);
                    var days = rdr.IsDBNull(5) ? null : rdr.GetString(5);
                    var next = rdr.IsDBNull(6) ? (DateTime?)null : rdr.GetDateTime(6);
                    dueTasks.Add((id, title, desc, rec, interval, days, next));
                }

                await rdr.CloseAsync();

                foreach (var t in dueTasks)
                {
                    // Load assignees for this task.
                    // Keep quoted table/column names if those tables are mixed-case in your DB.
                    var recSql = @"
					SELECT u.""Phone"", u.""Email"", u.""DisplayName""
					FROM public.""TaskAssignees"" ta
					JOIN public.""Users"" u ON u.""Id"" = ta.""UserId""
					WHERE ta.""TaskId"" = @task;";

                    var recipients = new List<(string phone, string email, string name)>();
                    await using (var acmd = new NpgsqlCommand(recSql, conn))
                    {
                        acmd.Parameters.AddWithValue("task", t.Id);
                        await using var ar = await acmd.ExecuteReaderAsync(ct);
                        while (await ar.ReadAsync(ct))
                        {
                            var phone = ar.IsDBNull(0) ? null : ar.GetString(0);
                            var email = ar.IsDBNull(1) ? null : ar.GetString(1);
                            var name = ar.IsDBNull(2) ? null : ar.GetString(2);
                            recipients.Add((phone ?? string.Empty, email ?? string.Empty, name ?? string.Empty));
                        }
                        await ar.CloseAsync();
                    }

                    if (recipients.Count == 0)
                    {
                        _logger.LogInformation("Task {TaskId} due but has no assignees; advancing next notify", t.Id);
                        await AdvanceNextNotify(conn, t.Id, t.Recurrence, t.Interval, t.Days);
                        continue;
                    }

                    var sendErrors = new List<string>();
                    foreach (var r in recipients)
                    {
                        try
                        {
                            var body = $"Task reminder: {t.Title}\n{t.Description}";
                            if (!string.IsNullOrWhiteSpace(r.phone))
                            {
                                await SmsHelper.SendSmsAsync(r.phone, body, _logger);
                                await SmsHelper.SendWhatsappAsync(r.phone, body, _logger);
                            }
                            if (!string.IsNullOrWhiteSpace(r.email))
                            {
                                _logger.LogInformation("Would send EMAIL to {Email} for task {TaskId}", r.email, t.Id);
                                // integrate actual email sending here if required
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to notify recipient for task {TaskId}", t.Id);
                            sendErrors.Add(ex.Message);
                        }
                    }

                    await AdvanceNextNotify(conn, t.Id, t.Recurrence, t.Interval, t.Days);
                }
            }
        }

        private async Task AdvanceNextNotify(NpgsqlConnection conn, int taskId, string? recurrence, int? interval, string? days)
        {
            DateTime next;
            var now = DateTime.UtcNow;
            try
            {
                if (string.Equals(recurrence, "Daily", StringComparison.OrdinalIgnoreCase))
                {
                    next = now.AddDays(interval ?? 1);
                }
                else if (string.Equals(recurrence, "Weekly", StringComparison.OrdinalIgnoreCase))
                {
                    if (!string.IsNullOrWhiteSpace(days))
                    {
                        var daysList = days.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                        var targetDays = new List<DayOfWeek>();
                        foreach (var d in daysList)
                        {
                            if (Enum.TryParse<DayOfWeek>(d, true, out var dow)) targetDays.Add(dow);
                        }
                        var candidate = now.Date;
                        for (int i = 0; i < 14; i++)
                        {
                            candidate = candidate.AddDays(1);
                            if (targetDays.Contains(candidate.DayOfWeek))
                            {
                                next = candidate.AddHours(now.Hour).AddMinutes(now.Minute).AddSeconds(now.Second);
                                goto update;
                            }
                        }
                        next = now.AddDays(7 * (interval ?? 1));
                    }
                    else
                    {
                        next = now.AddDays(7 * (interval ?? 1));
                    }
                }
                else if (string.Equals(recurrence, "Monthly", StringComparison.OrdinalIgnoreCase))
                {
                    next = now.AddMonths(interval ?? 1);
                }
                else
                {
                    next = now.AddDays(7);
                }
            }
            catch
            {
                next = now.AddDays(7);
            }

        update:
            // update uses lowercase table name public.tasks (matching your psql)
            var updateSql = @"UPDATE public.tasks SET ""NextNotifyAt"" = @next, ""UpdatedAt"" = now() WHERE ""Id"" = @id";
            await using var ucmd = new NpgsqlCommand(updateSql, conn);
            ucmd.Parameters.AddWithValue("next", next);
            ucmd.Parameters.AddWithValue("id", taskId);
            await ucmd.ExecuteNonQueryAsync();
      
	  }
    
	
	}
	*/
}
