using System;

namespace Mahima.Api.v3.clean.Models
{
    public class TenantModuleRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string ModuleCode { get; set; } = string.Empty;
        public Guid? RequestedByUserId { get; set; }
        public string? RequestedByName { get; set; }
        public string? RequestedByEmail { get; set; }
        public string Status { get; set; } = "pending";
        public string? AdminNotes { get; set; }
        public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAtUtc { get; set; }
        public Guid? ReviewedByUserId { get; set; }
        public bool NotificationEmailSent { get; set; }
        public bool JaiMasihMessageSent { get; set; }

        public Tenant? Tenant { get; set; }
        public ModuleCatalogItem? Module { get; set; }
        public User? RequestedByUser { get; set; }
    }
}
