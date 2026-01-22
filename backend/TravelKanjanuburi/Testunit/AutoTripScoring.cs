
namespace TravelKanjanuburi.Services.AutoTrip;

internal static class AutoTripScoring
{
    internal static double ComputeUtility(
        double recoScore,
        Place place,
        AutoTripService.AutoTripPreference pref,
        int travelMinutes)
    {
        double tagBonus = place.PlaceTags
            .Count(pt => pref.PreferredTagNames
                .Contains(pt.Tag.TagName, StringComparer.OrdinalIgnoreCase)) * 0.4;

        double travelPenalty = travelMinutes * (0.012 - pref.RelaxedPace * 0.006);

        if (place.PriceRange.HasValue)
        {
            double price = place.PriceRange.Value;
            double wantCheap = 1.0 - pref.BudgetLevel;
            travelPenalty += Math.Max(0, (price - 3)) * wantCheap * 0.2;
        }

        return recoScore + tagBonus - travelPenalty;
    }

    internal static int EstimateTravelMinutes(double km, string mode)
    {
        double speed = mode switch
        {
            "walking" => 4.5,
            "cycling" => 15.0,
            _ => 40.0
        };
        return (int)Math.Round((km / speed) * 60.0);
    }

    internal static int GetStayMinutes(Place p, AutoTripService.AutoTripPreference pref)
    {
        int stay = p.AvgVisitMinutes is > 0 and <= 360 ? p.AvgVisitMinutes.Value : 60;

        if (pref.RelaxedPace >= 0.75) stay = Math.Min(180, stay + 15);
        if (pref.WithElderOrKids) stay = Math.Min(180, stay + 10);

        return stay;
    }
}
