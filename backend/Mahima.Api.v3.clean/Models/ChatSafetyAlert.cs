using System;

namespace Mahima.Api.v3.clean.Models
{
    public class ChatSafetyAlert
    {
        public long Id { get; set; }
        public Guid MessageId { get; set; }
        public Guid ChatId { get; set; }
        public Guid SenderId { get; set; }
        public string Category { get; set; } = "general_risk";
        public string Severity { get; set; } = "medium";
        public string AlertLevel { get; set; } = "admin";
        public decimal Confidence { get; set; }
        public string Summary { get; set; } = string.Empty;
        public string? EvidenceSnippet { get; set; }
        public string? ConversationSnippet { get; set; }
        public bool PastorFollowupSent { get; set; }
        public bool IsResolved { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAtUtc { get; set; }
    }
}
