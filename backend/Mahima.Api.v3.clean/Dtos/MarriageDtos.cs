using System;

namespace Mahima.Api.v3.clean.Dtos
{
    public class CreateMarriageApplicationDto
    {
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

        public DateTime? PreferredDate { get; set; }
        public string? PreferredService { get; set; }
    }

    public class MarriageApplicationSummaryDto
    {
        public Guid Id { get; set; }
        public string GroomFullName { get; set; } = null!;
        public string BrideFullName { get; set; } = null!;
        public string? GroomPhone { get; set; }
        public string? BridePhone { get; set; }
        public string? GroomEmail { get; set; }
        public string? BrideEmail { get; set; }
        public string? IssueSummary { get; set; }    // free text for later if needed

        public string Status { get; set; } = null!;
        public DateTime? PreferredDate { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public string? CeremonyLocation { get; set; }
        public string? Token { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ApproveMarriageDto
    {
        public string? Notes { get; set; }
    }

    public class ScheduleMarriageDto
    {
        public DateTime ScheduledAt { get; set; }
        public string CeremonyLocation { get; set; } = null!;
    }

    public class CompleteMarriageDto
    {
        public string? Notes { get; set; }
    }
}
