namespace TravelKanjanuburi.Services.Trips
{
    public class OsrmResponse
    {
        public List<OsrmRoute>? routes { get; set; }
    }

    public class OsrmRoute
    {
        public double distance { get; set; } // meters
        public double duration { get; set; } // seconds
        public OsrmGeometry geometry { get; set; } = new();
    }

    public class OsrmGeometry
    {
        public string type { get; set; } = "LineString";
        public List<List<double>> coordinates { get; set; } = new(); // [ [lng,lat], ... ]
    }
}
