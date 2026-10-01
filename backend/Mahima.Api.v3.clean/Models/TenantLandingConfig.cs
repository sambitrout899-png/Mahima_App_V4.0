using System;

namespace Mahima.Api.v3.clean.Models
{
    public class TenantLandingConfig
    {
        public Guid TenantId { get; set; }
        public string? LogoUrl { get; set; }
        public string? HeroImageUrl { get; set; }
        public string HeroTitle { get; set; } = "Welcome";
        public string? HeroSubtitle { get; set; }
        public string? PrimaryColor { get; set; }
        public string? AccentColor { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? Address { get; set; }
        public string? ServiceTimesJson { get; set; }
        public string? SocialLinksJson { get; set; }
        public string? SectionsJson { get; set; }
        public bool Published { get; set; } = true;
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

        public Tenant? Tenant { get; set; }
    }
}
