namespace KanjanaburiTravel.Dtos
{
    public class ApiResponse
    {
        public bool IsSuccess { get; set; } = true;
        public HttpStatusCode StatusCode { get; set; }
        public object? Result { get; set; }
        public List<string> ErrorMessages { get; set; } = new();
    }

}
