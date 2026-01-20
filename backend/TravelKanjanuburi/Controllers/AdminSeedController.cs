using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/seed")]
[Authorize] // ถ้ามี role แล้วค่อยใช้ [Authorize(Roles="ADMIN")]
public class AdminSeedController : ControllerBase
{
    private readonly SeedBehaviorService _seed;

    public AdminSeedController(SeedBehaviorService seed)
    {
        _seed = seed;
    }

    public sealed class SeedRequest
    {
        public int Users { get; set; } = 10;
        public int Places { get; set; } = 50;
        public int LogsPerUser { get; set; } = 40;
        public int DaysBack { get; set; } = 120;
        public bool ClearExisting { get; set; } = false;
    }

    [HttpPost("behavior")]
    public async Task<IActionResult> SeedBehavior([FromBody] SeedRequest req, CancellationToken ct)
    {
        var result = await _seed.SeedAsync(
            users: req.Users,
            places: req.Places,
            logsPerUser: req.LogsPerUser,
            daysBack: req.DaysBack,
            clearExisting: req.ClearExisting,
            ct: ct);

        return Ok(new { isSuccess = true, result });
    }
}
