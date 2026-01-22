using TravelKanjanuburi.Model.Log;

public static class InteractionBuilder
{
    public static async Task<List<InteractionRow>> BuildAsync(ApplicationDbContext db, int days,CancellationToken ct)
    {
        DateTime? since = days > 0 ? DateTime.UtcNow.AddDays(-days) : null;

        var q = db.BehaviorLogs.AsNoTracking()
              .Where(x => x.PlaceId != null && x.UserId != null);

        if (since.HasValue)
            q = q.Where(x => x.CreatedAt >= since.Value);

        // ✅ ทำ weight ใน SQL-friendly expression
        var rows = await q
            .GroupBy(x => new { x.UserId, PlaceId = x.PlaceId!.Value })
            .Select(g => new InteractionRow
            {
                UserId = (uint)g.Key.UserId!.Value,
                PlaceId = (uint)g.Key.PlaceId,
                Label = (float)g.Sum(x =>
                    x.ActionType == BehaviorActionType.View ? 1.0 :
                    x.ActionType == BehaviorActionType.Click ? 2.0 :
                    x.ActionType == BehaviorActionType.AddToTrip ? 6.0 :
                    x.ActionType == BehaviorActionType.Favorite ? 8.0 :
                    x.ActionType == BehaviorActionType.Review
                        ? (x.ActionValue >= 4 ? 10.0 : (x.ActionValue <= 2 ? 0.0 : 3.0))
                        : 0.0
                )
            })
            .Where(r => r.Label > 0)
            .ToListAsync(ct);

        return rows;
    }
}
