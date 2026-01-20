using AutoMapper.QueryableExtensions;
using TravelKanjanuburi.Dtos.Trips;
using TravelKanjanuburi.Model.MTrips;
using static TravelKanjanuburi.Model.Paged;

namespace TravelKanjanuburi.Services.Trips
{
    public class TripService
    {
        private readonly ApplicationDbContext _db;
        private readonly IMapper _mapper;
        private readonly IHttpClientFactory _http;

        public TripService(ApplicationDbContext db, IMapper mapper, IHttpClientFactory http)
        {
            _db = db;
            _mapper = mapper;
            _http = http;
        }

        // ---------------------------
        // Trips
        // ---------------------------
        public async Task<PagedResult<TripDto>> GetMyTripsAsync(int userId, PagedQuery query, CancellationToken ct)
        {
            var page = query.Page < 1 ? 1 : query.Page;
            var pageSize = query.PageSize is < 1 or > 200 ? 20 : query.PageSize;

            var q = _db.Trips.AsNoTracking().Where(x => x.UserId == userId);

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var term = query.Search.Trim();
                q = q.Where(x => EF.Functions.Like(x.Title, $"%{term}%"));
            }

            var total = await q.LongCountAsync(ct);

            var items = await q
                .OrderByDescending(x => x.TripId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ProjectTo<TripDto>(_mapper.ConfigurationProvider)
                .ToListAsync(ct);

            return new PagedResult<TripDto>(items, page, pageSize, total);
        }

        public async Task<TripDto> GetByIdAsync(int userId, int tripId, CancellationToken ct)
        {
            var trip = await _db.Trips
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.TripId == tripId && x.UserId == userId, ct);

            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {tripId} not found.");

            return _mapper.Map<TripDto>(trip);
        }

        public async Task<TripDetailDto> GetDetailAsync(int userId, int tripId, CancellationToken ct)
        {
            var trip = await _db.Trips
                .AsNoTracking()
                .Include(x => x.Items)
                .Include(x => x.Segments)
                .FirstOrDefaultAsync(x => x.TripId == tripId && x.UserId == userId, ct);

            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {tripId} not found.");

            var dto = _mapper.Map<TripDetailDto>(trip);

            dto.Items = trip.Items
                .OrderBy(x => x.DayIndex).ThenBy(x => x.OrderIndex)
                .Select(x => _mapper.Map<TripItemDto>(x))
                .ToList();

            dto.Segments = trip.Segments
                .Select(x => _mapper.Map<TripSegmentDto>(x))
                .ToList();

            return dto;
        }

        public async Task<TripDto> CreateAsync(int userId, CreateTripRequest req, CancellationToken ct)
        {
            if (req == null) throw new ArgumentNullException(nameof(req));
            if (string.IsNullOrWhiteSpace(req.Title)) throw new ArgumentException("Title is required.");
            if (req.EndDateTime < req.StartDateTime) throw new ArgumentException("EndDateTime must be >= StartDateTime.");

            var trip = new Trip
            {
                UserId = userId,
                Title = req.Title.Trim(),
                Description = req.Description?.Trim(),
                StartDateTime = req.StartDateTime,
                EndDateTime = req.EndDateTime,
                StartLat = req.StartLat,
                StartLng = req.StartLng,
                CreatedAt = DateTime.UtcNow
            };

            await _db.Trips.AddAsync(trip, ct);
            await _db.SaveChangesAsync(ct);

            return _mapper.Map<TripDto>(trip);
        }

        public async Task<TripDto> UpdateAsync(int userId, int tripId, CreateTripRequest req, CancellationToken ct)
        {
            var trip = await _db.Trips.FirstOrDefaultAsync(x => x.TripId == tripId && x.UserId == userId, ct);
            if (trip == null) throw new KeyNotFoundException($"Trip with ID {tripId} not found.");

            trip.Title = req.Title.Trim();
            trip.Description = req.Description?.Trim();
            trip.StartDateTime = req.StartDateTime;
            trip.EndDateTime = req.EndDateTime;
            trip.StartLat = req.StartLat;
            trip.StartLng = req.StartLng;
            trip.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return _mapper.Map<TripDto>(trip);
        }

        public async Task DeleteAsync(int userId, int tripId, CancellationToken ct)
        {
            var trip = await _db.Trips.FirstOrDefaultAsync(x => x.TripId == tripId && x.UserId == userId, ct);
            if (trip == null) throw new KeyNotFoundException($"Trip with ID {tripId} not found.");

            _db.Trips.Remove(trip);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<TripMapViewDto> GetMapViewAsync( int userId,int tripId,int dayIndex,string? transportMode,CancellationToken ct)
        {
            var trip = await _db.Trips.AsNoTracking()
                .FirstOrDefaultAsync(x => x.TripId == tripId && x.UserId == userId, ct);

            if (trip == null) throw new KeyNotFoundException("Trip not found.");

            var items = await _db.TripItems.AsNoTracking()
                .Where(x => x.TripId == tripId && x.DayIndex == dayIndex)
                .OrderBy(x => x.OrderIndex)
                .ToListAsync(ct);

            // join places
            var placeIds = items.Select(x => x.PlaceId).Distinct().ToList();

            var places = await _db.Places.AsNoTracking()
                .Where(p => placeIds.Contains(p.PlaceId))
                .ToDictionaryAsync(p => p.PlaceId, ct);

            var stops = new List<TripMapStopDto>();
            foreach (var it in items)
            {
                if (!places.TryGetValue(it.PlaceId, out var p)) continue;

                // กันพิกัด 0,0 แบบหลุด ๆ (ถ้าคุณใช้ 0,0 เป็น default)
                if (p.Latitude == 0 && p.Longitude == 0) continue;

                stops.Add(new TripMapStopDto
                {
                    TripItemId = it.TripItemId,
                    PlaceId = it.PlaceId,
                    OrderIndex = it.OrderIndex,
                    Name = p.Name,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    Type = "normal"
                });
            }

            if (stops.Count > 0)
            {
                stops[0].Type = "start";
                if (stops.Count > 1) stops[^1].Type = "end";
            }

            var dto = new TripMapViewDto
            {
                TripId = tripId,
                Title = trip.Title,
                DayIndex = dayIndex,
                Stops = stops
            };

            // route (คำนวณครั้งเดียว) ถ้ามี >=2 จุด
            if (stops.Count >= 2)
            {
                var mode = (transportMode ?? "driving").Trim().ToLowerInvariant();
                if (mode is not ("driving" or "walking" or "cycling"))
                    mode = "driving";

                var coordStr = string.Join(";", stops.Select(s => $"{s.Longitude},{s.Latitude}"));
                var url =
                    $"https://router.project-osrm.org/route/v1/{mode}/{coordStr}" +
                    "?overview=full&geometries=geojson&steps=false";

                var http = _http.CreateClient();
                var osrm = await http.GetFromJsonAsync<OsrmResponse>(url, ct);
                var r = osrm?.routes?.FirstOrDefault();

                if (r != null && r.geometry?.coordinates?.Count > 0)
                {
                    dto.Route = new TripMapRouteDto
                    {
                        TotalDistanceKm = r.distance / 1000.0,
                        TotalTravelMinutes = (int)Math.Round(r.duration / 60.0),
                        Polyline = r.geometry.coordinates.Select(c => new[] { c[0], c[1] }).ToList()
                    };
                }
            }

            return dto;
        }

        // ---------------------------
        // TripItems
        // ---------------------------
        public async Task<TripItemDto> AddItemAsync(int userId, int tripId, AddTripItemRequest req, CancellationToken ct)
        {
            var trip = await _db.Trips.FirstOrDefaultAsync(x => x.TripId == tripId && x.UserId == userId, ct);
            if (trip == null) throw new KeyNotFoundException($"Trip with ID {tripId} not found.");

            if (req.DayIndex < 1) throw new ArgumentException("DayIndex must be >= 1");
            if (req.OrderIndex < 1) throw new ArgumentException("OrderIndex must be >= 1");

            var item = new TripItem
            {
                TripId = tripId,
                PlaceId = req.PlaceId,
                DayIndex = req.DayIndex,
                OrderIndex = req.OrderIndex,
                PlannedArrivalTime = req.PlannedArrivalTime,
                PlannedDurationMinutes = req.PlannedDurationMinutes,
                Notes = req.Notes?.Trim()
            };

            await _db.TripItems.AddAsync(item, ct);
            trip.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return _mapper.Map<TripItemDto>(item);
        }

        public async Task<TripItemDto> UpdateItemAsync(int userId, int tripId, int tripItemId, UpdateTripItemRequest req, CancellationToken ct)
        {
            var item = await _db.TripItems
                .Include(x => x.Trip)
                .FirstOrDefaultAsync(x => x.TripItemId == tripItemId && x.TripId == tripId, ct);

            if (item == null || item.Trip.UserId != userId)
                throw new KeyNotFoundException($"TripItem with ID {tripItemId} not found.");

            item.DayIndex = req.DayIndex;
            item.OrderIndex = req.OrderIndex;
            item.PlannedArrivalTime = req.PlannedArrivalTime;
            item.PlannedDurationMinutes = req.PlannedDurationMinutes;
            item.Notes = req.Notes?.Trim();

            item.Trip.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return _mapper.Map<TripItemDto>(item);
        }

        public async Task DeleteItemAsync(int userId, int tripId, int tripItemId, CancellationToken ct)
        {
            var item = await _db.TripItems
                .Include(x => x.Trip)
                .FirstOrDefaultAsync(x => x.TripItemId == tripItemId && x.TripId == tripId, ct);

            if (item == null || item.Trip.UserId != userId)
                throw new KeyNotFoundException($"TripItem with ID {tripItemId} not found.");

            // ลบ Segments ที่เกี่ยวข้อง (กัน FK ค้าง)
            var segs = await _db.TripSegments
                .Where(s => s.TripId == tripId && (s.FromTripItemId == tripItemId || s.ToTripItemId == tripItemId))
                .ToListAsync(ct);

            _db.TripSegments.RemoveRange(segs);
            _db.TripItems.Remove(item);

            item.Trip.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
        }

        public async Task ReorderTripItemsAsync(int userId, int tripId, ReorderTripItemsRequest req, CancellationToken ct)
        {
            if (req == null) throw new ArgumentNullException(nameof(req));
            if (req.DayIndex <= 0) throw new ArgumentException("dayIndex ไม่ถูกต้อง");
            if (req.Items == null || req.Items.Count == 0) throw new ArgumentException("items ว่าง");

            // ✅ เช็คว่า Trip เป็นของ user
            var tripOk = await _db.Trips.AsNoTracking()
                .AnyAsync(t => t.TripId == tripId && t.UserId == userId, ct);

            if (!tripOk) throw new KeyNotFoundException("Trip not found.");

            // ✅ กัน orderIndex ซ้ำ
            var newOrders = req.Items.Select(x => x.OrderIndex).ToList();
            if (newOrders.Distinct().Count() != newOrders.Count)
                throw new InvalidOperationException("orderIndex ซ้ำกัน");

            var ids = req.Items.Select(x => x.TripItemId).Distinct().ToList();

            // โหลดเฉพาะ item ของวันนั้น
            var dbItems = await _db.TripItems
                .Where(x => x.TripId == tripId && x.DayIndex == req.DayIndex && ids.Contains(x.TripItemId))
                .ToListAsync(ct);

            if (dbItems.Count != ids.Count)
                throw new InvalidOperationException("มี TripItem บางตัวไม่อยู่ในทริป/ไม่อยู่ในวันเดียวกัน");

            // map ค่า order ใหม่
            var map = req.Items.ToDictionary(x => x.TripItemId, x => x.OrderIndex);

            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            // ---------------- Phase 1: set temp order (หลบ unique index) ----------------
            // ใช้ค่าติดลบเพื่อไม่ชนกับค่าปกติ (1..N)
            int temp = -1000;
            foreach (var it in dbItems.OrderBy(x => x.TripItemId))
            {
                it.OrderIndex = temp--;
            }
            await _db.SaveChangesAsync(ct);

            // ---------------- Phase 2: set final order ----------------
            foreach (var it in dbItems)
            {
                it.OrderIndex = map[it.TripItemId];
            }
            await _db.SaveChangesAsync(ct);

            await tx.CommitAsync(ct);
        }

        public async Task SaveRouteAsync(int userId,int tripId,SaveRouteRequest req,CancellationToken ct)
        {
            var trip = await _db.Trips
                .FirstOrDefaultAsync(x => x.TripId == tripId && x.UserId == userId, ct);

            if (trip == null)
                throw new KeyNotFoundException("Trip not found.");

            // TripItems ของวันนั้น (เรียงแล้ว)
            var items = await _db.TripItems
                .Where(x => x.TripId == tripId && x.DayIndex == req.DayIndex)
                .OrderBy(x => x.OrderIndex)
                .ToListAsync(ct);

            if (items.Count < 2) return;

            // ลบ segment เก่าของวันนั้น
            var itemIds = items.Select(x => x.TripItemId).ToList();
            var oldSegs = await _db.TripSegments
                .Where(s => s.TripId == tripId
                    && itemIds.Contains(s.FromTripItemId)
                    && itemIds.Contains(s.ToTripItemId))
                .ToListAsync(ct);

            _db.TripSegments.RemoveRange(oldSegs);

            // โหลด Place (lat/lng)
            var placeIds = items.Select(x => x.PlaceId).Distinct().ToList();
            var places = await _db.Places
                .Where(p => placeIds.Contains(p.PlaceId))
                .ToDictionaryAsync(p => p.PlaceId, ct);

            var http = _http.CreateClient();

            // ✅ คำนวณทีละช่วง
            for (int i = 0; i < items.Count - 1; i++)
            {
                var fromItem = items[i];
                var toItem = items[i + 1];

                var from = places[fromItem.PlaceId];
                var to = places[toItem.PlaceId];

                var url =
                    $"https://router.project-osrm.org/route/v1/{req.TransportMode}/" +
                    $"{from.Longitude},{from.Latitude};{to.Longitude},{to.Latitude}" +
                    "?overview=false";

                var osrm = await http.GetFromJsonAsync<OsrmResponse>(url, ct);
                var route = osrm?.routes?.FirstOrDefault();

                var km = route != null ? route.distance / 1000.0 : 0;
                var min = route != null ? (int)Math.Round(route.duration / 60.0) : 0;

                _db.TripSegments.Add(new TripSegment
                {
                    TripId = tripId,
                    FromTripItemId = fromItem.TripItemId,
                    ToTripItemId = toItem.TripItemId,
                    TransportMode = req.TransportMode,
                    DistanceKm = km,
                    TravelMinutes = min,
                });
            }

            await _db.SaveChangesAsync(ct);
        }



        public async Task<List<TripSegmentDto>> GetSegmentsByDayAsync(
            int userId, int tripId, int dayIndex, CancellationToken ct)
        {
            // เช็คเจ้าของทริป
            var ok = await _db.Trips.AsNoTracking()
                .AnyAsync(t => t.TripId == tripId && t.UserId == userId, ct);
            if (!ok) throw new KeyNotFoundException("Trip not found.");

            // item ของวันนั้น
            var itemIds = await _db.TripItems.AsNoTracking()
                .Where(i => i.TripId == tripId && i.DayIndex == dayIndex)
                .Select(i => i.TripItemId)
                .ToListAsync(ct);

            if (itemIds.Count == 0) return new();

            // segments เฉพาะที่ from/to อยู่ในวันนั้น
            return await _db.TripSegments.AsNoTracking()
                .Where(s => s.TripId == tripId
                    && itemIds.Contains(s.FromTripItemId)
                    && itemIds.Contains(s.ToTripItemId))
                .Select(s => new TripSegmentDto
                {
                    FromTripItemId = s.FromTripItemId,
                    ToTripItemId = s.ToTripItemId,
                    TravelMinutes = s.TravelMinutes,
                    DistanceKm = s.DistanceKm
                })
                .ToListAsync(ct);
        }

    }
}
