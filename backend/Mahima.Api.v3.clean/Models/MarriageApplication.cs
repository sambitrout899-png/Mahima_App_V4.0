using System;

namespace Mahima.Api.v3.clean.Models.Marriage
{
    // You can extend with more statuses later
    public static class MarriageApplicationStatuses
    {
        public const string PendingReview = "PendingReview";
        public const string Approved      = "Approved";
        public const string Scheduled     = "Scheduled";
        public const string Completed     = "Completed";
        public const string Rejected      = "Rejected";
    }

    public class MarriageApplication
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");

        // Couple details
        public string GroomFullName { get; set; } = null!;
        public string BrideFullName { get; set; } = null!;
        public string? GroomPhone { get; set; }
        public string? BridePhone { get; set; }
        public string? GroomEmail { get; set; }
        public string? BrideEmail { get; set; }
        public string? Address { get; set; }

        public bool GroomIsMember { get; set; }
        public bool BrideIsMember { get; set; }
        public string? GroomMemberId { get; set; }
        public string? BrideMemberId { get; set; }

        // Preferences / ceremony details
        public DateTime? PreferredDate { get; set; }          // stored as UTC
        public string? PreferredService { get; set; }         // e.g. "Morning", "Evening"
        public DateTime? ScheduledAt { get; set; }            // final wedding datetime (UTC)
        public string? CeremonyLocation { get; set; }

        // Workflow
        public string Status { get; set; } =
            MarriageApplicationStatuses.PendingReview;        // string status for flexibility

        public string? Token { get; set; }                    // printable token (<= 50 chars)
        public string? Notes { get; set; }                    // internal notes

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public DateTime? ApprovedAt { get; set; }
        public string? ApprovedByUserId { get; set; }         // store as string for simplicity
        public DateTime? CompletedAt { get; set; }
    }
}
