using System;

namespace Mahima.Api.v3.clean.Dtos
{
    public class CreateCounsellingRequestDto
    {
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string Phone { get; set; } = null!;

        public bool IsChurchMember { get; set; }
        public string? MemberId { get; set; }

        public string IssueCategory { get; set; } = null!;
        public string? Description { get; set; }
    }

    public class CounsellingSessionSummaryDto
    {
        // NOTE: Guid, to match your entity Id
        public Guid SessionId { get; set; }

        public string CandidateName { get; set; } = null!;
        public string IssueCategory { get; set; } = null!;
        public string SessionType { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateTime? ScheduledAt { get; set; }
        public string? TokenNumber { get; set; }
    }

    public class ScheduleSessionDto
    {
        public DateTime ScheduledAt { get; set; }
        public string Location { get; set; } = null!;
        public string? CounselorId { get; set; }
    }

    public class CompleteSessionDto
    {
        // "Resolved" | "NeedsFurtherPrayer" | "EscalateToSeniorPastor"
        public string Outcome { get; set; } = null!;
        public string? Notes { get; set; }

        public DateTime? NextScheduledAt { get; set; }
        public string? NextLocation { get; set; }
    }
}
