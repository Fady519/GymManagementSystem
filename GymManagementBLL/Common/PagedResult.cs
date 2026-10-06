using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.Common
{
    /// <summary>One page of results plus the info the frontend needs to draw pagination.</summary>
    public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
    {
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
        public bool HasNextPage => Page < TotalPages;
        public bool HasPreviousPage => Page > 1;
    }

    public static class PaginationExtensions
    {
        public const int MaxPageSize = 100;

        /// <summary>
        /// Runs two SQL queries: COUNT(*) for the total, then OFFSET/FETCH for one page.
        /// The query must be ordered (OrderBy) before calling this, so pages are stable.
        /// </summary>
        public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
            this IQueryable<T> query, int page, int pageSize, CancellationToken ct = default)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            var totalCount = await query.CountAsync(ct);
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

            return new PagedResult<T>(items, page, pageSize, totalCount);
        }
    }
}
