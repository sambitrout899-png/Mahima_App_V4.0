using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Dtos
{
    public class MinistryAutomationSettingsDto
    {
        public bool Enabled { get; set; } = true;
        public string TimeZone { get; set; } = "Asia/Kolkata";
        public string DailyWordTime { get; set; } = "06:30";
        public string WelcomeTime { get; set; } = "07:00";
        public string NightPrayerTime { get; set; } = "18:30";
        public string SaturdayReminderTime { get; set; } = "18:00";
        public int DeliveryWindowMinutes { get; set; } = 90;
        public bool DailyWordEnabled { get; set; } = true;
        public bool WelcomeEnabled { get; set; } = true;
        public bool NightPrayerEnabled { get; set; } = true;
        public bool SaturdayReminderEnabled { get; set; } = true;
    }

    public class TriggerMinistryMessageDto
    {
        public string MessageType { get; set; } = "daily-word";
        public List<string>? Languages { get; set; }
    }

    public class CustomMinistryMessageDto
    {
        public string? Message { get; set; }
        public string? Language { get; set; }
        public List<string>? Languages { get; set; }
        public Dictionary<string, string>? Messages { get; set; }
    }
}
