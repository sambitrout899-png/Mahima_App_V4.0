using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Models
{
    public class PaymentIntent
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Purpose { get; set; } = "module_activation";
        public string? ModuleCode { get; set; }
        public Guid? PlanId { get; set; }
        public decimal AmountInr { get; set; }
        public string Currency { get; set; } = "INR";
        public string Provider { get; set; } = "upi";
        public string Status { get; set; } = "pending";
        public string? ProviderOrderId { get; set; }
        public string? ProviderPaymentId { get; set; }
        public string? UpiVpa { get; set; }
        public string? UpiPayeeName { get; set; }
        public string? UpiDeepLink { get; set; }
        public string? MetadataJson { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAtUtc { get; set; }
        public DateTime? ExpiresAtUtc { get; set; }

        public Tenant? Tenant { get; set; }
        public ModuleCatalogItem? Module { get; set; }
        public SubscriptionPlan? Plan { get; set; }
        public ICollection<PaymentEvent> Events { get; set; } = new List<PaymentEvent>();
    }
}
