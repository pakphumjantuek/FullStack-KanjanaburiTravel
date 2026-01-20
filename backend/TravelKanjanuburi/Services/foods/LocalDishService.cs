using AutoMapper.QueryableExtensions;
using TravelKanjanuburi.Dtos.Food;
using TravelKanjanuburi.Model.Foods;
using static TravelKanjanuburi.Model.Paged;

namespace TravelKanjanuburi.Services.foods
{
    public class LocalDishService
    {
        private readonly ApplicationDbContext _db;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _env;

        public LocalDishService(ApplicationDbContext db,IMapper mapper,IWebHostEnvironment env)
        {
            _db = db;
            _mapper = mapper;
            _env = env;
        }

        public async Task<PagedResult<LocalDishDto>> GetAllAsync(PagedQuery query, CancellationToken ct)
        {
            var page = query.Page < 1 ? 1 : query.Page;
            var pageSize = query.PageSize is < 1 or > 200 ? 20 : query.PageSize;

            var q = _db.LocalDishes.Include(p => p.LocalDishImages).AsNoTracking();

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var term = query.Search.Trim();
                q = q.Where(x => EF.Functions.Like(x.NameTH, $"%{term}%"));
            }

            var total = await q.LongCountAsync(ct);

            var items = await q
                .Include(p => p.LocalDishImages)
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ProjectTo<LocalDishDto>(_mapper.ConfigurationProvider)
                .ToListAsync(ct);

            return new PagedResult<LocalDishDto>(items, page, pageSize, total);
        }

        public async Task<LocalDishDto> GetLocalDishdishByIdAsync(int id, CancellationToken ct = default)
        {
            var localDishdish = await _db.LocalDishes
                .AsNoTracking()
                .Include(p => p.LocalDishImages)
                .FirstOrDefaultAsync(x => x.DishId == id, ct);

            if (localDishdish == null)
                throw new KeyNotFoundException($"localDishdish with ID {id} not found.");

            return _mapper.Map<LocalDishDto>(localDishdish);
        }

        public async Task<CreateLocalDishRequest> CreateLocalDishAsync(CreateLocalDishRequest req, CancellationToken ct = default)
        {
            if (req == null)
                throw new ArgumentNullException(nameof(req), "localDish cannot be null.");

            var localDishDto = _mapper.Map<LocalDish>(req);

            localDishDto.CreatedAt = DateTime.Now;
      
            await _db.LocalDishes.AddAsync(localDishDto, ct);
            await _db.SaveChangesAsync(ct);

            return _mapper.Map<CreateLocalDishRequest>(localDishDto);
        }

        public async Task<LocalDishDto> UpdateLocalDishAsync(int id, CreateLocalDishRequest req, CancellationToken ct = default)
        {
            var localDish = await _db.LocalDishes
                .FirstOrDefaultAsync(p => p.DishId == id, ct);

            if (localDish == null) throw new KeyNotFoundException($"LocalDish {id} not found.");

            _mapper.Map(req, localDish);

            await _db.SaveChangesAsync(ct);
            return _mapper.Map<LocalDishDto>(localDish);
        }

        public async Task DeleteLocalDishAsync(int id, CancellationToken ct = default)
        {
            var localDish = await _db.LocalDishes.FirstOrDefaultAsync(p => p.DishId == id, ct);
            if (localDish == null)
                throw new KeyNotFoundException("ไม่พบ DishId");
      
            _db.LocalDishes.Remove(localDish);

            await _db.SaveChangesAsync(ct);
        }

        public async Task<List<PlaceForDishDto>> GetPlacesByDishIdAsync(int dishId, CancellationToken ct = default)
        {
            var exists = await _db.LocalDishes.AsNoTracking().AnyAsync(x => x.DishId == dishId, ct);
            if (!exists) throw new KeyNotFoundException($"DishId {dishId} not found.");

            var places = await _db.PlaceLocalDishes
                .AsNoTracking()
                .Where(x => x.DishId == dishId && x.IsAvailable)
                .Select(x => new PlaceForDishDto
                {
                    PlaceId = x.PlaceId,
                    Name = x.Place.Name,
                    Address = x.Place.Address,
                    Latitude = x.Place.Latitude,
                    Longitude = x.Place.Longitude,
                    AverageRating = x.Place.AverageRating,
                    ReviewCount = x.Place.ReviewCount,

                    Price = x.Price,
                    IsAvailable = x.IsAvailable,

                    CoverImageUrl = x.Place.Images
                        .OrderByDescending(i => i.IsCover)
                        .ThenByDescending(i => i.CreatedAt)
                        .Select(i => i.ImageUrl)
                        .FirstOrDefault()
                })
                .ToListAsync(ct);

            return places;
        }


        public async Task UploadImagesAsync(int placeId, List<IFormFile> files, int coverIndex = 0, bool replaceOld = false, CancellationToken ct = default)
        {
            var place = await _db.LocalDishes
                .Include(x => x.LocalDishImages)
                .FirstOrDefaultAsync(x => x.DishId == placeId, ct);

            if (place == null)
                throw new KeyNotFoundException("ไม่พบสถานที่");

            if (files == null || files.Count == 0)
                throw new InvalidOperationException("ไม่มีไฟล์");

            // ✅ replace รูปเก่าทั้งหมด
            if (replaceOld)
            {
                foreach (var old in place.LocalDishImages.ToList())
                {
                    if (!string.IsNullOrWhiteSpace(old.ImageUrl))
                    {
                        var root = _env.WebRootPath ?? "wwwroot";
                        var physical = Path.Combine(
                            root,
                            old.ImageUrl.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString())
                        );
                        if (File.Exists(physical)) File.Delete(physical);
                    }
                    _db.LocalDishesImage.Remove(old);
                }
            }

            // ✅ ตั้ง cover ใหม่ (ในชุดที่อัป)
            foreach (var img in place.LocalDishImages) img.IsCover = false;

            var uploadsPath = Path.Combine("wwwroot", "uploads", "localDish");
            Directory.CreateDirectory(uploadsPath);

            for (int i = 0; i < files.Count; i++)
            {
                var file = files[i];
                if (file == null || file.Length == 0) continue;

                var ext = Path.GetExtension(file.FileName);
                var fileName = $"{Guid.NewGuid():N}{ext}";
                var savePath = Path.Combine(uploadsPath, fileName);

                await using (var stream = File.Create(savePath))
                    await file.CopyToAsync(stream, ct);

                var url = $"/uploads/localDish/{fileName}";

                place.LocalDishImages.Add(new LocalDishImage
                {
                    ImageUrl = url,
                    IsCover = i == coverIndex
                });
            }

            await _db.SaveChangesAsync(ct);
        }

        public async Task DeleteImageAsync(int dishId, int imageId, CancellationToken ct = default)
        {
            var img = await _db.LocalDishesImage
                .FirstOrDefaultAsync(x => x.ImageId == imageId && x.DishId == dishId, ct);

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

            _db.LocalDishesImage.Remove(img);
            await _db.SaveChangesAsync(ct);
        }

    }
}
