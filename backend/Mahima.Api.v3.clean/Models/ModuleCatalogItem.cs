using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Models
{
    public class ModuleCatalogItem
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MonthlyPriceInr { get; set; }
        public bool IsBaseModule { get; set; }
        public bool Enabled { get; set; } = true;
        public int DisplayOrder { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

        public ICollection<SubscriptionPlanModule> PlanModules { get; set; } = new List<SubscriptionPlanModule>();
        public ICollection<TenantModuleLicense> TenantLicenses { get; set; } = new List<TenantModuleLicense>();
    }
}
