using System.Text.Json;
using TravelKanjanuburi.Dtos.BehaviorLog;
using TravelKanjanuburi.Helper;
using TravelKanjanuburi.ML;
using TravelKanjanuburi.Model.Log;

public sealed class RecommenderService
{
    private readonly ApplicationDbContext _db;
    private readonly IModelStore _store;
    private readonly IMapper _mapper;

    private const int CandidateSize = 800;
    private const int ExcludeDays = 7;
    private const int CandidateOverfetch = 200; // เผื่อกรอง exclude ใน memory

    public RecommenderService(ApplicationDbContext db, IModelStore store, IMapper mapper)
    {
        _db = db;
        _store = store;
        _mapper = mapper;
    }

    public async Task<List<PlaceRecommendDto>> RecommendPersonalAsync(
        int userId,
        int topN,
        double? lat,
        double? lng,
        CancellationToken ct)
    {
        if (userId <= 0) throw new ArgumentException("userId ไม่ถูกต้อง");
        if (topN is < 1 or > 50) topN = 20;

        var hasContext = lat.HasValue && lng.HasValue && ValidLatLng(lat.Value, lng.Value);
        var userLat = hasContext ? lat!.Value : 0;
        var userLng = hasContext ? lng!.Value : 0;

        // =========================
        // 1) Exclude: กันแนะนำซ้ำแบบ meaningful (7 วัน)
        // =========================
        var since = DateTime.UtcNow.AddDays(-ExcludeDays);

        var excludePlaceIds = await _db.BehaviorLogs.AsNoTracking()
            .Where(x =>
                x.UserId == userId &&
                x.PlaceId != null &&
                x.CreatedAt >= since &&
                (x.ActionType == BehaviorActionType.AddToTrip ||
                 x.ActionType == BehaviorActionType.Favorite ||
                 x.ActionType == BehaviorActionType.Review))
            .Select(x => x.PlaceId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var excludeSet = excludePlaceIds.ToHashSet();

        // =========================
        // 2) Candidates: เอาจาก popularity เพื่อ baseline ที่ดี + เร็ว
        // (ดึงมาเยอะกว่านิด แล้วค่อยกรอง exclude ใน memory)
        // =========================
        var rawCandidateIds = await _db.Places.AsNoTracking()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.PopularityScore)
            .Take(CandidateSize + CandidateOverfetch)
            .Select(p => p.PlaceId)
            .ToListAsync(ct);

        var candidateIds = rawCandidateIds
            .Where(id => !excludeSet.Contains(id))
            .Take(CandidateSize)
            .ToList();

        if (candidateIds.Count == 0) return new List<PlaceRecommendDto>();

        // =========================
        // 3) Seen: กันซ้ำเบา ๆ (อย่าตัด VIEW/CLICK)
        // =========================
        var seenIds = await _db.BehaviorLogs.AsNoTracking()
            .Where(b =>
                b.UserId == userId &&
                b.PlaceId != null &&
                (b.ActionType == BehaviorActionType.AddToTrip ||
                 b.ActionType == BehaviorActionType.Favorite ||
                 b.ActionType == BehaviorActionType.Review))
            .Select(b => b.PlaceId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var seenSet = seenIds.ToHashSet();

        var unseenIds = candidateIds.Where(id => !seenSet.Contains(id)).ToList();
        if (unseenIds.Count == 0)
        {
            // ถ้าไม่เหลือ unseen เลย ให้คืน top popularity (ไม่ให้ว่าง)
            unseenIds = candidateIds.Take(topN).ToList();
        }

        // =========================
        // 4) ML scoring (ถ้า model พร้อม)
        // =========================
        Dictionary<int, double>? mlScores = null;

        if (_store.ModelExists)
        {
            try
            {
                var engine = _store.CreateEngine(); // ✅ ไม่ใช้ using
                mlScores = new Dictionary<int, double>(capacity: unseenIds.Count);

                foreach (var pid in unseenIds)
                {
                    var pred = engine.Predict(new InteractionRow
                    {
                        UserId = (uint)userId,
                        PlaceId = (uint)pid,
                        Label = 0f
                    });

                    var s = pred?.Score ?? 0f;
                    mlScores[pid] = Finite(s, 0); // กัน NaN/Infinity
                }
            }
            catch
            {
                // model ยังไม่พร้อม → fallback (ml = 0)
                mlScores = null;
            }
        }

        double mlMin = 0, mlMax = 0;
        if (mlScores is { Count: > 0 })
        {
            mlMin = mlScores.Values.Min();
            mlMax = mlScores.Values.Max();
        }

        var hasModel = mlScores is { Count: > 0 } && _store.ModelExists;

        // =========================
        // 5) โหลดรายละเอียดสถานที่ (Include ให้ map DTO ครบ)
        // =========================
        var places = await _db.Places.AsNoTracking()
            .Where(p => unseenIds.Contains(p.PlaceId))
            .Include(p => p.PlaceCategory)
            .Include(p => p.PlaceTags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Images)
            .ToListAsync(ct);

        var dtos = _mapper.Map<List<PlaceRecommendDto>>(places);

        // =========================
        // 6) Hybrid scoring + sanitize (กัน JSON 500)
        // =========================
        foreach (var dto in dtos)
        {
            // กัน lat/lng พังจาก DB
            if (!ValidLatLng(dto.Latitude, dto.Longitude))
            {
                dto.Latitude = 0;
                dto.Longitude = 0;
            }

            var pop = NormalizePopularity(dto.PopularityScore); // 0..1
            var dist = hasContext
                ? NormalizeDistance(userLat, userLng, dto.Latitude, dto.Longitude)
                : 0.0;

            var ml = 0.0;
            if (mlScores != null && mlScores.TryGetValue(dto.PlaceId, out var raw))
                ml = Normalize01(raw, mlMin, mlMax);

            // sanitize ทุกตัวก่อนใช้/ก่อนส่งออก
            pop = Finite(pop, 0);
            dist = Finite(dist, 0);
            ml = Finite(ml, 0);

            // ✅ ถ้ามี model -> เน้น ML, ถ้าไม่มี -> เน้น pop+dist
            var final = hasModel
                ? (0.70 * ml + 0.20 * pop + 0.10 * dist)
                : (0.55 * pop + 0.45 * dist);

            dto.Score = Finite(final, 0);

            dto.ReasonJson = JsonSerializer.Serialize(new
            {
                hasModel,
                mlScore = Math.Round(ml, 4),
                popularity = Math.Round(pop, 4),
                distance = Math.Round(dist, 4),
                hasContext
            });
        }

        // =========================
        // 7) sort + take
        // =========================
        return dtos
            .OrderByDescending(x => x.Score)
            .Take(topN)
            .ToList();
    }

    // =========================================================
    // Helpers
    // =========================================================

    private static double NormalizePopularity(double popularityScore)
    {
        // สมมติ popularity 0..100
        var v = popularityScore / 100.0;
        if (v > 1) v = 1;
        if (v < 0) v = 0;
        return v;
    }

    private static double NormalizeDistance(double userLat, double userLng, double placeLat, double placeLng)
    {
        if (!ValidLatLng(userLat, userLng)) return 0;
        if (!ValidLatLng(placeLat, placeLng)) return 0;

        var km = Geo.HaversineKm(userLat, userLng, placeLat, placeLng);

        if (double.IsNaN(km) || double.IsInfinity(km) || km < 0)
            return 0;

        // km=0 => 1, ไม่มี Infinity
        return 1.0 / (1.0 + km);
    }

    private static bool ValidLatLng(double lat, double lng)
        => !double.IsNaN(lat) && !double.IsNaN(lng)
           && !double.IsInfinity(lat) && !double.IsInfinity(lng)
           && lat >= -90 && lat <= 90
           && lng >= -180 && lng <= 180;

    private static double Normalize01(double v, double min, double max)
    {
        // ถ้าเท่ากันหมด
        if (max <= min) return 0.5;

        var x = (v - min) / (max - min);
        if (double.IsNaN(x) || double.IsInfinity(x)) return 0.5;

        if (x < 0) x = 0;
        if (x > 1) x = 1;
        return x;
    }

    private static double Finite(double v, double fallback = 0)
        => (double.IsNaN(v) || double.IsInfinity(v)) ? fallback : v;

    private static double Finite(float v, double fallback = 0)
        => (float.IsNaN(v) || float.IsInfinity(v)) ? fallback : v;
}
