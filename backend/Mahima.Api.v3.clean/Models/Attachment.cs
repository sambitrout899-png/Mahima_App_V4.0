using System;

namespace Mahima.Api.v3.clean.Models
{
    public class Attachment
    {
        public long Id { get; set; }
        public string OwnerType { get; set; } = "";
        public long OwnerId { get; set; }
        public string S3Key { get; set; } = "";
        public string? Filename { get; set; }
        public string? ContentType { get; set; }
        public long? SizeBytes { get; set; }
        public Guid? UploadedBy { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
