using TravelKanjanuburi.Services.Places;
using TravelKanjanuburi.Model.MPlaces.Reviews;

namespace TravelKanjanuburi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlaceReviewController : BaseApiController
    {
        private readonly PlaceReviewService _placeReview;
        private readonly ILogger<PlaceReviewController> _logger;

        public PlaceReviewController(PlaceReviewService placeReview, ILogger<PlaceReviewController> logger)
        {
            _placeReview = placeReview;
            _logger = logger;
        }

        // GET: api/PlaceReview/place/123?skip=0&take=20
        [HttpGet("place/{placeId:int}")]
        public async Task<IActionResult> GetReviewsByPlace(
            int placeId,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 20,
            CancellationToken ct = default)
        {
            var response = new ApiResponse();
            try
            {
                var reviews = await _placeReview.GetByPlaceIdAsync(placeId, skip, take, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = reviews;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting reviews by placeId={PlaceId}", placeId);
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }

            return HandleResponse(response);
        }

        // GET: api/PlaceReview/my?placeId=123
        [HttpGet("my")]
        public async Task<IActionResult> GetMyReview([FromQuery] int placeId, CancellationToken ct = default)
        {
            var response = new ApiResponse();
            try
            {
                var userId = GetUserIdOrThrow();
                var review = await _placeReview.GetMyReviewAsync(placeId, userId, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = review; // null ได้ ถ้ายังไม่เคยรีวิว
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.Unauthorized;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my review placeId={PlaceId}", placeId);
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }

            return HandleResponse(response);
        }

        // POST: api/PlaceReview/place/123
        // body: { "rating": 5, "comment": "ดีมาก" }
        [HttpPost("place/{placeId:int}")]
        public async Task<IActionResult> UpsertMyReview(
            int placeId,
            [FromBody] UpsertPlaceReviewDto dto,
            CancellationToken ct = default)
        {
            var response = new ApiResponse();
            try
            {
                var userId = GetUserIdOrThrow();

                var saved = await _placeReview.AddOrUpdateAsync(
                    placeId,
                    userId,
                    dto.Rating,
                    dto.Comment,
                    ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = saved;
            }
            catch (ArgumentOutOfRangeException ex)
            {
                _logger.LogWarning(ex, "Invalid rating.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.BadRequest;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Place not found placeId={PlaceId}", placeId);
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.Unauthorized;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error upserting review placeId={PlaceId}", placeId);
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }

            return HandleResponse(response);
        }

        // DELETE: api/PlaceReview/place/123
        [HttpDelete("place/{placeId:int}")]
        public async Task<IActionResult> DeleteMyReview(int placeId, CancellationToken ct = default)
        {
            var response = new ApiResponse();
            try
            {
                var userId = GetUserIdOrThrow();
                await _placeReview.DeleteAsync(placeId, userId, ct);

                response.StatusCode = HttpStatusCode.OK;
                response.Result = "Deleted";
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Place not found placeId={PlaceId}", placeId);
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.NotFound;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized.");
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.Unauthorized;
                response.ErrorMessages.Add(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting review placeId={PlaceId}", placeId);
                response.IsSuccess = false;
                response.StatusCode = HttpStatusCode.InternalServerError;
                response.ErrorMessages.Add("เกิดข้อผิดพลาดภายในระบบ");
            }

            return HandleResponse(response);
        }

        private int GetUserIdOrThrow()
        {
            var s =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                User.FindFirst("userId")?.Value ??
                User.FindFirst("UserId")?.Value ??
                User.FindFirst("id")?.Value;

            if (int.TryParse(s, out var id) && id > 0) return id;
            throw new UnauthorizedAccessException("No user id claim");
        }
    }
}
