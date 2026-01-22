using Microsoft.EntityFrameworkCore;
using TravelKanjanuburi.ML;
using TravelKanjanuburi.Model.Log;

public sealed class ModelProbeService
{
    private readonly ApplicationDbContext _db;
    private readonly IModelStore _store;

    public ModelProbeService(ApplicationDbContext db, IModelStore store)
    {
        _db = db;
        _store = store;
    }

    public async Task<object> ProbeAsync(
        int userId,
        int topN,
        bool unseenOnly,
        CancellationToken ct)
    {
        if (!_store.ModelExists)
            return new
            {
                ok = false,
                message = "Model ยังไม่พร้อม (ไม่พบไฟล์โมเดล)",
                modelPath = _store.ModelPath
            };

        if (topN is < 1 or > 100) topN = 10;

        HashSet<int>? seen = null;
        if (unseenOnly)
        {
            var seenIds = await _db.BehaviorLogs.AsNoTracking()
                 .Where(b => b.UserId == userId && b.PlaceId != null &&
                             (b.ActionType == BehaviorActionType.AddToTrip ||
                              b.ActionType == BehaviorActionType.Favorite ||
                              b.ActionType == BehaviorActionType.Review))
                 .Select(b => b.PlaceId!.Value)
                 .Distinct()
                 .ToListAsync(ct);

                    seen = seenIds.ToHashSet();
        }

        var placesQ = _db.Places.AsNoTracking()
            .Where(p => p.IsActive);

        if (seen != null && seen.Count > 0)
            placesQ = placesQ.Where(p => !seen.Contains(p.PlaceId));

        var places = await placesQ
            .Select(p => new { p.PlaceId, p.Name, p.PopularityScore })
            .ToListAsync(ct);

        using var engine = _store.CreateEngine();

        var scored = new List<(int id, string name, float score, double pop)>(places.Count);
        foreach (var p in places)
        {
            var pred = engine.Predict(new InteractionRow
            {
                UserId = (uint)userId,
                PlaceId = (uint)p.PlaceId,
                Label = 0f
            });

            var s = pred?.Score ?? 0f;
            if (float.IsNaN(s) || float.IsInfinity(s)) s = 0f;

            scored.Add((p.PlaceId, p.Name ?? $"#{p.PlaceId}", s, p.PopularityScore));
        }

        var topMl = scored
            .OrderByDescending(x => x.score)
            .Take(topN)
            .Select(x => new
            {
                placeId = x.id,
                name = x.name,
                mlScore = x.score,
                popularityScore = x.pop
            })
            .ToList();

        var topPopularity = places
            .OrderByDescending(x => x.PopularityScore)
            .Take(topN)
            .Select(x => new
            {
                placeId = x.PlaceId,
                name = x.Name,
                popularityScore = x.PopularityScore
            })
            .ToList();

        return new
        {
            ok = true,
            userId,
            topN,
            unseenOnly,
            model = new
            {
                path = _store.ModelPath,
                exists = _store.ModelExists,
                lastWriteUtc = _store.LastModelWriteTimeUtc,
                lastTrainedAtUtc = _store.LastTrainedAtUtc
            },
            compare = new
            {
                mlTop = topMl,
                popularityTop = topPopularity
            }
        };
    }
}
