using System;

namespace Mahima.Api.v3.clean.Models
{
    public class AnalyticsTaskByRole
    {
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
