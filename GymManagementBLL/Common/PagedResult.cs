using GymManagementBLL.Errors;
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

        /// <summary>
        /// All rows of an (ordered) list for an Excel/CSV export, or an error when there are more than
        /// <paramref name="maxRows"/>. One SQL query: it asks for maxRows + 1 rows; getting the extra
        /// row means "too many" (no separate COUNT needed).
        /// </summary>
        public static async Task<Result<IReadOnlyList<T>>> ToExportListAsync<T>(
            this IQueryable<T> query, int maxRows, CancellationToken ct = default)
        {
            var rows = await query.Take(maxRows + 1).ToListAsync(ct);

            if (rows.Count > maxRows)
                return ExportErrors.TooManyRows(maxRows);

            return Result.Success<IReadOnlyList<T>>(rows);
        }
    }
}
