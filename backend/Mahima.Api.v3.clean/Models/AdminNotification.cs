using System;

namespace Mahima.Api.v3.clean.Models
{
    public class AdminNotification
    {
        public long Id { get; set; }                // bigserial primary key
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");
        public Guid? UserId { get; set; }           // admin recipient
        public string Type { get; set; } = "";      // e.g., "PrayerRequestCreated"
        public string? Message { get; set; }        // human-readable message
        public string? Data { get; set; }           // optional JSON payload / metadata
        public bool IsRead { get; set; } = false;   // mark read/dismissed by admin
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
