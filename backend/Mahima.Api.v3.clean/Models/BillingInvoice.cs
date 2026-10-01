using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Models
{
    public class BillingInvoice
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime PeriodStartUtc { get; set; }
        public DateTime PeriodEndUtc { get; set; }
        public decimal SubtotalInr { get; set; }
        public decimal TaxInr { get; set; }
        public decimal TotalInr { get; set; }
        public decimal PaidInr { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = "open";
        public Guid? PaymentIntentId { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

        public Tenant? Tenant { get; set; }
        public PaymentIntent? PaymentIntent { get; set; }
        public ICollection<BillingInvoiceLine> Lines { get; set; } = new List<BillingInvoiceLine>();
    }
}
