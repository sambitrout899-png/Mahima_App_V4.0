// Models/Counselling/CounsellingSession.cs
using System;

namespace Mahima.Api.v3.clean.Models.Counselling
{
    public class CounsellingSession
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid CaseId { get; set; }
        public CounsellingCase Case { get; set; } = default!;

        public CounsellingSessionType SessionType { get; set; }
        public CounsellingSessionStatus Status { get; set; } = CounsellingSessionStatus.Requested;

        public DateTime? ScheduledAt { get; set; }
        public string? Location { get; set; }

        public Guid? CounselorId { get; set; }    // link to your Users table if needed
        public string? TokenNumber { get; set; }
        public string? TokenPdfUrl { get; set; }

        public CounsellingOutcome Outcome { get; set; } = CounsellingOutcome.None;
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }
}
