using System;

namespace Mahima.Api.v3.clean.Models
{
    public class Sermon
    {
        public long Id { get; set; }
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public string S3Key { get; set; } = "";
        public int? DurationSeconds { get; set; }
        public string? Speaker { get; set; }
        public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
    }
}
