using Microsoft.EntityFrameworkCore;
using TravelKanjanuburi.Dtos.BehaviorLog;
using TravelKanjanuburi.Dtos.Home;

public sealed class HomeService
{
    private readonly ApplicationDbContext _db;
    private readonly RecommenderService _recommender;
    private readonly IMapper _mapper;

    public HomeService(ApplicationDbContext db, RecommenderService recommender, IMapper mapper)
    {
        _db = db;
        _recommender = recommender;
        _mapper = mapper;
    }

    public async Task<HomeResponseDto> GetHomeAsync(int? userId, int topN, double? lat, double? lng, CancellationToken ct)
    {
        if (topN is < 1 or > 50) topN = 20;

        // 1) ยอดนิยมตอนนี้ (global)
        var popularNow = await GetPopularNowAsync(topN, ct);

        // 2) ยอดนิยมสำหรับคุณ (ถ้า login) ไม่งั้น fallback เป็น popularNow
        List<PlaceRecommendDto> popularForYou;
        if (userId is > 0)
        {
            popularForYou = await _recommender.RecommendPersonalAsync(userId.Value, topN, lat, lng, ct);
        }
        else
        {
            popularForYou = popularNow; // guest เห็น global ก่อน
        }

        return new HomeResponseDto
        {
            IsSuccess = true,
            Sections = new List<HomeSectionDto<PlaceRecommendDto>>
            {
                new()
                {
                    Key = "popular_for_you",
                    Title = userId is > 0 ? "ยอดนิยมสำหรับคุณ" : "ยอดนิยมแนะนำ",
                    Items = popularForYou
                },
                new()
                {
                    Key = "popular_now",
                    Title = "ยอดนิยมตอนนี้",
                    Items = popularNow
                }
            }
        };
    }

    private async Task<List<PlaceRecommendDto>> GetPopularNowAsync(int topN, CancellationToken ct)
    {
        var places = await _db.Places.AsNoTracking()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.PopularityScore)
            .Take(topN)
            .Include(p => p.PlaceCategory)
            .Include(p => p.PlaceTags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Images)
            .ToListAsync(ct);

        var dtos = _mapper.Map<List<PlaceRecommendDto>>(places);

        // ให้ score = popularity normalized เพื่อใช้ UI เดียวกับ recommend ได้
        foreach (var d in dtos)
        {
            var pop = d.PopularityScore / 100.0;
            if (pop < 0) pop = 0;
            if (pop > 1) pop = 1;

            d.Score = pop;
            d.ReasonJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                hasModel = false,
                popularity = Math.Round(pop, 4),
                source = "popular_now"
            });
        }

        return dtos;
    }
}
