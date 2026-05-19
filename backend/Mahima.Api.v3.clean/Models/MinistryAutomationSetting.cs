using System;

namespace Mahima.Api.v3.clean.Models
{
    public class MinistryAutomationSetting
    {
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
