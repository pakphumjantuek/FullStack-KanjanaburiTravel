public class BaseApiController : ControllerBase
{
    protected IActionResult HandleResponse(ApiResponse response)
    {
        return StatusCode((int)response.StatusCode, response);
    }
}
