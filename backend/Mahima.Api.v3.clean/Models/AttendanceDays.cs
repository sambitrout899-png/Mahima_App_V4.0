using System;
using System.Collections.Generic;
using System.Linq;

namespace Mahima.Api.v3.clean.Models;

public static class AttendanceDays
{
    // Legacy rows can contain multiple marks (and times) for the same day.
    // Id is the only available ordering metadata; the latest inserted mark wins.
    public static List<AttendanceRecord> Canonical(IEnumerable<AttendanceRecord> records) => records
        .GroupBy(a => (UserId: a.UserId.Trim().ToLowerInvariant(), Day: a.Date.Date))
        .Select(g => g.OrderByDescending(a => a.Id).First())
        .OrderByDescending(a => a.Date.Date)
        .ThenByDescending(a => a.Id)
        .ToList();
}
