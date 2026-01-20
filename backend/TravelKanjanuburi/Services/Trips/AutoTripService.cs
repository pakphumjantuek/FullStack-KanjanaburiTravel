using Microsoft.EntityFrameworkCore;
using TravelKanjanuburi.Helper;
using TravelKanjanuburi.Model.MTrips;
using TravelKanjanuburi.Model.MPlaces;

public sealed class AutoTripService
{
    private readonly ApplicationDbContext _db;
    private readonly RecommenderService _reco;

    public AutoTripService(ApplicationDbContext db, RecommenderService reco)
    {
        _db = db;
        _reco = reco;
    }

    public sealed class AutoTripPreference
    {
        public List<string> PreferredTagNames { get; init; } = new();
        public double RelaxedPace { get; init; } = 0.5;
        public double BudgetLevel { get; init; } = 0.5;
        public bool WithElderOrKids { get; init; } = false;
    }

    public async Task<Trip> GenerateAsync(
        int userId,
        DateTime startUtc,
        int days,
        int hoursPerDay,
        double? startLat,
        double? startLng,
        string transportMode,
        AutoTripPreference? pref,
        CancellationToken ct)
    {
        pref ??= new AutoTripPreference();

        if (days is < 1 or > 7) days = 1;
        if (hoursPerDay is < 4 or > 14) hoursPerDay = 8;
        transportMode = string.IsNullOrWhiteSpace(transportMode) ? "driving" : transportMode;

        // ----------------------------------------------------
        // 1) Reco candidates
        // ----------------------------------------------------
        var topCandidates = await _reco.RecommendPersonalAsync(
            userId, 200, startLat, startLng, ct);

        var candidatePlaceIds = topCandidates
            .Select(x => x.PlaceId)
            .Distinct()
            .ToList();

        if (candidatePlaceIds.Count == 0)
            throw new InvalidOperationException("ไม่มีสถานที่ให้จัดทริป");

        // ----------------------------------------------------
        // 2) Load Places + Tags
        // ----------------------------------------------------
        var places = await _db.Places.AsNoTracking()
            .Where(p => p.IsActive && candidatePlaceIds.Contains(p.PlaceId))
            .Include(p => p.PlaceTags)
                .ThenInclude(pt => pt.Tag)
            .ToListAsync(ct);

        if (places.Count == 0)
            throw new InvalidOperationException("ไม่พบ Place ที่ใช้งานได้");

        var scoreMap = topCandidates
            .GroupBy(x => x.PlaceId)
            .ToDictionary(g => g.Key, g => g.Max(x => x.Score));

        // ----------------------------------------------------
        // 3) Tag helpers
        // ----------------------------------------------------
        var prefSet = pref.PreferredTagNames
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        bool HasPreferredTag(Place p)
        {
            if (prefSet.Count == 0) return false;
            return p.PlaceTags.Any(pt => prefSet.Contains(pt.Tag.TagName));
        }

        // ----------------------------------------------------
        // 4) Split pool: TAG-FIRST ⭐⭐⭐
        // ----------------------------------------------------
        var preferredPlaces = prefSet.Count == 0
            ? new List<Place>()
            : places.Where(HasPreferredTag).ToList();

        var otherPlaces = places
            .Except(preferredPlaces)
            .ToList();

        // เรียงภายในแต่ละกลุ่มด้วย utility
        preferredPlaces = preferredPlaces
            .OrderByDescending(p => ComputeUtility(
                scoreMap.GetValueOrDefault(p.PlaceId),
                p, pref, 0))
            .ToList();

        otherPlaces = otherPlaces
            .OrderByDescending(p => ComputeUtility(
                scoreMap.GetValueOrDefault(p.PlaceId),
                p, pref, 0))
            .ToList();

        // ----------------------------------------------------
        // 5) Trip init
        // ----------------------------------------------------
        var trip = new Trip
        {
            UserId = userId,
            Title = $"AutoTrip {days} วัน",
            StartDateTime = startUtc,
            EndDateTime = startUtc.AddDays(days),
            StartLat = startLat,
            StartLng = startLng,
            Items = new List<TripItem>(),
            Segments = new List<TripSegment>()
        };

        int baseTarget = hoursPerDay >= 10 ? 6 : (hoursPerDay <= 6 ? 4 : 5);
        int shift = pref.RelaxedPace >= 0.75 ? -1 : (pref.RelaxedPace <= 0.25 ? 1 : 0);
        int targetPerDay = Math.Clamp(baseTarget + shift, 3, 7);

        bool hasStart = startLat.HasValue && startLng.HasValue;
        var pickedGlobal = new HashSet<int>();

        // ----------------------------------------------------
        // 6) Per day planning
        // ----------------------------------------------------
        for (int day = 1; day <= days; day++)
        {
            var dayStart = startUtc.AddDays(day - 1);
            var dayEnd = dayStart.AddHours(hoursPerDay);
            var cursor = dayStart;

            var dayPool = preferredPlaces
                .Concat(otherPlaces)
                .Where(p => !pickedGlobal.Contains(p.PlaceId))
                .ToList();

            if (dayPool.Count == 0) break;

            var picked = dayPool.Take(targetPerDay * 3).ToList();

            var ordered = new List<Place>();
            double curLat = startLat ?? 0;
            double curLng = startLng ?? 0;

            while (picked.Count > 0 && ordered.Count < targetPerDay)
            {
                var next = picked
                    .Select(p =>
                    {
                        double distKm = hasStart
                            ? Geo.HaversineKm(curLat, curLng, p.Latitude, p.Longitude)
                            : 0;

                        int travelMin = EstimateTravelMinutes(distKm, transportMode);
                        double util = ComputeUtility(
                            scoreMap.GetValueOrDefault(p.PlaceId),
                            p, pref, travelMin);

                        return new { Place = p, Utility = util };
                    })
                    .OrderByDescending(x => x.Utility)
                    .First()
                    .Place;

                ordered.Add(next);
                picked.Remove(next);
                curLat = next.Latitude;
                curLng = next.Longitude;
            }

            // schedule
            int orderIndex = 1;
            TripItem? prev = null;

            foreach (var p in ordered)
            {
                int travelMin = 0;
                double distKm = 0;

                if (prev != null)
                {
                    var prevPlace = ordered[orderIndex - 2];
                    distKm = Geo.HaversineKm(
                        prevPlace.Latitude, prevPlace.Longitude,
                        p.Latitude, p.Longitude);
                    travelMin = EstimateTravelMinutes(distKm, transportMode) + 10;
                }

                var arrival = cursor.AddMinutes(travelMin);
                int stay = p.AvgVisitMinutes is > 0 and <= 360 ? p.AvgVisitMinutes.Value : 60;
                var leave = arrival.AddMinutes(stay);

                if (leave > dayEnd) break;

                var item = new TripItem
                {
                    DayIndex = day,
                    OrderIndex = orderIndex,
                    PlaceId = p.PlaceId,
                    PlannedArrivalTime = arrival,
                    PlannedDurationMinutes = stay
                };

                trip.Items.Add(item);

                if (prev != null)
                {
                    trip.Segments.Add(new TripSegment
                    {
                        FromTripItem = prev,
                        ToTripItem = item,
                        DistanceKm = distKm,
                        TravelMinutes = travelMin,
                        TransportMode = transportMode
                    });
                }

                pickedGlobal.Add(p.PlaceId);
                prev = item;
                orderIndex++;
                cursor = leave;
            }
        }

        if (trip.Items.Count == 0)
            throw new InvalidOperationException("จัดทริปไม่สำเร็จ");

        _db.Trips.Add(trip);
        await _db.SaveChangesAsync(ct);

        return trip;
    }

    // ----------------------------------------------------
    // Utility / scoring
    // ----------------------------------------------------
    private static double ComputeUtility(
        double recoScore,
        Place place,
        AutoTripPreference pref,
        int travelMinutes)
    {
        double tagBonus = place.PlaceTags
            .Count(pt => pref.PreferredTagNames
                .Contains(pt.Tag.TagName, StringComparer.OrdinalIgnoreCase)) * 0.4;

        double travelPenalty = travelMinutes * (0.012 - pref.RelaxedPace * 0.006);

        return recoScore + tagBonus - travelPenalty;
    }

    private static int EstimateTravelMinutes(double km, string mode)
    {
        double speed = mode switch
        {
            "walking" => 4.5,
            "cycling" => 15.0,
            _ => 40.0
        };
        return (int)Math.Round((km / speed) * 60.0);
    }
}
