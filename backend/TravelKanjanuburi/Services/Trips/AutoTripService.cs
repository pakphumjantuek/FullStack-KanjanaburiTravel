using TravelKanjanuburi.Helper;
using TravelKanjanuburi.Model.MTrips;

public sealed class AutoTripService
{
    private readonly ApplicationDbContext _db;
    private readonly RecommenderService _reco;

    // ถ้าโปรเจกต์ใช้แค่ไทย เราจะ treat เวลาเป็นเวลาไทยเสมอ
    private static readonly TimeZoneInfo _tz = ResolveThailandTimeZone();

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
        DateTime startUtc, // รับมาจาก API เหมือนเดิม แต่เราจะ treat เป็น "วันเริ่ม" เท่านั้น
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

        // ====================================================
        // ✅ เป้าหมาย: เก็บ "เวลาไทย" ตรง ๆ ไม่ใช้ UTC
        // - เอาวันเริ่มจาก input (จะมากี่ timezone ก็เอาแค่วัน)
        // - บังคับเริ่ม 08:00 (เวลาไทย)
        // ====================================================

        // แปลง input ไปเป็นเวลาไทยก่อน เพื่อเอา "วันที่" ของไทยที่ถูกต้อง
        // (ถ้า client ส่ง ISO Z มา จะเป็น UTC -> แปลงเป็นไทย)
        DateTime startBangkok = ConvertToBangkokTime(startUtc);

        var startLocalDate = startBangkok.Date;
        var startLocal = startLocalDate.AddHours(8); // ✅ 08:00 ไทย

        // ====================================================
        // 1) Reco candidates
        // ====================================================
        var topCandidates = await _reco.RecommendPersonalAsync(
            userId, 200, startLat, startLng, ct);

        var candidatePlaceIds = topCandidates
            .Select(x => x.PlaceId)
            .Distinct()
            .ToList();

        if (candidatePlaceIds.Count == 0)
            throw new InvalidOperationException("ไม่มีสถานที่ให้จัดทริป");

        // ====================================================
        // 2) Load Places + Tags + OpeningHours
        // ====================================================
        var places = await _db.Places.AsNoTracking()
            .Where(p => p.IsActive && candidatePlaceIds.Contains(p.PlaceId))
            .Include(p => p.PlaceTags)
                .ThenInclude(pt => pt.Tag)
            .Include(p => p.OpeningHours)
            .ToListAsync(ct);

        if (places.Count == 0)
            throw new InvalidOperationException("ไม่พบ Place ที่ใช้งานได้");

        var scoreMap = topCandidates
            .GroupBy(x => x.PlaceId)
            .ToDictionary(g => g.Key, g => g.Max(x => x.Score));

        // ====================================================
        // 3) Tag helpers
        // ====================================================
        var prefSet = pref.PreferredTagNames.ToHashSet(StringComparer.OrdinalIgnoreCase);

        bool HasPreferredTag(Place p)
        {
            if (prefSet.Count == 0) return false;
            return p.PlaceTags.Any(pt => prefSet.Contains(pt.Tag.TagName));
        }

        // ====================================================
        // 4) Split pool: TAG-FIRST
        // ====================================================
        var preferredPlaces = prefSet.Count == 0
            ? new List<Place>()
            : places.Where(HasPreferredTag).ToList();

        var otherPlaces = places
            .Except(preferredPlaces)
            .ToList();

        preferredPlaces = preferredPlaces
            .OrderByDescending(p => ComputeUtility(scoreMap.GetValueOrDefault(p.PlaceId), p, pref, 0))
            .ToList();

        otherPlaces = otherPlaces
            .OrderByDescending(p => ComputeUtility(scoreMap.GetValueOrDefault(p.PlaceId), p, pref, 0))
            .ToList();

        // ====================================================
        // 5) Trip init (เก็บ "เวลาไทย" เป็น Unspecified)
        // ====================================================
        var tripStartLocal = DateTime.SpecifyKind(startLocal, DateTimeKind.Unspecified);
        var lastDayStartLocal = startLocal.AddDays(days - 1);

        // ✅ จบตาม hoursPerDay (เช่น 6 ชม. -> 14:00)
        var tripEndLocal = DateTime.SpecifyKind(lastDayStartLocal.AddHours(hoursPerDay), DateTimeKind.Unspecified);

        var trip = new Trip
        {
            UserId = userId,
            Title = $"AutoTrip {days} วัน",
            StartDateTime = tripStartLocal, // ✅ ไทย 08:00
            EndDateTime = tripEndLocal,     // ✅ ไทย 08:00 (+days)
            StartLat = startLat,
            StartLng = startLng,
            Items = new List<TripItem>(),
            Segments = new List<TripSegment>()
        };

        int baseTarget = hoursPerDay >= 10 ? 6 : (hoursPerDay <= 6 ? 4 : 5);
        int shift = pref.RelaxedPace >= 0.75 ? -1 : (pref.RelaxedPace <= 0.25 ? 1 : 0);
        int targetPerDay = Math.Clamp(baseTarget + shift, 3, 7);

        if (pref.WithElderOrKids)
            targetPerDay = Math.Max(2, targetPerDay - 1);

        bool hasStart = startLat.HasValue && startLng.HasValue;
        var pickedGlobal = new HashSet<int>();

        // ====================================================
        // 6) Per day planning (เวลาไทย)
        // ====================================================
        for (int day = 1; day <= days; day++)
        {
            var dayStartLocal = startLocal.AddDays(day - 1);  // ✅ ไทย
            var dayEndLocal = dayStartLocal.AddHours(hoursPerDay);
            var cursorLocal = dayStartLocal;

            var dayPool = preferredPlaces
                .Concat(otherPlaces)
                .Where(p => !pickedGlobal.Contains(p.PlaceId))
                .ToList();

            if (dayPool.Count == 0) break;

            var picked = dayPool.Take(targetPerDay * 4).ToList();

            var ordered = new List<Place>();
            double curLat = startLat ?? 0;
            double curLng = startLng ?? 0;

            // --- greedy selection, ต้องอยู่ในเวลาเปิด-ปิดจริง
            while (picked.Count > 0 && ordered.Count < targetPerDay)
            {
                var best = picked
                    .Select(p =>
                    {
                        double distKm = hasStart
                            ? Geo.HaversineKm(curLat, curLng, p.Latitude, p.Longitude)
                            : 0;

                        int travelMin = EstimateTravelMinutes(distKm, transportMode);
                        int stayMin = GetStayMinutes(p, pref);

                        var proposedArrivalLocal = cursorLocal.AddMinutes(travelMin);

                        bool feasible = TryAdjustArrivalToOpening(
                            p,
                            proposedArrivalLocal,
                            stayMin,
                            dayEndLocal,
                            out var adjustedArrivalLocal,
                            out var adjustedLeaveLocal);

                        if (!feasible)
                            return new { Place = p, Utility = double.NegativeInfinity };

                        double util = ComputeUtility(
                            scoreMap.GetValueOrDefault(p.PlaceId),
                            p, pref, travelMin);

                        var waitMin = Math.Max(0, (adjustedArrivalLocal - proposedArrivalLocal).TotalMinutes);
                        util -= waitMin * 0.02;

                        return new { Place = p, Utility = util };
                    })
                    .OrderByDescending(x => x.Utility)
                    .FirstOrDefault();

                if (best == null || double.IsNegativeInfinity(best.Utility))
                    break;

                var next = best.Place;
                ordered.Add(next);
                picked.Remove(next);

                curLat = next.Latitude;
                curLng = next.Longitude;
            }

            // --- schedule จริง
            int orderIndex = 1;
            TripItem? prev = null;

            for (int i = 0; i < ordered.Count; i++)
            {
                var p = ordered[i];

                int travelMin = 0;
                double distKm = 0;

                if (prev != null)
                {
                    var prevPlace = ordered[i - 1];
                    distKm = Geo.HaversineKm(prevPlace.Latitude, prevPlace.Longitude, p.Latitude, p.Longitude);
                    travelMin = EstimateTravelMinutes(distKm, transportMode) + 10; // buffer
                }

                int stay = GetStayMinutes(p, pref);

                var proposedArrivalLocal = cursorLocal.AddMinutes(travelMin);

                if (!TryAdjustArrivalToOpening(p, proposedArrivalLocal, stay, dayEndLocal, out var arrivalLocal, out var leaveLocal))
                    continue;

                // ✅ เก็บเวลาไทย (Unspecified) ลง TripItem
                var plannedArrivalLocal = DateTime.SpecifyKind(arrivalLocal, DateTimeKind.Unspecified);

                var item = new TripItem
                {
                    DayIndex = day,
                    OrderIndex = orderIndex,
                    PlaceId = p.PlaceId,
                    PlannedArrivalTime = plannedArrivalLocal,
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
                cursorLocal = leaveLocal;
            }
        }

        if (trip.Items.Count == 0)
            throw new InvalidOperationException("จัดทริปไม่สำเร็จ (ติดเวลาทำการ/เวลาไม่พอ)");

        _db.Trips.Add(trip);
        await _db.SaveChangesAsync(ct);

        return trip;
    }

    // ----------------------------------------------------
    // OpeningHours
    // ----------------------------------------------------

    private static bool TryAdjustArrivalToOpening(
        Place place,
        DateTime proposedArrivalLocal,
        int stayMinutes,
        DateTime dayEndLocal,
        out DateTime arrivalLocal,
        out DateTime leaveLocal)
    {
        arrivalLocal = default;
        leaveLocal = default;

        if (!TryGetOpenWindowForDate(place, proposedArrivalLocal, out var openAt, out var closeAt))
            return false;

        arrivalLocal = proposedArrivalLocal < openAt ? openAt : proposedArrivalLocal;
        leaveLocal = arrivalLocal.AddMinutes(stayMinutes);

        if (leaveLocal > closeAt) return false;
        if (leaveLocal > dayEndLocal) return false;

        return true;
    }

    private static bool TryGetOpenWindowForDate(
        Place place,
        DateTime localDateTime,
        out DateTime openAt,
        out DateTime closeAt)
    {
        openAt = default;
        closeAt = default;

        if (place.OpeningHours == null || place.OpeningHours.Count == 0)
        {
            openAt = localDateTime.Date;
            closeAt = localDateTime.Date.AddDays(1);
            return true;
        }

        int dow = (int)localDateTime.DayOfWeek;

        var oh = place.OpeningHours.FirstOrDefault(x => x.DayOfWeek == dow);
        if (oh == null) return false;
        if (oh.IsClosed) return false;

        var open = oh.OpenTime.ToTimeSpan();
        var close = oh.CloseTime.ToTimeSpan();

        if (open == close)
        {
            openAt = localDateTime.Date;
            closeAt = localDateTime.Date.AddDays(1);
            return true;
        }

        openAt = localDateTime.Date + open;

        var rawClose = localDateTime.Date + close;
        closeAt = rawClose <= openAt ? rawClose.AddDays(1) : rawClose;

        return true;
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

        if (place.PriceRange.HasValue)
        {
            double price = place.PriceRange.Value;
            double wantCheap = 1.0 - pref.BudgetLevel;
            travelPenalty += Math.Max(0, (price - 3)) * wantCheap * 0.2;
        }

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

    private static int GetStayMinutes(Place p, AutoTripPreference pref)
    {
        int stay = p.AvgVisitMinutes is > 0 and <= 360 ? p.AvgVisitMinutes.Value : 60;

        if (pref.RelaxedPace >= 0.75) stay = Math.Min(180, stay + 15);
        if (pref.WithElderOrKids) stay = Math.Min(180, stay + 10);

        return stay;
    }

    // ----------------------------------------------------
    // Helpers
    // ----------------------------------------------------

    private static DateTime ConvertToBangkokTime(DateTime input)
    {
        if (input.Kind == DateTimeKind.Utc)
            return TimeZoneInfo.ConvertTimeFromUtc(input, _tz);

        if (input.Kind == DateTimeKind.Local)
            return TimeZoneInfo.ConvertTime(input, _tz);

        // Unspecified
        var assumedUtc = DateTime.SpecifyKind(input, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(assumedUtc, _tz);
    }

    private static TimeZoneInfo ResolveThailandTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); }
    }
}
