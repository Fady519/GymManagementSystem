using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Analytics;
using GymManagementBLL.DTOs.Memberships;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.BusinessServices.Implementation
{
    /// <summary>
    /// Dashboard numbers. Two rules used everywhere in this file:
    /// 1. All the work happens in SQL (COUNT / SUM / GROUP BY): only small result rows come back, never whole tables.
    /// 2. "Today" and "this month" are the gym's local days. The database stores UTC, so a payment at
    ///    01:00 Cairo time (22:00 UTC the day before) must count for the Cairo day. SQL Server converts
    ///    with AT TIME ZONE, which knows Egypt's summer time.
    /// </summary>
    public class AnalyticsService : IAnalyticsService
    {
        private const int DefaultRangeDays = 30;
        private const int DefaultMonths = 12;

        private readonly IUnitOfWork _unitOfWork;
        private readonly IClock _clock;
        private readonly GymTimeZone _gymTime;
        private readonly IMembershipService _membershipService;

        public AnalyticsService(IUnitOfWork unitOfWork, IClock clock, GymTimeZone gymTime, IMembershipService membershipService)
        {
            _unitOfWork = unitOfWork;
            _clock = clock;
            _gymTime = gymTime;
            _membershipService = membershipService;
        }

        #region Summary

        public async Task<AnalyticsSummaryResponse> GetSummaryAsync(CancellationToken ct = default)
        {
            var now = _clock.UtcNow;
            var today = _gymTime.LocalDate(now);
            var todayStartUtc = _gymTime.StartOfDayUtc(today);
            var monthStartUtc = _gymTime.StartOfDayUtc(new DateOnly(today.Year, today.Month, 1));

            var members = _unitOfWork.GetRepository<Member>().Query();

            var totalMembers = await members.CountAsync(ct);

            // M8 fix: the old dashboard counted memberships, so a member with a renewal was counted twice.
            // Here we count MEMBERS that have a running, not frozen membership (each member once).
            var activeMembers = await members.CountAsync(m => m.Memberships.Any(x =>
                x.Status != MembershipStatus.Cancelled && x.StartDate <= now && x.EndDate > now
                && !(x.Status == MembershipStatus.Frozen && x.FrozenUntil > now)), ct);

            // Frozen = no usable membership right now, but one that is frozen (same rule as the members list).
            var frozenMembers = await members.CountAsync(m =>
                !m.Memberships.Any(x => x.Status != MembershipStatus.Cancelled && x.StartDate <= now && x.EndDate > now
                    && !(x.Status == MembershipStatus.Frozen && x.FrozenUntil > now))
                && m.Memberships.Any(x => x.Status == MembershipStatus.Frozen && x.FrozenUntil > now && x.EndDate > now), ct);

            var newMembersThisMonth = await members.CountAsync(m => m.CreatedAt >= monthStartUtc, ct);

            // Reuses the exact "expiring soon" rule of the memberships page (no second copy of the rule).
            var expiringSoon = (await _membershipService.GetExpiringSoonAsync(new ExpiringSoonQuery(), ct)).Count;

            var revenueToday = await NetRevenueAsync(todayStartUtc, ct);
            var revenueThisMonth = await NetRevenueAsync(monthStartUtc, ct);

            var checkInsToday = await _unitOfWork.GetRepository<CheckIn>()
                .CountAsync(c => c.Day == today && c.Result == CheckInResult.Allowed, ct);

            var sessions = _unitOfWork.GetRepository<Session>().Query().Where(s => s.Status == SessionStatus.Scheduled);

            // C6 fix: the old code compared EndDate with itself (always true), so finished sessions
            // were "ongoing" forever. Ongoing = started AND not ended yet.
            var ongoingSessions = await sessions.CountAsync(s => s.StartDate <= now && s.EndDate > now, ct);
            var upcomingSessions = await sessions.CountAsync(s => s.StartDate > now, ct);

            var totalTrainers = await _unitOfWork.GetRepository<Trainer>().CountAsync(null, ct);

            return new AnalyticsSummaryResponse(
                totalMembers, activeMembers, frozenMembers, newMembersThisMonth, expiringSoon,
                revenueToday, revenueThisMonth, checkInsToday, ongoingSessions, upcomingSessions, totalTrainers, now);
        }

        #endregion

        #region Revenue

        public async Task<RevenueResponse> GetRevenueAsync(RevenueQuery query, CancellationToken ct = default)
        {
            var today = _gymTime.LocalDate(_clock.UtcNow);
            var (from, to) = query.Period == RevenuePeriod.Monthly
                ? ResolveRange(query.From, query.To, FirstOfMonth(today).AddMonths(-(DefaultMonths - 1)), today)
                : ResolveRange(query.From, query.To, today.AddDays(-(DefaultRangeDays - 1)), today);

            // SQL returns one row per local day that has payments; months are added up here from those rows
            // (at most ~1100 small rows), so there is only one SQL query to understand.
            var days = await GetDailyRevenueAsync(from, to, ct);

            var points = query.Period == RevenuePeriod.Monthly
                ? EachMonth(from, to).Select(month => Point(month, days.Where(d => FirstOfMonth(d.Day) == month))).ToList()
                : EachDay(from, to).Select(day => Point(day, days.Where(d => d.Day == day))).ToList();

            var income = points.Sum(p => p.Income);
            var refunds = points.Sum(p => p.Refunds);

            return new RevenueResponse(query.Period, from, to, income, refunds, income - refunds, points);
        }

        #endregion

        #region Members growth

        public async Task<IReadOnlyList<MembersGrowthPoint>> GetMembersGrowthAsync(MembersGrowthQuery query, CancellationToken ct = default)
        {
            var today = _gymTime.LocalDate(_clock.UtcNow);
            var firstMonth = FirstOfMonth(today).AddMonths(-(query.Months - 1));
            var fromUtc = _gymTime.StartOfDayUtc(firstMonth);
            var tz = _gymTime.SqlServerZoneId;

            var members = _unitOfWork.GetRepository<Member>().Query();

            // Members that joined before the chart starts = the starting total.
            var total = await members.CountAsync(m => m.CreatedAt < fromUtc, ct);

            var perMonth = await members
                .Where(m => m.CreatedAt >= fromUtc)
                .Select(m => EF.Functions.AtTimeZone(EF.Functions.AtTimeZone(m.CreatedAt, "UTC"), tz))
                .GroupBy(local => new { local.Year, local.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                .ToListAsync(ct);

            var points = new List<MembersGrowthPoint>();
            foreach (var month in EachMonth(firstMonth, today))
            {
                var joined = perMonth.FirstOrDefault(x => x.Year == month.Year && x.Month == month.Month)?.Count ?? 0;
                total += joined;
                points.Add(new MembersGrowthPoint(month, joined, total));
            }
            return points;
        }

        #endregion

        #region Attendance

        public async Task<AttendanceRateResponse> GetAttendanceRateAsync(DateRangeQuery query, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;
            var today = _gymTime.LocalDate(now);
            var (from, to) = ResolveRange(query.From, query.To, today.AddDays(-(DefaultRangeDays - 1)), today);
            var fromUtc = _gymTime.StartOfDayUtc(from);
            var toUtc = _gymTime.StartOfDayUtc(to.AddDays(1));

            // Only sessions that already ended: for a future session nobody can have attended yet.
            var bookings = _unitOfWork.GetRepository<Booking>().Query().IgnoreQueryFilters()
                .Where(b => b.Status != BookingStatus.Cancelled
                    && b.Session.Status == SessionStatus.Scheduled
                    && b.Session.StartDate >= fromUtc && b.Session.StartDate < toUtc
                    && b.Session.EndDate <= now);

            var counts = await bookings
                .GroupBy(_ => 1)
                .Select(g => new { Total = g.Count(), Attended = g.Count(b => b.Status == BookingStatus.Attended) })
                .FirstOrDefaultAsync(ct);

            var total = counts?.Total ?? 0;
            var attended = counts?.Attended ?? 0;
            var rate = total == 0 ? 0 : Math.Round(attended * 100m / total, 1);

            return new AttendanceRateResponse(from, to, total, attended, total - attended, rate);
        }

        #endregion

        #region Plans and categories

        public async Task<IReadOnlyList<PlanDistributionItem>> GetPlansDistributionAsync(CancellationToken ct = default)
        {
            var now = _clock.UtcNow;

            // Running memberships of members that still exist (frozen ones count: the member is still subscribed).
            var counts = await _unitOfWork.GetRepository<Membership>().Query()
                .Where(m => m.Status != MembershipStatus.Cancelled && m.StartDate <= now && m.EndDate > now && !m.Member.IsDeleted)
                .GroupBy(m => m.PlanId)
                .Select(g => new { PlanId = g.Key, Count = g.Count() })
                .ToListAsync(ct);

            var planIds = counts.Select(c => c.PlanId).ToList();

            // IgnoreQueryFilters: a deleted plan can still have running memberships.
            var names = await _unitOfWork.GetRepository<Plan>().Query().IgnoreQueryFilters()
                .Where(p => planIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

            var total = counts.Sum(c => c.Count);

            return counts
                .Select(c => new PlanDistributionItem(c.PlanId, names.GetValueOrDefault(c.PlanId, "Plan " + c.PlanId), c.Count,
                    Math.Round(c.Count * 100m / total, 1)))
                .OrderByDescending(p => p.ActiveMemberships).ThenBy(p => p.PlanName)
                .ToList();
        }

        public async Task<IReadOnlyList<TopCategoryItem>> GetTopCategoriesAsync(TopCategoriesQuery query, CancellationToken ct = default)
        {
            var today = _gymTime.LocalDate(_clock.UtcNow);
            var (from, to) = ResolveRange(query.From, query.To, today.AddDays(-(DefaultRangeDays - 1)), today);
            var fromUtc = _gymTime.StartOfDayUtc(from);
            var toUtc = _gymTime.StartOfDayUtc(to.AddDays(1));

            var top = await _unitOfWork.GetRepository<Booking>().Query().IgnoreQueryFilters()
                .Where(b => b.Status != BookingStatus.Cancelled
                    && b.Session.Status == SessionStatus.Scheduled
                    && b.Session.StartDate >= fromUtc && b.Session.StartDate < toUtc)
                .GroupBy(b => b.Session.CategoryId)
                .Select(g => new
                {
                    CategoryId = g.Key,
                    Bookings = g.Count(),
                    Attended = g.Count(b => b.Status == BookingStatus.Attended)
                })
                .OrderByDescending(x => x.Bookings).ThenBy(x => x.CategoryId)
                .Take(query.Take)
                .ToListAsync(ct);

            var ids = top.Select(t => t.CategoryId).ToList();
            var names = await _unitOfWork.GetRepository<Category>().Query().IgnoreQueryFilters()
                .Where(c => ids.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

            return top
                .Select(t => new TopCategoryItem(t.CategoryId, names.GetValueOrDefault(t.CategoryId, "Category " + t.CategoryId), t.Bookings, t.Attended))
                .ToList();
        }

        #endregion

        #region Helper Methods

        private sealed record DailyRevenue(DateOnly Day, decimal Income, decimal Refunds);

        /// <summary>Money in minus refunds since <paramref name="fromUtc"/>.</summary>
        private async Task<decimal> NetRevenueAsync(DateTime fromUtc, CancellationToken ct)
            // IgnoreQueryFilters: money from a member who was deleted later is still revenue.
            => await _unitOfWork.GetRepository<Payment>().Query().IgnoreQueryFilters()
                .Where(p => p.PaidAt >= fromUtc)
                .SumAsync(p => p.Type == PaymentType.Refund ? -p.Amount : p.Amount, ct);

        /// <summary>
        /// One row per gym-local day that has payments. In SQL:
        /// GROUP BY the year/month/day of (PaidAt AT TIME ZONE 'UTC' AT TIME ZONE 'Egypt Standard Time').
        /// The first AT TIME ZONE says "this value is UTC", the second converts it to Cairo time.
        /// </summary>
        private async Task<List<DailyRevenue>> GetDailyRevenueAsync(DateOnly from, DateOnly to, CancellationToken ct)
        {
            var fromUtc = _gymTime.StartOfDayUtc(from);
            var toUtc = _gymTime.StartOfDayUtc(to.AddDays(1));
            var tz = _gymTime.SqlServerZoneId;

            var rows = await _unitOfWork.GetRepository<Payment>().Query().IgnoreQueryFilters()
                .Where(p => p.PaidAt >= fromUtc && p.PaidAt < toUtc)
                .Select(p => new
                {
                    Local = EF.Functions.AtTimeZone(EF.Functions.AtTimeZone(p.PaidAt, "UTC"), tz),
                    p.Amount,
                    p.Type
                })
                .GroupBy(x => new { x.Local.Year, x.Local.Month, x.Local.Day })
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Month,
                    g.Key.Day,
                    Income = g.Sum(x => x.Type == PaymentType.Refund ? 0m : x.Amount),
                    Refunds = g.Sum(x => x.Type == PaymentType.Refund ? x.Amount : 0m)
                })
                .ToListAsync(ct);

            return rows.Select(r => new DailyRevenue(new DateOnly(r.Year, r.Month, r.Day), r.Income, r.Refunds)).ToList();
        }

        private static RevenuePoint Point(DateOnly period, IEnumerable<DailyRevenue> days)
        {
            var income = days.Sum(d => d.Income);
            var refunds = days.Sum(d => d.Refunds);
            return new RevenuePoint(period, income, refunds, income - refunds);
        }

        /// <summary>The range the user asked for, or the default one (the validator makes sure both or neither are sent).</summary>
        private static (DateOnly From, DateOnly To) ResolveRange(DateOnly? from, DateOnly? to, DateOnly defaultFrom, DateOnly defaultTo)
            => from is not null && to is not null ? (from.Value, to.Value) : (defaultFrom, defaultTo);

        private static DateOnly FirstOfMonth(DateOnly day) => new(day.Year, day.Month, 1);

        private static IEnumerable<DateOnly> EachDay(DateOnly from, DateOnly to)
        {
            for (var day = from; day <= to; day = day.AddDays(1))
                yield return day;
        }

        private static IEnumerable<DateOnly> EachMonth(DateOnly from, DateOnly to)
        {
            for (var month = FirstOfMonth(from); month <= to; month = month.AddMonths(1))
                yield return month;
        }

        #endregion
    }
}
