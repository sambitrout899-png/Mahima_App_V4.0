using System;

namespace Mahima.Api.v3.clean.Models
{
    public class MinistryScheduledMessageRun
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string MessageKey { get; set; } = string.Empty;
        public DateTime ScheduledLocalDate { get; set; }
        public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
    }
}
