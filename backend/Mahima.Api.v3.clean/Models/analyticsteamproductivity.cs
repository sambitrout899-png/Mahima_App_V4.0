using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    // -----------------------------
    // Analytics: User Overview
    // -----------------------------
    [Table("analytics_user_overview", Schema = "public")]
    public class AnalyticsUserOverview
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("snapshot_at")]
        public DateTime SnapshotAt { get; set; }

        [Column("total_users")]
        public int TotalUsers { get; set; }

        [Column("total_admins")]
        public int TotalAdmins { get; set; }

        [Column("total_members")]
        public int TotalMembers { get; set; }

        [Column("total_staff")]
        public int TotalStaff { get; set; }

        [Column("total_volunteers")]
        public int TotalVolunteers { get; set; }

        [Column("new_members_30d")]
        public int NewMembers30d { get; set; }
    }

   
    // -----------------------------
    // Analytics: Team Productivity
    // -----------------------------
    [Table("analytics_team_productivity", Schema = "public")]
    public class AnalyticsTeamProductivity
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("snapshot_at")]
        public DateTime SnapshotAt { get; set; }

        [Column("team_id")]
        public long TeamId { get; set; }

        [Column("period_label")]
        public string PeriodLabel { get; set; } = string.Empty;

        [Column("period_start")]
        public DateTime PeriodStart { get; set; }

        [Column("period_end")]
        public DateTime PeriodEnd { get; set; }

        [Column("total_hours")]
        public double TotalHours { get; set; }

        [Column("avg_hours_per_user")]
        public double AvgHoursPerUser { get; set; }
    }

    // -----------------------------
    // Analytics: Prayer Overview
    // -----------------------------
    [Table("analytics_prayer_overview", Schema = "public")]
    public class AnalyticsPrayerOverview
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("snapshot_at")]
        public DateTime SnapshotAt { get; set; }

        [Column("period_label")]
        public string PeriodLabel { get; set; } = string.Empty;

        [Column("total_requests")]
        public int TotalRequests { get; set; }

        [Column("open_requests")]
        public int OpenRequests { get; set; }

        [Column("closed_requests")]
        public int ClosedRequests { get; set; }

        [Column("testified_requests")]
        public int TestifiedRequests { get; set; }
    }
}
