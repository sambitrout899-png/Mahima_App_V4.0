using Mahima.Api.v3.clean.Services;
using Xunit;

public class UserActivityHistoryTests
{
    [Fact]
    public void PeriodsUseIndiaMidnightMondayAndPreviousCalendarMonth()
    {
        var now = new DateTime(2026, 9, 7, 20, 0, 0, DateTimeKind.Utc); // Tuesday in India
        var periods = UserActivityHistory.Periods(now).ToDictionary(p => p.Key);
        Assert.Equal(new DateTime(2026, 9, 7, 18, 30, 0, DateTimeKind.Utc), periods["today"].Start);
        Assert.Equal(new DateTime(2026, 9, 6, 18, 30, 0, DateTimeKind.Utc), periods["thisWeek"].Start);
        Assert.Equal(periods["thisWeek"].Start, periods["lastWeek"].End);
        Assert.Equal(new DateTime(2026, 7, 31, 18, 30, 0, DateTimeKind.Utc), periods["lastMonth"].Start);
        Assert.Equal(periods["thisMonth"].Start, periods["lastMonth"].End);
    }

    [Fact]
    public void ActiveTimeClipsBoundariesAndMergesOverlappingDevices()
    {
        var start = new DateTime(2026, 9, 8, 0, 0, 0, DateTimeKind.Utc);
        var period = new UserActivityHistory.Period("test", "Test", start, start.AddMinutes(10));
        var user = Guid.NewGuid();
        var intervals = new[] {
            new UserActivityHistory.Interval(user, start.AddMinutes(-1), start.AddMinutes(2)),
            new UserActivityHistory.Interval(user, start.AddMinutes(1), start.AddMinutes(4)),
            new UserActivityHistory.Interval(user, start.AddMinutes(8), start.AddMinutes(12)),
            new UserActivityHistory.Interval(user, start.AddMinutes(5), start.AddMinutes(5))
        };
        Assert.Equal(360, UserActivityHistory.ActiveSeconds(intervals, period));
        Assert.Equal(0, UserActivityHistory.ActiveSeconds(Array.Empty<UserActivityHistory.Interval>(), period));
    }

    [Fact]
    public void PreviousMonthHandlesYearBoundaryAndLeapYear()
    {
        var january = UserActivityHistory.Periods(new DateTime(2027, 1, 1, 12, 0, 0, DateTimeKind.Utc));
        Assert.Equal(new DateTime(2026, 11, 30, 18, 30, 0, DateTimeKind.Utc), january.Single(p => p.Key == "lastMonth").Start);
        var february = UserActivityHistory.Periods(new DateTime(2024, 3, 5, 12, 0, 0, DateTimeKind.Utc)).Single(p => p.Key == "lastMonth");
        Assert.Equal(29, (february.End - february.Start).TotalDays);
    }
}
