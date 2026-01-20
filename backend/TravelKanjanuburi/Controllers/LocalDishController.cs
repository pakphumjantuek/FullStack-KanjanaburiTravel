
using TravelKanjanuburi.Dtos.Food;
using TravelKanjanuburi.Services.foods;
using TravelKanjanuburi.Services.Places;
using static TravelKanjanuburi.Model.Paged;

namespace TravelKanjanuburi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LocalDishController : BaseApiController
    {
        private readonly LocalDishService _localDishService;
        private readonly ILogger<LocalDishController> _logger;

        public LocalDishController(LocalDishService localDishService, ILogger<LocalDishController> logger)
        {
            _localDishService = localDishService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] PagedQuery q, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var profile = await _localDishService.GetAllAsync(q, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = profile;
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "User not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user profile.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetbyId(int id, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var profile = await _localDishService.GetLocalDishdishByIdAsync(id, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = profile;
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "User not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user profile.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateLocalDishRequest req, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var dto = await _localDishService.CreateLocalDishAsync(req, ct);

                response.IsSuccess = true;
                response.StatusCode = HttpStatusCode.Created;
                response.Result = dto;
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

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, CreateLocalDishRequest updateLocalDish, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var dto = await _localDishService.UpdateLocalDishAsync(id, updateLocalDish, ct);

                response.StatusCode = HttpStatusCode.Created;
                response.Result = null;
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "User not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user Role.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                await _localDishService.DeleteLocalDishAsync(id, ct);

                response.StatusCode = HttpStatusCode.NoContent;
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "User not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }

            return HandleResponse(response);
        }


        [HttpPost("{id}/images/batch")]
        public async Task<IActionResult> UploadImagesBatch(int id, [FromForm] List<IFormFile> files, [FromForm] int coverIndex = 0,
               [FromForm] bool replaceOld = false, CancellationToken ct = default)
        {
            var response = new ApiResponse();
            try
            {
                await _localDishService.UploadImagesAsync(id, files, coverIndex, replaceOld, ct);
                response.StatusCode = HttpStatusCode.Created;
            }
            catch (KeyNotFoundException ex)
            {
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading images.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }

        [HttpDelete("{placeId}/images/{imageId}")]
        public async Task<IActionResult> DeleteImage(int placeId, int imageId, CancellationToken ct = default)
        {
            var response = new ApiResponse();
            try
            {
                await _localDishService.DeleteImageAsync(placeId, imageId, ct);
                response.StatusCode = HttpStatusCode.OK;
            }
            catch (KeyNotFoundException ex)
            {
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting image.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }

        [HttpGet("{id}/places")]
        public async Task<IActionResult> GetPlacesByDishId(int id, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var places = await _localDishService.GetPlacesByDishIdAsync(id, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = places;
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Dish not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting places for dish.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }

            return HandleResponse(response);
        }


    }
}
