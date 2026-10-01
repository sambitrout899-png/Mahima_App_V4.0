using Mahima.Api.v3.clean.Models;

namespace Mahima.Api.v3.clean.Tests;

public sealed class AttendanceDaysTests
{
    [Fact]
    public void AugustDuplicateDoesNotInflateOverviewOrPayroll()
    {
        var rows = Enumerable.Range(1, 31).Select(day => new AttendanceRecord
        {
            Id = day, UserId = "rupesh", Date = new DateTime(2026, 8, day),
            Status = day <= 27 ? "Present" : "Absent"
        }).ToList();
        rows.Add(new AttendanceRecord { Id = 32, UserId = "rupesh", Date = new DateTime(2026, 8, 1, 12, 0, 0), Status = "Present" });

        var result = AttendanceDays.Canonical(rows);

        Assert.Equal(31, result.Count);
        Assert.Equal(27, result.Count(a => a.Status == "Present"));
        Assert.Equal(4, result.Count(a => a.Status == "Absent"));
    }

    [Fact]
    public void LatestMarkWinsEvenWhenStatusesConflictAndInputOrderChanges()
    {
        var rows = new[]
        {
            new AttendanceRecord { Id = 9, UserId = " Staff ", Date = new DateTime(2026, 8, 1), Status = "Absent" },
            new AttendanceRecord { Id = 2, UserId = "staff", Date = new DateTime(2026, 8, 1, 18, 0, 0), Status = "Present" }
        };
        Assert.Equal("Absent", Assert.Single(AttendanceDays.Canonical(rows)).Status);
        Assert.Equal(9, Assert.Single(AttendanceDays.Canonical(rows.Reverse())).Id);
    }

    [Fact]
    public void DifferentPeopleAndDatesRemainSeparate()
    {
        var rows = new[]
        {
            new AttendanceRecord { Id = 1, UserId = "a", Date = new DateTime(2026, 8, 1) },
            new AttendanceRecord { Id = 2, UserId = "b", Date = new DateTime(2026, 8, 1) },
            new AttendanceRecord { Id = 3, UserId = "a", Date = new DateTime(2026, 8, 2) }
        };
        Assert.Equal(3, AttendanceDays.Canonical(rows).Count);
        Assert.Empty(AttendanceDays.Canonical(Array.Empty<AttendanceRecord>()));
    }
}
