using TravelKanjanuburi.Dtos.Places;
using TravelKanjanuburi.Services.Places;
using static TravelKanjanuburi.Model.Paged;

namespace TravelKanjanuburi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlaceTagController : BaseApiController
    {
        private readonly PlaceTagService _tagService;
        private readonly ILogger<PlaceController> _logger;

        public PlaceTagController(PlaceTagService tagService, ILogger<PlaceController> logger)
        {
            _tagService = tagService;
            _logger = logger;
        }
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] PagedQuery q, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                var profile = await _tagService.GetAllAsync(q, ct);

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
                var profile = await _tagService.GetTagsIdAsync(id, ct);

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
        public async Task<IActionResult> Create([FromBody] TagDto req, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                await _tagService.CreateTagsAsync(req, ct);

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
                _logger.LogError(ex, "Error updating Create Role.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }

            return HandleResponse(response);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, TagDto updatePlace, CancellationToken ct)
        {
            var response = new ApiResponse();
            try
            {
                await _tagService.UpdateTagsAsync(id, updatePlace, ct);

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
                await _tagService.DeleteTagsAsync(id, ct);

                response.StatusCode = HttpStatusCode.NoContent;
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
    }
}
