using TravelKanjanuburi.Dtos.BehaviorLog;

namespace TravelKanjanuburi.Dtos.Home
{
    public sealed class HomeSectionDto<T>
    {
        public string Key { get; set; } = "";
        public string Title { get; set; } = "";
        public List<T> Items { get; set; } = new();
    }

    public sealed class HomeResponseDto
    {
        public bool IsSuccess { get; set; } = true;
        public List<HomeSectionDto<PlaceRecommendDto>> Sections { get; set; } = new();
    }
}
