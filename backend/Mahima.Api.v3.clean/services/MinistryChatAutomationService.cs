using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Services
{
    public class MinistryChatAutomationService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<ChatHub> _hub;
        private readonly IConfiguration _config;
        private readonly ILogger<MinistryChatAutomationService> _logger;

        public MinistryChatAutomationService(
            IServiceScopeFactory scopeFactory,
            IHubContext<ChatHub> hub,
            IConfiguration config,
            ILogger<MinistryChatAutomationService> logger)
        {
            _scopeFactory = scopeFactory;
            _hub = hub;
            _config = config;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var pollSeconds = Math.Clamp(GetInt("PollSeconds", 60), 15, 3600);
            _logger.LogInformation("Ministry chat automation started. PollSeconds={PollSeconds}", pollSeconds);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessDueMessagesAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Ministry chat automation failed.");
                }

                await Task.Delay(TimeSpan.FromSeconds(pollSeconds), stoppingToken);
            }
        }

        private async Task ProcessDueMessagesAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MahimaDbContext>();
            var settings = await ReadSettingsAsync(db, ct);

            if (!GetBool(settings, "Enabled", true)) return;

            var nowLocal = GetLocalNow(settings);
            var candidates = BuildSchedules(nowLocal, settings)
                .Where(s => IsDue(nowLocal, s, settings))
                .ToList();
            if (candidates.Count == 0) return;

            var pastorBot = scope.ServiceProvider.GetRequiredService<IPastorBotService>();
            foreach (var schedule in candidates)
            {
                if (await AlreadySentAsync(db, schedule.Key, nowLocal.Date, ct)) continue;

                var content = schedule.BuildMessage(nowLocal);
                MessageDto sent = await pastorBot.SendJaiMasihMessageAsync(content, ct);
                await RecordSentAsync(db, schedule.Key, nowLocal.Date, ct);
                await NotifyChatAsync(db, sent, ct);

                _logger.LogInformation("Sent scheduled Jai Masih message {MessageKey} for {LocalDate}", schedule.Key, nowLocal.Date);
            }
        }

        private async Task NotifyChatAsync(MahimaDbContext db, MessageDto message, CancellationToken ct)
        {
            var memberIds = await db.ChatMembers
                .AsNoTracking()
                .Where(cm => cm.ChatId == message.ChatId)
                .Select(cm => cm.UserId.ToString())
                .Distinct()
                .ToListAsync(ct);

            if (memberIds.Count > 0)
                await _hub.Clients.Users(memberIds).SendAsync("ReceiveMessage", message, ct);
        }

        private async Task<bool> AlreadySentAsync(MahimaDbContext db, string key, DateTime localDate, CancellationToken ct)
        {
            return await db.MinistryScheduledMessageRuns
                .AsNoTracking()
                .AnyAsync(r => r.MessageKey == key && r.ScheduledLocalDate == localDate, ct);
        }

        private static async Task RecordSentAsync(MahimaDbContext db, string key, DateTime localDate, CancellationToken ct)
        {
            db.MinistryScheduledMessageRuns.Add(new MinistryScheduledMessageRun
            {
                MessageKey = key,
                ScheduledLocalDate = localDate,
                SentAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync(ct);
        }

        private IReadOnlyList<ScheduledMessage> BuildSchedules(DateTime nowLocal, IReadOnlyDictionary<string, string> settings)
        {
            var list = new List<ScheduledMessage>();

            if (GetBool(settings, "DailyWordEnabled", true))
                list.Add(new ScheduledMessage("daily-word", GetTime(settings, "DailyWordTime", "06:30"), _ => BuildDefaultMultilingualMessage("daily-word", nowLocal)));

            if (GetBool(settings, "WelcomeEnabled", true))
                list.Add(new ScheduledMessage("welcome", GetTime(settings, "WelcomeTime", "07:00"), _ => BuildDefaultMultilingualMessage("welcome", nowLocal)));

            if (GetBool(settings, "NightPrayerEnabled", true))
            {
                list.Add(new ScheduledMessage("night-prayer", GetNightPrayerTime(settings), _ => BuildDefaultMultilingualMessage("night-prayer", nowLocal))
                {
                    DaysOfWeek = new HashSet<DayOfWeek> { DayOfWeek.Tuesday, DayOfWeek.Friday }
                });
            }

            if (GetBool(settings, "SaturdayReminderEnabled", true))
            {
                list.Add(new ScheduledMessage("saturday-church-reminder", GetTime(settings, "SaturdayReminderTime", "18:00"), _ => BuildDefaultMultilingualMessage("saturday-church-reminder", nowLocal))
                {
                    DaysOfWeek = new HashSet<DayOfWeek> { DayOfWeek.Saturday }
                });
            }

            return list;
        }

        private static string BuildDefaultMultilingualMessage(string messageType, DateTime nowLocal)
        {
            var languages = new[]
            {
                ("en", "English"),
                ("hi", "Hindi"),
                ("pa", "Punjabi")
            };

            return string.Join("\n\n", languages.Select(language =>
                $"{language.Item2} ({language.Item1.ToUpperInvariant()}):\n{MinistryMessageFactory.Build(messageType, nowLocal, language.Item1)}"));
        }

        private bool IsDue(DateTime nowLocal, ScheduledMessage schedule, IReadOnlyDictionary<string, string> settings)
        {
            if (schedule.DaysOfWeek != null && !schedule.DaysOfWeek.Contains(nowLocal.DayOfWeek))
                return false;

            var deliveryWindowMinutes = Math.Clamp(GetInt(settings, "DeliveryWindowMinutes", 90), 1, 720);
            var scheduledAt = nowLocal.Date.Add(schedule.LocalTime);
            return nowLocal >= scheduledAt && nowLocal <= scheduledAt.AddMinutes(deliveryWindowMinutes);
        }

        private DateTime GetLocalNow(IReadOnlyDictionary<string, string> settings)
        {
            var tzId = Text(settings, "TimeZone", _config["MinistryAutomation:TimeZone"] ?? "Asia/Kolkata");
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            }
            catch
            {
                try
                {
                    var tz = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
                    return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
                }
                catch
                {
                    return DateTime.UtcNow.AddHours(5.5);
                }
            }
        }

        private TimeSpan GetTime(IReadOnlyDictionary<string, string> settings, string key, string fallback)
        {
            var value = Text(settings, key, _config[$"MinistryAutomation:{key}"] ?? fallback);
            return TimeSpan.TryParseExact(value, @"hh\:mm", CultureInfo.InvariantCulture, out var time)
                ? time
                : TimeSpan.ParseExact(fallback, @"hh\:mm", CultureInfo.InvariantCulture);
        }

        private TimeSpan GetNightPrayerTime(IReadOnlyDictionary<string, string> settings)
        {
            var value = Text(settings, "NightPrayerTime", _config["MinistryAutomation:NightPrayerTime"] ?? "18:30");
            if (value == "21:30") value = "18:30";
            return TimeSpan.TryParseExact(value, @"hh\:mm", CultureInfo.InvariantCulture, out var time)
                ? time
                : TimeSpan.ParseExact("18:30", @"hh\:mm", CultureInfo.InvariantCulture);
        }

        private bool GetBool(IReadOnlyDictionary<string, string> settings, string key, bool fallback)
        {
            if (settings.TryGetValue(key, out var settingValue) && bool.TryParse(settingValue, out var parsed))
                return parsed;
            return bool.TryParse(_config[$"MinistryAutomation:{key}"], out var value) ? value : fallback;
        }

        private int GetInt(IReadOnlyDictionary<string, string> settings, string key, int fallback)
        {
            if (settings.TryGetValue(key, out var settingValue) && int.TryParse(settingValue, out var parsed))
                return parsed;
            return int.TryParse(_config[$"MinistryAutomation:{key}"], out var value) ? value : fallback;
        }

        private int GetInt(string key, int fallback)
        {
            return int.TryParse(_config[$"MinistryAutomation:{key}"], out var value) ? value : fallback;
        }

        private static string Text(IReadOnlyDictionary<string, string> settings, string key, string fallback)
        {
            return settings.TryGetValue(key, out var raw) && !string.IsNullOrWhiteSpace(raw) ? raw : fallback;
        }

        private static async Task<IReadOnlyDictionary<string, string>> ReadSettingsAsync(MahimaDbContext db, CancellationToken ct)
        {
            return await db.MinistryAutomationSettings
                .AsNoTracking()
                .ToDictionaryAsync(s => s.Key, s => s.Value, ct);
        }

        private sealed class ScheduledMessage
        {
            public ScheduledMessage(string key, TimeSpan localTime, Func<DateTime, string> buildMessage)
            {
                Key = key;
                LocalTime = localTime;
                BuildMessage = buildMessage;
            }

            public string Key { get; }
            public TimeSpan LocalTime { get; }
            public Func<DateTime, string> BuildMessage { get; }
            public HashSet<DayOfWeek>? DaysOfWeek { get; set; }
        }
    }
}
