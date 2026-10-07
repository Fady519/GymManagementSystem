using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.DTOs.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>
    /// Dashboard numbers and charts (admins only). Dates in queries are gym-local days (yyyy-MM-dd, inclusive);
    /// send both from and to, or neither for the default range.
    /// </summary>
    [Route("api/analytics")]
    [Authorize(Policy = AppPolicies.AdminAccess)]
    public sealed class AnalyticsController(IAnalyticsService analyticsService) : ApiControllerBase
    {
        /// <summary>The cards on top of the dashboard (members, revenue, check-ins and sessions right now).</summary>
        [HttpGet("summary")]
        [ProducesResponseType<AnalyticsSummaryResponse>(StatusCodes.Status200OK)]
        public async Task<ActionResult<AnalyticsSummaryResponse>> GetSummary(CancellationToken ct)
            => Ok(await analyticsService.GetSummaryAsync(ct));

        /// <summary>Income, refunds and net revenue per day (default: last 30 days) or per month (default: last 12 months).</summary>
        [HttpGet("revenue")]
        [ProducesResponseType<RevenueResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<RevenueResponse>> GetRevenue([FromQuery] RevenueQuery query, CancellationToken ct)
            => Ok(await analyticsService.GetRevenueAsync(query, ct));

        /// <summary>New members per month and the running total.</summary>
        [HttpGet("members-growth")]
        [ProducesResponseType<IReadOnlyList<MembersGrowthPoint>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<IReadOnlyList<MembersGrowthPoint>>> GetMembersGrowth([FromQuery] MembersGrowthQuery query, CancellationToken ct)
            => Ok(await analyticsService.GetMembersGrowthAsync(query, ct));

        /// <summary>How many booked members actually came, for sessions that already ended (default: last 30 days).</summary>
        [HttpGet("attendance-rate")]
        [ProducesResponseType<AttendanceRateResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<AttendanceRateResponse>> GetAttendanceRate([FromQuery] DateRangeQuery query, CancellationToken ct)
            => Ok(await analyticsService.GetAttendanceRateAsync(query, ct));

        /// <summary>Running memberships per plan right now (for a pie chart).</summary>
        [HttpGet("plans-distribution")]
        [ProducesResponseType<IReadOnlyList<PlanDistributionItem>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<PlanDistributionItem>>> GetPlansDistribution(CancellationToken ct)
            => Ok(await analyticsService.GetPlansDistributionAsync(ct));

        /// <summary>The most booked session categories (default: last 30 days, top 5).</summary>
        [HttpGet("top-categories")]
        [ProducesResponseType<IReadOnlyList<TopCategoryItem>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<IReadOnlyList<TopCategoryItem>>> GetTopCategories([FromQuery] TopCategoriesQuery query, CancellationToken ct)
            => Ok(await analyticsService.GetTopCategoriesAsync(query, ct));
    }
}
