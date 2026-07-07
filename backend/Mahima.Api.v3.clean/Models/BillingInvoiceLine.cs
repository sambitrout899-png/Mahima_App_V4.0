using System;

namespace Mahima.Api.v3.clean.Models
{
    public class BillingInvoiceLine
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid InvoiceId { get; set; }
        public string ModuleCode { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Quantity { get; set; } = 1;
        public decimal UnitPriceInr { get; set; }
        public decimal AmountInr { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public BillingInvoice? Invoice { get; set; }
        public ModuleCatalogItem? Module { get; set; }
    }
}
