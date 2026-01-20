namespace TravelKanjanuburi.Dtos.Places
{
    public class PlaceDetailDto
    {
        public int PlaceId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Address { get; set; }
        public TimeOnly? OpenTime { get; set; }
        public TimeOnly? CloseTime { get; set; }
        public int? AvgVisitMinutes { get; set; }
        public int? PriceRange { get; set; }
        public double PopularityScore { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public bool IsActive { get; set; } = true;
        public double AverageRating { get; set; } 
        public int ReviewCount { get; set; } 

        public List<int> TagIds { get; set; } = new();
        public List<string> Tags { get; set; } = new();
        public List<PlaceImageDto> Images { get; set; } = new();
    }
}
