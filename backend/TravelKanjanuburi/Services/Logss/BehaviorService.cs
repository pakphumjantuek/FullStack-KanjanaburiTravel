using TravelKanjanuburi.Dtos.BehaviorLog.TravelKanjanuburi.Dtos.BehaviorLog;
using TravelKanjanuburi.Helper;
using TravelKanjanuburi.Model.Log;

public sealed class BehaviorService
{
    private readonly ApplicationDbContext _db;
    private readonly IInterestMapper _interestMapper;

    private static readonly TimeSpan DedupeWindow = TimeSpan.FromSeconds(2);

    public BehaviorService(ApplicationDbContext db, IInterestMapper interestMapper)
    {
        _db = db;
        _interestMapper = interestMapper;
    }

    public async Task LogAsync(int? userId, CreateBehaviorLogRequest req, CancellationToken ct)
    {
        if (req is null) throw new ArgumentNullException(nameof(req));
        if (string.IsNullOrWhiteSpace(req.ActionType)) throw new ArgumentException("ActionType ห้ามว่าง");

        var action = ParseAction(req.ActionType);

        // ✅ แปลง ClientEventId (string) -> Guid?
        Guid? clientEventId = null;
        if (!string.IsNullOrWhiteSpace(req.ClientEventId))
        {
            var raw = req.ClientEventId.Trim();
            if (!Guid.TryParse(raw, out var parsed))
                throw new ArgumentException("ClientEventId ต้องเป็น GUID ที่ถูกต้อง");
            clientEventId = parsed;
        }

        var anonymousId = string.IsNullOrWhiteSpace(req.AnonymousId) ? null : req.AnonymousId.Trim();
        var isLoggedIn = userId.HasValue && userId.Value > 0;

        if (!isLoggedIn && anonymousId is null)
            throw new ArgumentException("ต้องมี userId หรือ anonymousId");

        // ✅ กันซ้ำ: clientEventId ก่อน
        if (clientEventId is not null)
        {
            var exists = await _db.BehaviorLogs.AsNoTracking().AnyAsync(x =>
                x.ClientEventId == clientEventId &&
                (
                    (isLoggedIn && x.UserId == userId!.Value) ||
                    (!isLoggedIn && x.AnonymousId == anonymousId)
                ),
                ct);

            if (exists) return;
        }
        else
        {
            if (await IsDuplicateWindowAsync(userId, anonymousId, req.PlaceId, action, ct))
                return;
        }

        _db.BehaviorLogs.Add(new BehaviorLog
        {
            UserId = isLoggedIn ? userId!.Value : (int?)null,
            AnonymousId = isLoggedIn ? null : anonymousId,

            PlaceId = req.PlaceId,
            ActionType = action,
            ActionValue = req.ActionValue,
            MetaJson = req.MetaJson,
            ClientEventId = clientEventId,  // ✅ Guid?
            CreatedAt = DateTime.UtcNow
        });

        if (!isLoggedIn)
        {
            await _db.SaveChangesAsync(ct);
            return;
        }

        var delta = CalculateDelta(action, req.ActionValue);

        if (req.PlaceId is null)
        {
            var keys = _interestMapper.MapToInterestKeys(null, new List<int>(), req.MetaJson);
            await UpdateInterestsAsync(userId!.Value, keys, delta, ct);
            await _db.SaveChangesAsync(ct);
            return;
        }

        var placeInfo = await _db.Places.AsNoTracking()
            .Where(p => p.PlaceId == req.PlaceId.Value && p.IsActive)
            .Select(p => new
            {
                CategoryId = p.CategoryId,
                TagIds = p.PlaceTags.Select(pt => pt.TagId).ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (placeInfo is not null)
        {
            var keys = _interestMapper.MapToInterestKeys(placeInfo.CategoryId, placeInfo.TagIds, req.MetaJson);
            await UpdateInterestsAsync(userId!.Value, keys, delta, ct);
        }

        await _db.SaveChangesAsync(ct);
    }


    private static BehaviorActionType ParseAction(string actionType)
    {
        var a = actionType.Trim().ToUpperInvariant();
        return a switch
        {
            "VIEW" => BehaviorActionType.View,
            "CLICK" => BehaviorActionType.Click,
            "ADD_TO_TRIP" => BehaviorActionType.AddToTrip,
            "FAVORITE" => BehaviorActionType.Favorite,
            "REVIEW" => BehaviorActionType.Review,
            "SEARCH" => BehaviorActionType.Search,
            _ => throw new ArgumentException($"ActionType ไม่รองรับ: {actionType}")
        };
    }

    private static double CalculateDelta(BehaviorActionType action, double? value) => action switch
    {
        BehaviorActionType.View => 0.02,
        BehaviorActionType.Click => 0.03,
        BehaviorActionType.AddToTrip => 0.08,
        BehaviorActionType.Favorite => 0.12,
        BehaviorActionType.Review => value switch
        {
            >= 4 => 0.15,
            <= 2 => -0.10,
            _ => 0.05
        },
        BehaviorActionType.Search => 0.02,
        _ => 0.01
    };

    private async Task<bool> IsDuplicateWindowAsync(int? userId, string? anonymousId, int? placeId, BehaviorActionType action, CancellationToken ct)
    {
        if (placeId is null) return false;

        var dedupeAllowed = action is BehaviorActionType.View
            or BehaviorActionType.Click
            or BehaviorActionType.AddToTrip
            or BehaviorActionType.Favorite;

        if (!dedupeAllowed) return false;

        var since = DateTime.UtcNow.Subtract(DedupeWindow);
        var isLoggedIn = userId.HasValue && userId.Value > 0;

        return await _db.BehaviorLogs.AsNoTracking().AnyAsync(x =>
            x.PlaceId == placeId &&
            x.ActionType == action &&
            x.CreatedAt >= since &&
            (
                (isLoggedIn && x.UserId == userId!.Value) ||
                (!isLoggedIn && anonymousId != null && x.AnonymousId == anonymousId)
            ),
            ct);
    }

    private async Task UpdateInterestsAsync(int userId, HashSet<string> interestKeys, double delta, CancellationToken ct)
    {
        if (interestKeys.Count == 0) return;

        var now = DateTime.UtcNow;

        var existing = await _db.UserInterests
            .Where(x => x.UserId == userId && interestKeys.Contains(x.InterestKey))
            .ToListAsync(ct);

        foreach (var key in interestKeys)
        {
            var row = existing.FirstOrDefault(x => x.InterestKey == key);

            if (row is null)
            {
                _db.UserInterests.Add(new UserInterest
                {
                    UserId = userId,
                    InterestKey = key,
                    Weight = Clamp(delta, -10, 10),
                    UpdatedAt = now
                });
            }
            else
            {
                row.Weight *= 0.98;
                row.Weight = Clamp(row.Weight + delta, -10, 10);
                row.UpdatedAt = now;
            }
        }
    }

    private static double Clamp(double v, double min, double max)
        => v < min ? min : (v > max ? max : v);
}
