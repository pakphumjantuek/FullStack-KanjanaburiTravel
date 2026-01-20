using TravelKanjanuburi.Services.Places;
using TravelKanjanuburi.Dtos.Places;

namespace TravelKanjanuburi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlaceOpeningController : BaseApiController
    {
        private readonly PlaceOpeningHourService _hourService;
        private readonly ILogger<PlaceOpeningController> _logger;

        public PlaceOpeningController(PlaceOpeningHourService hourService, ILogger<PlaceOpeningController> logger)
        {
            _hourService = hourService;
            _logger = logger;
        }

        [HttpGet("{placeId:int}")]
        public async Task<IActionResult> GetByPlaceId(int placeId, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var items = await _hourService.GetByPlaceIdAsync(placeId, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = items;
            }
            catch (KeyNotFoundException ex)
            {
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception)
            {
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }

            return HandleResponse(response);
        }


        // สร้าง default opening hours 7 วัน (กันสร้างซ้ำใน service)
        [HttpPost("{placeId:int}")]
        public async Task<IActionResult> CreateDefault(int placeId, [FromBody] CreateDefaultOpeningHoursDto dto, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                await _hourService.CreateDefaultWeeklyAsync(placeId, dto.OpenTime, dto.CloseTime, ct);

                response.StatusCode = HttpStatusCode.Created;
                response.Result = "Created default opening hours.";
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Place not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid create default opening hours.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.BadRequest;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default opening hours.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }

        // อัปเดต “รายวัน” (Upsert)
        [HttpPut("{placeId:int}/day")]
        public async Task<IActionResult> UpsertDay(int placeId, [FromBody] UpsertOpeningHourDto dto, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                await _hourService.UpsertDayAsync(placeId, dto, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = "Updated opening hour for the day.";
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Place not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid opening hour update.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.BadRequest;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating opening hour (day).");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }

        // ✅ PUT: /api/placeopening/{placeId}
        // อัปเดต “ทั้งสัปดาห์”
        [HttpPut("{placeId:int}")]
        public async Task<IActionResult> UpsertWeekly(int placeId, [FromBody] UpsertWeeklyOpeningHoursDto dto, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                await _hourService.UpsertWeeklyAsync(placeId, dto, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = "Updated weekly opening hours.";
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Place not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid weekly opening hours update.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.BadRequest;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating opening hours (weekly).");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }

        // ✅ DELETE: /api/placeopening/{placeId}
        // ลบเวลาทั้งหมดของสถานที่นั้น (รีเซ็ต)
        [HttpDelete("{placeId:int}")]
        public async Task<IActionResult> Delete(int placeId, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                await _hourService.DeleteByPlaceIdAsync(placeId, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = "Deleted opening hours.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting opening hours.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }
    }
}
