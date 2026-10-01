using System;

namespace Mahima.Api.v3.clean.Models
{
    public class SubscriptionPlanModule
    {
        public Guid PlanId { get; set; }
        public string ModuleCode { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public SubscriptionPlan? Plan { get; set; }
        public ModuleCatalogItem? Module { get; set; }
    }
}
