using AutoMapper.QueryableExtensions;
using TravelKanjanuburi.Dtos.Food;
using TravelKanjanuburi.Dtos.Places;
using TravelKanjanuburi.Model.Foods;
using TravelKanjanuburi.Model.MPlaces;
using static TravelKanjanuburi.Model.Paged;

namespace TravelKanjanuburi.Services.Places
{
    public class PlaceService
    {
        private readonly ApplicationDbContext _db;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _env;

        public PlaceService(ApplicationDbContext db, IMapper mapper,IWebHostEnvironment env)
        {
            _db = db;
            _mapper = mapper;
            _env = env;
        }

        public async Task<PagedResult<PlaceDetailDto>> GetAllAsync(PagedQuery query, CancellationToken ct)
        {
            var page = query.Page < 1 ? 1 : query.Page;
            var pageSize = query.PageSize is < 1 or > 200 ? 20 : query.PageSize;

            var q = _db.Places.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var term = query.Search.Trim();
                q = q.Where(x => EF.Functions.Like(x.Name, $"%{term}%"));
            }

            var total = await q.LongCountAsync(ct);

            var items = await q
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ProjectTo<PlaceDetailDto>(_mapper.ConfigurationProvider)
                .ToListAsync(ct);

            return new PagedResult<PlaceDetailDto>(items, page, pageSize, total);
        }

        public async Task<PlaceDetailDto> GetPlaceByIdAsync(int id, CancellationToken ct = default)
        {
            var place = await _db.Places
                .AsNoTracking()
                .Include(x => x.Images)
                .Include(x => x.PlaceTags)
                    .ThenInclude(pt => pt.Tag)
                .FirstOrDefaultAsync(x => x.PlaceId == id, ct);

            if (place == null)
                throw new KeyNotFoundException($"Places with ID {id} not found.");

            return _mapper.Map<PlaceDetailDto>(place);
        }

        public async Task<CreatePlaceRequest> CreatePlaceAsync(CreatePlaceRequest req, CancellationToken ct = default)
        {
            if (req == null)
                throw new ArgumentNullException(nameof(req), "PlaceDetailDto cannot be null.");

            var place = _mapper.Map<Place>(req);

            if (req.TagIds?.Count > 0)
            {
                var tagIds = req.TagIds.Distinct().ToList();
                place.PlaceTags = tagIds.Select(tid => new PlaceTag { TagId = tid }).ToList();
            }

            await _db.Places.AddAsync(place, ct);
            await _db.SaveChangesAsync(ct);

            return _mapper.Map<CreatePlaceRequest>(place);
        }



        public async Task<UpdatePlaceRequest> UpdatePlaceAsync(int id, UpdatePlaceRequest req, CancellationToken ct = default)
        {
            var place = await _db.Places
                .Include(p => p.PlaceTags)
                .FirstOrDefaultAsync(p => p.PlaceId == id, ct);

            if (place == null) throw new KeyNotFoundException($"Place {id} not found.");

            // update field ปกติ (ignore null)
            _mapper.Map(req, place);

            // sync tags
            var newIds = (req.TagIds ?? new()).Distinct().ToHashSet();
            var oldIds = place.PlaceTags.Select(x => x.TagId).ToHashSet();

            var toAdd = newIds.Except(oldIds);
            var toRemove = oldIds.Except(newIds);

            place.PlaceTags = place.PlaceTags.Where(pt => !toRemove.Contains(pt.TagId)).ToList();
            foreach (var tid in toAdd) place.PlaceTags.Add(new PlaceTag { PlaceId = id, TagId = tid });

            await _db.SaveChangesAsync(ct);
            return _mapper.Map<UpdatePlaceRequest>(place);
        }


        public async Task DeletePlaceAsync(int id, CancellationToken ct = default)
        {
            var place = await _db.Places.FirstOrDefaultAsync(p => p.PlaceId == id, ct);
            if (place == null)
                throw new KeyNotFoundException("ไม่พบไอดีPlace");

            // TripItems + TripSegments
            var tripItemIds = await _db.TripItems
                .Where(x => x.PlaceId == id)
                .Select(x => x.TripItemId)
                .ToListAsync(ct);

            if (tripItemIds.Any())
            {
                _db.TripSegments.RemoveRange(
                    _db.TripSegments.Where(s =>
                        tripItemIds.Contains(s.FromTripItemId) ||
                        tripItemIds.Contains(s.ToTripItemId))
                );

                _db.TripItems.RemoveRange(
                    _db.TripItems.Where(x => x.PlaceId == id)
                );
            }

            // 🔥 BehaviorLogs (ตัวที่ทำให้คุณติด 409)
            _db.BehaviorLogs.RemoveRange(_db.BehaviorLogs.Where(x => x.PlaceId == id));

            // ลูกของ Place
            _db.PlaceTags.RemoveRange(_db.PlaceTags.Where(x => x.PlaceId == id));
            _db.PlaceImages.RemoveRange(_db.PlaceImages.Where(x => x.PlaceId == id));
            _db.OpeningHours.RemoveRange(_db.OpeningHours.Where(x => x.PlaceId == id));
            _db.PlaceReviews.RemoveRange(_db.PlaceReviews.Where(x => x.PlaceId == id));

            // ลบ Place
            _db.Places.Remove(place);

            await _db.SaveChangesAsync(ct);
        }

        public async Task UpsertPlaceDishAsync(int placeId, UpsertPlaceDishRequest req, CancellationToken ct = default)
        {
            var placeExists = await _db.Places.AnyAsync(x => x.PlaceId == placeId, ct);
            if (!placeExists) throw new KeyNotFoundException("ไม่พบ PlaceId");

            var dishExists = await _db.LocalDishes.AnyAsync(x => x.DishId == req.DishId, ct);
            if (!dishExists) throw new KeyNotFoundException("ไม่พบ DishId");

            var link = await _db.PlaceLocalDishes
                .FirstOrDefaultAsync(x => x.PlaceId == placeId && x.DishId == req.DishId, ct);

            if (link == null)
            {
                link = new PlaceLocalDish
                {
                    PlaceId = placeId,
                    DishId = req.DishId,
                    Price = req.Price,
                    IsAvailable = req.IsAvailable
                };
                _db.PlaceLocalDishes.Add(link);
            }
            else
            {
                link.Price = req.Price;
                link.IsAvailable = req.IsAvailable;
            }

            await _db.SaveChangesAsync(ct);
        }

        public async Task<List<DishForPlaceDto>> GetDishesByPlaceIdAsync(int placeId, CancellationToken ct = default)
        {
            var placeExists = await _db.Places.AsNoTracking().AnyAsync(x => x.PlaceId == placeId, ct);
            if (!placeExists) throw new KeyNotFoundException("ไม่พบ PlaceId");

            var dishes = await _db.PlaceLocalDishes
                 .AsNoTracking()
                 .Where(x => x.PlaceId == placeId)
                 .ProjectTo<DishForPlaceDto>(_mapper.ConfigurationProvider)
                 .ToListAsync(ct);
            return dishes;
        }


        public async Task DeletePlaceDishAsync(int placeId, int dishId, CancellationToken ct = default)
        {
            var link = await _db.PlaceLocalDishes
                .FirstOrDefaultAsync(x => x.PlaceId == placeId && x.DishId == dishId, ct);

            if (link == null) throw new KeyNotFoundException("ไม่พบเมนูของร้านนี้");

            _db.PlaceLocalDishes.Remove(link);
            await _db.SaveChangesAsync(ct);
        }


        public async Task UploadImagesAsync(int placeId, List<IFormFile> files,int coverIndex = 0,bool replaceOld = false,CancellationToken ct = default)
        {
            var place = await _db.Places
                .Include(x => x.Images)
                .FirstOrDefaultAsync(x => x.PlaceId == placeId, ct);

            if (place == null)
                throw new KeyNotFoundException("ไม่พบสถานที่");

            if (files == null || files.Count == 0)
                throw new InvalidOperationException("ไม่มีไฟล์");

            // ✅ replace รูปเก่าทั้งหมด
            if (replaceOld)
            {
                foreach (var old in place.Images.ToList())
                {
                    if (!string.IsNullOrWhiteSpace(old.ImageUrl))
                    {
                        var root = _env.WebRootPath ?? "wwwroot";
                        var physical = Path.Combine(
                            root,
                            old.ImageUrl.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString())
                        );
                        if (System.IO.File.Exists(physical)) System.IO.File.Delete(physical);
                    }
                    _db.PlaceImages.Remove(old);
                }
            }

            // ✅ ตั้ง cover ใหม่ (ในชุดที่อัป)
            foreach (var img in place.Images) img.IsCover = false;

            var uploadsPath = Path.Combine("wwwroot", "uploads", "places");
            Directory.CreateDirectory(uploadsPath);

            for (int i = 0; i < files.Count; i++)
            {
                var file = files[i];
                if (file == null || file.Length == 0) continue;

                var ext = Path.GetExtension(file.FileName);
                var fileName = $"{Guid.NewGuid():N}{ext}";
                var savePath = Path.Combine(uploadsPath, fileName);

                await using (var stream = System.IO.File.Create(savePath))
                    await file.CopyToAsync(stream, ct);

                var url = $"/uploads/places/{fileName}";

                place.Images.Add(new PlaceImage
                {
                    ImageUrl = url,
                    IsCover = (i == coverIndex)
                });
            }

            await _db.SaveChangesAsync(ct);
        }

        public async Task DeleteImageAsync(int placeId, int imageId, CancellationToken ct = default)
        {
            var img = await _db.PlaceImages
                .FirstOrDefaultAsync(x => x.ImageId == imageId && x.PlaceId == placeId, ct);

            if (img == null)
                throw new KeyNotFoundException("ไม่พบรูปภาพ");

            if (!string.IsNullOrWhiteSpace(img.ImageUrl))
            {
                var root = _env.WebRootPath ?? "wwwroot";
                var physical = Path.Combine(
                    root,
                    img.ImageUrl.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString())
                );
                if (System.IO.File.Exists(physical)) System.IO.File.Delete(physical);
            }

            _db.PlaceImages.Remove(img);
            await _db.SaveChangesAsync(ct);
        }

    }
}   
