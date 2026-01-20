namespace TravelKanjanuburi.Model
{
    public class Paged
    {
        public record PagedQuery(int Page = 1, int PageSize = 20, string? Search = null);
        public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, long Total);
    }
}
