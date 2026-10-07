using GymManagementBLL.DTOs.Analytics;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    /// <summary>Read-only numbers for the admin dashboard. Every calculation runs in SQL (COUNT / SUM / GROUP BY).</summary>
    public interface IAnalyticsService
    {
        Task<AnalyticsSummaryResponse> GetSummaryAsync(CancellationToken ct = default);
        Task<RevenueResponse> GetRevenueAsync(RevenueQuery query, CancellationToken ct = default);
        Task<IReadOnlyList<MembersGrowthPoint>> GetMembersGrowthAsync(MembersGrowthQuery query, CancellationToken ct = default);
        Task<AttendanceRateResponse> GetAttendanceRateAsync(DateRangeQuery query, CancellationToken ct = default);
        Task<IReadOnlyList<PlanDistributionItem>> GetPlansDistributionAsync(CancellationToken ct = default);
        Task<IReadOnlyList<TopCategoryItem>> GetTopCategoriesAsync(TopCategoriesQuery query, CancellationToken ct = default);
    }
}
