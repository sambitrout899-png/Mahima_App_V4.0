using System;

namespace Mahima.Api.v3.clean.Models
{
    public class TenantModuleLicense
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string ModuleCode { get; set; } = string.Empty;
        public string Status { get; set; } = "active";
        public decimal PriceInr { get; set; }
        public string Source { get; set; } = "manual";
        public Guid? ActivatedByPaymentId { get; set; }
        public DateTime StartsAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? EndsAtUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

        public Tenant? Tenant { get; set; }
        public ModuleCatalogItem? Module { get; set; }
        public PaymentIntent? ActivatedByPayment { get; set; }
    }
}
