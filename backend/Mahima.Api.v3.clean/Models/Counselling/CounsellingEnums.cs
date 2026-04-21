// Models/Counselling/CounsellingEnums.cs
using System;

namespace Mahima.Api.v3.clean.Models.Counselling
{
    public enum CounsellingCaseStatus
    {
        New = 0,
        Scheduled = 1,
        Completed = 2,
        Escalated = 3,
        Cancelled = 4,
        NoShow = 5
    }

    public enum CounsellingSessionType
    {
        InitialCounselling = 0,
        LayHandsSession = 1,
        SeniorPastorSession = 2
    }

    public enum CounsellingSessionStatus
    {
        Requested = 0,
        Scheduled = 1,
        Completed = 2,
        Cancelled = 3
    }

    public enum CounsellingOutcome
    {
        None = 0,
        Resolved = 1,
        NeedsFurtherPrayer = 2,
        EscalateToSeniorPastor = 3
    }
}
