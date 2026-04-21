using System;

namespace Mahima.Api.v3.clean.Models
{
    public class AuditLog
    {
        public long Id { get; set; }
        public Guid? ActorId { get; set; }
        public string Action { get; set; } = "";
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public string? Details { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
