namespace GymManagementBLL.DTOs.Analytics
{
    /// <summary>The numbers on top of the dashboard. "Today" / "this month" use the gym's local time.</summary>
    public sealed record AnalyticsSummaryResponse(
        int TotalMembers,
        int ActiveMembers,
        int FrozenMembers,
        int NewMembersThisMonth,
        int ExpiringSoon,
        decimal RevenueToday,
        decimal RevenueThisMonth,
        int CheckInsToday,
        int OngoingSessions,
        int UpcomingSessions,
        int TotalTrainers,
        DateTime GeneratedAt);

    public enum RevenuePeriod
    {
        Daily = 0,
        Monthly = 1
    }

    /// <summary>
    /// From/To are gym-local days (inclusive). Empty = a default range:
    /// the last 30 days (Daily) or the last 12 months (Monthly).
    /// </summary>
    public sealed class RevenueQuery
    {
        public RevenuePeriod Period { get; set; } = RevenuePeriod.Daily;
        public DateOnly? From { get; set; }
        public DateOnly? To { get; set; }
    }

    /// <summary>One bar of the revenue chart. Period = the day, or the first day of the month.</summary>
    public sealed record RevenuePoint(DateOnly Period, decimal Income, decimal Refunds, decimal Net);

    /// <summary>Every day/month of the range is listed, also those without payments (0), so charts have no gaps.</summary>
    public sealed record RevenueResponse(
        RevenuePeriod Period,
        DateOnly From,
        DateOnly To,
        decimal TotalIncome,
        decimal TotalRefunds,
        decimal TotalNet,
        IReadOnlyList<RevenuePoint> Points);

    /// <summary>From/To are gym-local days (inclusive). Empty = the last 30 days.</summary>
    public sealed class DateRangeQuery
    {
        public DateOnly? From { get; set; }
        public DateOnly? To { get; set; }
    }

    /// <summary>Months = how many months back, including the current one (default 12).</summary>
    public sealed class MembersGrowthQuery
    {
        public int Months { get; set; } = 12;
    }

    /// <summary>Month = the first day of the month. TotalMembers = members at the end of that month.</summary>
    public sealed record MembersGrowthPoint(DateOnly Month, int NewMembers, int TotalMembers);

    /// <summary>
    /// Bookings of sessions that already finished in the range (cancelled sessions/bookings are not counted).
    /// RatePercent = Attended / Bookings * 100.
    /// </summary>
    public sealed record AttendanceRateResponse(
        DateOnly From,
        DateOnly To,
        int Bookings,
        int Attended,
        int NoShows,
        decimal RatePercent);

    /// <summary>How many members are subscribed to each plan right now.</summary>
    public sealed record PlanDistributionItem(int PlanId, string PlanName, int ActiveMemberships, decimal Percent);

    /// <summary>From/To like DateRangeQuery; Take = how many categories (default 5).</summary>
    public sealed class TopCategoriesQuery
    {
        public DateOnly? From { get; set; }
        public DateOnly? To { get; set; }
        public int Take { get; set; } = 5;
    }

    /// <summary>Bookings = not cancelled bookings of sessions that start in the range.</summary>
    public sealed record TopCategoryItem(int CategoryId, string CategoryName, int Bookings, int Attended);
}
