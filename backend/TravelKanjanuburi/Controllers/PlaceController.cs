using TravelKanjanuburi.Dtos.Food;
using TravelKanjanuburi.Dtos.Places;
using TravelKanjanuburi.Services.Places;
using static TravelKanjanuburi.Model.Paged;

namespace TravelKanjanuburi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlaceController : BaseApiController
    {
        private readonly PlaceService _placeService;
        private readonly ILogger<PlaceController> _logger;

        public PlaceController(PlaceService placeService, ILogger<PlaceController> logger)
        {
            _placeService = placeService;
            _logger = logger;
        }
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] PagedQuery q, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var profile = await _placeService.GetAllAsync(q, ct);

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
                var profile = await _placeService.GetPlaceByIdAsync(id, ct);

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
        public async Task<IActionResult> Create([FromBody] CreatePlaceRequest req, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var dto = await _placeService.CreatePlaceAsync(req, ct);

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
        public async Task<IActionResult> Update(int id, UpdatePlaceRequest updatePlace, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
              var dto =  await _placeService.UpdatePlaceAsync(id, updatePlace, ct);

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
                await _placeService.DeletePlaceAsync(id, ct);

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
        public async Task<IActionResult> UploadImagesBatch(int id,[FromForm] List<IFormFile> files,[FromForm] int coverIndex = 0,
               [FromForm] bool replaceOld = false, CancellationToken ct = default)
        {
            var response = new ApiResponse();
            try
            {
                await _placeService.UploadImagesAsync(id, files, coverIndex, replaceOld, ct);
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
                await _placeService.DeleteImageAsync(placeId, imageId, ct);
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

        [HttpGet("{placeId:int}/dishes")]
        public async Task<IActionResult> GetDishesByPlaceId(int placeId, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var result = await _placeService.GetDishesByPlaceIdAsync(placeId, ct);
                response.StatusCode = HttpStatusCode.OK;
                response.Result = result;
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Place not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dishes by place.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }

        [HttpDelete("{placeId:int}/dishes/{dishId:int}")]
        public async Task<IActionResult> DeleteDishFromPlace(int placeId, int dishId, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                await _placeService.DeletePlaceDishAsync(placeId, dishId, ct);
                response.StatusCode = HttpStatusCode.OK;
                response.Result = "OK";
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Link not found.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting dish from place.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }
            return HandleResponse(response);
        }

        [HttpPost("{placeId}/dishes")]
        public async Task<IActionResult> UpsertDishToPlace(int placeId, [FromBody] UpsertPlaceDishRequest req, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                await _placeService.UpsertPlaceDishAsync(placeId, req, ct);
                response.StatusCode = HttpStatusCode.OK;
                response.Result = "OK";
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




    }
}
