using TravelKanjanuburi.ML;

[ApiController]
[Route("api/recommend")]
[Authorize]
public class RecommendController : ControllerBase
{
    private readonly RecommenderService _rec;
    private readonly IModelStore _store;
    private readonly IModelTrainingService _trainer;
    private readonly TrainingState _trainingState; // ✅ เพิ่ม

    public RecommendController(
        RecommenderService rec,
        IModelStore store,
        IModelTrainingService trainer,
        TrainingState trainingState)
    {
        _rec = rec;
        _store = store;
        _trainer = trainer;
        _trainingState = trainingState;
    }

    // GET /api/recommend/training-stats?days=90
    [HttpGet("training-stats")]
    public async Task<IActionResult> TrainingStats([FromQuery] int days = 90, CancellationToken ct = default)
    {
        if (days is < 0 or > 3650) days = 90;

        var svc = HttpContext.RequestServices.GetRequiredService<TrainingStatsService>();
        var stats = await svc.GetAsync(days, ct);

        return Ok(new { isSuccess = true, stats });
    }
    // GET /api/recommend/personal?topN=20&lat=14.05&lng=99.44
    [HttpGet("personal")]
    public async Task<IActionResult> Personal(
        [FromQuery] int topN = 20,
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        CancellationToken ct = default)
    {
        var userId = TryGetUserId(User);
        if (userId is null)
            return Unauthorized(new { isSuccess = false, message = "Token ไม่มี userId" });

        // ✅ clamp topN
        if (topN is < 1 or > 50) topN = 20;

        // ✅ validate lat/lng ถ้าส่งมาไม่ครบ/ผิดช่วง -> ignore
        if (lat.HasValue && lng.HasValue)
        {
            if (!ValidLatLng(lat.Value, lng.Value))
            {
                lat = null;
                lng = null;
            }
        }
        else
        {
            lat = null;
            lng = null;
        }

        var items = await _rec.RecommendPersonalAsync(userId.Value, topN, lat, lng, ct);
        return Ok(new { isSuccess = true, items });
    }

    // ✅ 1) status
    // GET /api/recommend/status
    [HttpGet("status")]
    public IActionResult Status()
    {
        return Ok(new
        {
            isSuccess = true,
            model = new
            {
                path = _store.ModelPath,
                exists = _store.ModelExists,
                lastWriteUtc = _store.LastModelWriteTimeUtc,
                lastTrainedAtUtc = _store.LastTrainedAtUtc
            },
            training = new
            {
                _trainingState.IsTraining,
                _trainingState.LastAttemptUtc,
                _trainingState.LastSuccessUtc,
                _trainingState.LastRows,
                _trainingState.LastMessage
            }
        });
    }

    // ✅ 2) retrain now
    // POST /api/recommend/retrain?days=90&minRows=3
    // [Authorize(Roles = "ADMIN")]
    [HttpPost("retrain")]
    public async Task<IActionResult> Retrain(
        [FromQuery] int days = 90,
        [FromQuery] int minRows = 3,
        CancellationToken ct = default)
    {
        if (days is < 0 or > 3650) days = 90;
        if (minRows is < 1 or > 5000) minRows = 3;

        // ✅ signature ใหม่: RetrainNowAsync(days, minRows, ct)
        var (ok, rows, message) = await _trainer.RetrainNowAsync(days, minRows, ct);

        if (!ok)
        {
            return BadRequest(new
            {
                isSuccess = false,
                message = message ?? "เทรนไม่สำเร็จ",
                rows,
                modelPath = _store.ModelPath
            });
        }

        return Ok(new
        {
            isSuccess = true,
            rows,
            model = new
            {
                path = _store.ModelPath,
                exists = _store.ModelExists,
                lastWriteUtc = _store.LastModelWriteTimeUtc,
                lastTrainedAtUtc = _store.LastTrainedAtUtc
            }
        });
    }

    private static int? TryGetUserId(ClaimsPrincipal user)
    {
        var raw =
            user.FindFirstValue("userId") ??
            user.FindFirstValue("UserId") ??
            user.FindFirstValue(ClaimTypes.NameIdentifier) ??
            user.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
            user.FindFirstValue("sub");

        return int.TryParse(raw, out var id) && id > 0 ? id : null;
    }

    private static bool ValidLatLng(double lat, double lng)
        => !double.IsNaN(lat) && !double.IsNaN(lng)
           && !double.IsInfinity(lat) && !double.IsInfinity(lng)
           && lat >= -90 && lat <= 90
           && lng >= -180 && lng <= 180;
}
