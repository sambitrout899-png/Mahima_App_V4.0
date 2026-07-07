using System;

namespace Mahima.Api.v3.clean.Models
{
    public class AnalyticsTaskByRole
    {
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");
        public int Id { get; set; }

        public string Role { get; set; } = string.Empty;

        // The snapshot timestamp used in your analytics
        public DateTime SnapshotAt { get; set; }

        // Task counts per role
        public int TotalTasks { get; set; }

        public int CompletedTasks { get; set; }

        public int OpenTasks { get; set; }

        public int OverdueTasks { get; set; }
    }
}
