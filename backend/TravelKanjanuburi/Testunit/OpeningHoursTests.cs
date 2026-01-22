using FluentAssertions;
using TravelKanjanuburi.Model.MPlaces;
using TravelKanjanuburi.Services.AutoTrip;
using Xunit;

public class OpeningHoursLogicTests
{
    private static List<OpeningHour> Hours(int dow, TimeOnly open, TimeOnly close, bool isClosed = false)
        => new()
        {
            new OpeningHour
            {
                DayOfWeek = dow,
                OpenTime = open,
                CloseTime = close,
                IsClosed = isClosed
            }
        };

    [Fact]
    public void OpenEqualsClose_ShouldBe24Hours()
    {
        // Monday
        var hours = Hours(dow: (int)DayOfWeek.Monday, open: new TimeOnly(0, 0), close: new TimeOnly(0, 0));
        var dt = new DateTime(2026, 1, 5, 10, 0, 0); // 2026-01-05 = Monday

        var ok = OpeningHoursLogic.TryGetOpenWindowForDate(hours, dt, out var openAt, out var closeAt);

        ok.Should().BeTrue();
        openAt.Should().Be(new DateTime(2026, 1, 5, 0, 0, 0));
        closeAt.Should().Be(new DateTime(2026, 1, 6, 0, 0, 0));
    }

    [Fact]
    public void CloseAfterMidnight_ShouldAddOneDay()
    {
        // Monday 18:00 -> 02:00 (cross midnight)
        var hours = Hours((int)DayOfWeek.Monday, new TimeOnly(18, 0), new TimeOnly(2, 0));
        var dt = new DateTime(2026, 1, 5, 19, 0, 0);

        var ok = OpeningHoursLogic.TryGetOpenWindowForDate(hours, dt, out var openAt, out var closeAt);

        ok.Should().BeTrue();
        openAt.Should().Be(new DateTime(2026, 1, 5, 18, 0, 0));
        closeAt.Should().Be(new DateTime(2026, 1, 6, 2, 0, 0));
    }

    [Fact]
    public void BeforeOpen_ShouldWaitUntilOpen()
    {
        var hours = Hours((int)DayOfWeek.Monday, new TimeOnly(9, 0), new TimeOnly(18, 0));
        var proposed = new DateTime(2026, 1, 5, 8, 0, 0);
        var dayEnd = new DateTime(2026, 1, 5, 20, 0, 0);

        var ok = OpeningHoursLogic.TryAdjustArrivalToOpening(hours, proposed, stayMinutes: 60, dayEnd,
            out var arrival, out var leave);

        ok.Should().BeTrue();
        arrival.Should().Be(new DateTime(2026, 1, 5, 9, 0, 0));
        leave.Should().Be(new DateTime(2026, 1, 5, 10, 0, 0));
    }

    [Fact]
    public void LeaveAfterClose_ShouldBeFalse()
    {
        var hours = Hours((int)DayOfWeek.Monday, new TimeOnly(9, 0), new TimeOnly(10, 0));
        var proposed = new DateTime(2026, 1, 5, 9, 30, 0);
        var dayEnd = new DateTime(2026, 1, 5, 20, 0, 0);

        var ok = OpeningHoursLogic.TryAdjustArrivalToOpening(hours, proposed, stayMinutes: 60, dayEnd,
            out _, out _);

        ok.Should().BeFalse();
    }

    [Fact]
    public void IsClosed_ShouldBeFalse()
    {
        var hours = Hours((int)DayOfWeek.Monday, new TimeOnly(9, 0), new TimeOnly(18, 0), isClosed: true);
        var dt = new DateTime(2026, 1, 5, 12, 0, 0);

        var ok = OpeningHoursLogic.TryGetOpenWindowForDate(hours, dt, out _, out _);

        ok.Should().BeFalse();
    }

    [Fact]
    public void NoOpeningHours_ShouldOpenAllDay()
    {
        var dt = new DateTime(2026, 1, 5, 12, 0, 0);

        var ok = OpeningHoursLogic.TryGetOpenWindowForDate(openingHours: null, dt, out var openAt, out var closeAt);

        ok.Should().BeTrue();
        openAt.Should().Be(dt.Date);
        closeAt.Should().Be(dt.Date.AddDays(1));
    }
}
