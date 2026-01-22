using TravelKanjanuburi.Model.MPlaces;

namespace TravelKanjanuburi.Services.AutoTrip;

internal static class OpeningHoursLogic
{
    internal static bool TryAdjustArrivalToOpening(
        List<OpeningHour>? openingHours,
        DateTime proposedArrivalLocal,
        int stayMinutes,
        DateTime dayEndLocal,
        out DateTime arrivalLocal,
        out DateTime leaveLocal)
    {
        arrivalLocal = default;
        leaveLocal = default;

        if (!TryGetOpenWindowForDate(openingHours, proposedArrivalLocal, out var openAt, out var closeAt))
            return false;

        arrivalLocal = proposedArrivalLocal < openAt ? openAt : proposedArrivalLocal;
        leaveLocal = arrivalLocal.AddMinutes(stayMinutes);

        if (leaveLocal > closeAt) return false;
        if (leaveLocal > dayEndLocal) return false;

        return true;
    }

    internal static bool TryGetOpenWindowForDate(
        List<OpeningHour>? openingHours,
        DateTime localDateTime,
        out DateTime openAt,
        out DateTime closeAt)
    {
        openAt = default;
        closeAt = default;

        // ไม่มี opening hours -> เปิดทั้งวัน
        if (openingHours == null || openingHours.Count == 0)
        {
            openAt = localDateTime.Date;
            closeAt = localDateTime.Date.AddDays(1);
            return true;
        }

        int dow = (int)localDateTime.DayOfWeek; // 0=Sunday..6=Saturday

        var oh = openingHours.FirstOrDefault(x => x.DayOfWeek == dow);
        if (oh == null) return false;
        if (oh.IsClosed) return false;

        // open==close -> 24 hours
        if (oh.OpenTime == oh.CloseTime)
        {
            openAt = localDateTime.Date;
            closeAt = localDateTime.Date.AddDays(1);
            return true;
        }

        openAt = localDateTime.Date + oh.OpenTime.ToTimeSpan();

        var rawClose = localDateTime.Date + oh.CloseTime.ToTimeSpan();
        closeAt = rawClose <= openAt ? rawClose.AddDays(1) : rawClose;

        return true;
    }
}
