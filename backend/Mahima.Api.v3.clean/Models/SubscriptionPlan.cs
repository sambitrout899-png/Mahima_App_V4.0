using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Models
{
    public class SubscriptionPlan
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MonthlyPriceInr { get; set; }
        public bool IsBaseFreePlan { get; set; }
        public bool Enabled { get; set; } = true;
        public int DisplayOrder { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

        public ICollection<SubscriptionPlanModule> Modules { get; set; } = new List<SubscriptionPlanModule>();
    }
}
