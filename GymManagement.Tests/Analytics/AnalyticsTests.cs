using GymManagement.Tests.Infrastructure;
using GymManagement.Tests.Memberships;
using GymManagementBLL.DTOs.Analytics;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Analytics
{
    /// <summary>
    /// The test database is shared by all tests, so totals are checked in two ways:
    /// against SQL written by hand, or as a difference (call, add known data, call again).
    /// Charts use dates in 2024, where no other test creates data.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class AnalyticsTests(ApiFactory factory) : MembershipTestBase(factory)
    {
        private static readonly TimeZoneInfo Cairo = TimeZoneInfo.FindSystemTimeZoneById("Africa/Cairo");

        #region Summary

        [Fact]
        public async Task Summary_MatchesHandWrittenSql()
        {
            // Some data of every kind, so no number is trivially 0.
            var membership = await NewRunningMembershipAsync();
            await Admin.PostAsJsonAsync("/api/check-ins", new GymManagementBLL.DTOs.CheckIns.CheckInRequest(await GetCodeAsync(membership.MemberId)));

            var summary = await GetSummaryAsync();

            var now = DateTime.UtcNow;
            var cairoToday = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(now, Cairo));
            var monthStartUtc = TimeZoneInfo.ConvertTimeToUtc(new DateTime(cairoToday.Year, cairoToday.Month, 1), Cairo);

            await Factory.WithDbAsync(async db =>
            {
                Assert.Equal(await Scalar(db, $"SELECT COUNT(*) AS [Value] FROM Members WHERE IsDeleted = 0"), summary.TotalMembers);

                Assert.Equal(await Scalar(db, $@"
                    SELECT COUNT(*) AS [Value] FROM Members m
                    WHERE m.IsDeleted = 0 AND EXISTS (
                        SELECT 1 FROM Memberships x
                        WHERE x.MemberId = m.Id AND x.Status <> 'Cancelled' AND x.StartDate <= {now} AND x.EndDate > {now}
                          AND NOT (x.Status = 'Frozen' AND x.FrozenUntil > {now}))"), summary.ActiveMembers);

                Assert.Equal(await Scalar(db, $@"
                    SELECT COUNT(*) AS [Value] FROM Sessions
                    WHERE Status = 'Scheduled' AND StartDate <= {now} AND EndDate > {now}"), summary.OngoingSessions);

                Assert.Equal(await Scalar(db, $@"
                    SELECT COUNT(*) AS [Value] FROM Sessions WHERE Status = 'Scheduled' AND StartDate > {now}"), summary.UpcomingSessions);

                Assert.Equal(await Scalar(db, $@"
                    SELECT COUNT(*) AS [Value] FROM CheckIns WHERE Day = {cairoToday} AND Result = 'Allowed'"), summary.CheckInsToday);

                Assert.Equal(await Scalar(db, $"SELECT COUNT(*) AS [Value] FROM Trainers WHERE IsDeleted = 0"), summary.TotalTrainers);

                var revenue = await db.Database.SqlQuery<decimal>($@"
                    SELECT ISNULL(SUM(CASE WHEN Type = 'Refund' THEN -Amount ELSE Amount END), 0) AS [Value]
                    FROM Payments WHERE PaidAt >= {monthStartUtc}").SingleAsync();
                Assert.Equal(revenue, summary.RevenueThisMonth);
            });

            Assert.True(summary.ActiveMembers >= 1);
            Assert.True(summary.CheckInsToday >= 1);
        }

        [Fact]
        public async Task Summary_ActiveMembers_CountsMembersNotMemberships()
        {
            // M8 regression: one member with two running memberships is ONE active member.
            var before = await GetSummaryAsync();

            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            var now = DateTime.UtcNow;
            await InsertMembershipAsync(memberId, plan, now.AddDays(-5), now.AddDays(25));
            await InsertMembershipAsync(memberId, plan, now.AddDays(-1), now.AddDays(29));

            var after = await GetSummaryAsync();

            Assert.Equal(before.ActiveMembers + 1, after.ActiveMembers);
            Assert.Equal(before.TotalMembers + 1, after.TotalMembers);
        }

        [Fact]
        public async Task Summary_FinishedSession_IsNotOngoing()
        {
            // C6 regression: a session that ended yesterday must not count as "ongoing".
            var before = await GetSummaryAsync();

            await Factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                await TestData.AddSessionAsync(db, trainer.Id, startUtc: DateTime.UtcNow.AddDays(-1), durationMinutes: 60);
                await TestData.AddSessionAsync(db, trainer.Id, startUtc: DateTime.UtcNow.AddMinutes(-30), durationMinutes: 90);
            });

            var after = await GetSummaryAsync();

            Assert.Equal(before.OngoingSessions + 1, after.OngoingSessions);
        }

        [Fact]
        public async Task Summary_FrozenMember_IsCountedAsFrozen_NotActive()
        {
            var before = await GetSummaryAsync();

            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            var now = DateTime.UtcNow;
            await InsertMembershipAsync(memberId, plan, now.AddDays(-5), now.AddDays(25), MembershipStatus.Frozen, now.AddDays(3), 3);

            var after = await GetSummaryAsync();

            Assert.Equal(before.FrozenMembers + 1, after.FrozenMembers);
            Assert.Equal(before.ActiveMembers, after.ActiveMembers);
        }

        #endregion

        #region Revenue

        [Fact]
        public async Task Revenue_Daily_UsesCairoDays_SubtractsRefunds_AndFillsEmptyDays()
        {
            await AddPaymentsNearCairoMidnightAsync(2024, 7);

            var revenue = (await Admin.GetFromJsonAsync<RevenueResponse>(
                "/api/analytics/revenue?period=Daily&from=2024-07-13&to=2024-07-15", Json))!;

            Assert.Equal(3, revenue.Points.Count);
            Assert.Equal(new RevenuePoint(new DateOnly(2024, 7, 13), 0, 0, 0), revenue.Points[0]);
            // 20:30 UTC = 23:30 in Cairo (summer time, UTC+3): still the 14th.
            Assert.Equal(new RevenuePoint(new DateOnly(2024, 7, 14), 200, 0, 200), revenue.Points[1]);
            // 21:30 UTC on the 14th = 00:30 on the 15th in Cairo, plus a refund of 50 on the 15th.
            Assert.Equal(new RevenuePoint(new DateOnly(2024, 7, 15), 300, 50, 250), revenue.Points[2]);
            Assert.Equal(500, revenue.TotalIncome);
            Assert.Equal(50, revenue.TotalRefunds);
            Assert.Equal(450, revenue.TotalNet);
        }

        [Fact]
        public async Task Revenue_Monthly_GroupsByMonth()
        {
            await AddPaymentsNearCairoMidnightAsync(2024, 9);

            var revenue = (await Admin.GetFromJsonAsync<RevenueResponse>(
                "/api/analytics/revenue?period=Monthly&from=2024-08-01&to=2024-10-31", Json))!;

            Assert.Equal([new DateOnly(2024, 8, 1), new DateOnly(2024, 9, 1), new DateOnly(2024, 10, 1)], revenue.Points.Select(p => p.Period));
            Assert.Equal(new RevenuePoint(new DateOnly(2024, 9, 1), 500, 50, 450), revenue.Points[1]);
            Assert.Equal(0, revenue.Points[0].Net);
            Assert.Equal(0, revenue.Points[2].Net);
            Assert.Equal(450, revenue.TotalNet);
        }

        [Fact]
        public async Task Revenue_DefaultRange_IsTheLast30Days()
        {
            var revenue = (await Admin.GetFromJsonAsync<RevenueResponse>("/api/analytics/revenue", Json))!;

            Assert.Equal(RevenuePeriod.Daily, revenue.Period);
            Assert.Equal(30, revenue.Points.Count);
            Assert.Equal(DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Cairo)), revenue.To);
        }

        [Theory]
        [InlineData("/api/analytics/revenue?from=2024-01-01")]                                // only one side of the range
        [InlineData("/api/analytics/revenue?from=2024-02-01&to=2024-01-01")]                  // to before from
        [InlineData("/api/analytics/revenue?period=Daily&from=2023-01-01&to=2024-12-31")]     // too many days
        [InlineData("/api/analytics/revenue?period=Weekly")]                                   // unknown period
        [InlineData("/api/analytics/members-growth?months=0")]
        [InlineData("/api/analytics/top-categories?take=50")]
        [InlineData("/api/analytics/attendance-rate?to=2024-01-01")]
        public async Task InvalidQuery_Returns400(string url)
            => Assert.Equal(HttpStatusCode.BadRequest, (await Admin.GetAsync(url)).StatusCode);

        [Fact]
        public async Task Revenue_Monthly_CanCoverTwoYears()
            => Assert.Equal(HttpStatusCode.OK, (await Admin.GetAsync("/api/analytics/revenue?period=Monthly&from=2023-01-01&to=2024-12-31")).StatusCode);

        #endregion

        #region Members, attendance, plans, categories

        [Fact]
        public async Task MembersGrowth_NewMemberAddsToThisMonth()
        {
            var before = (await Admin.GetFromJsonAsync<List<MembersGrowthPoint>>("/api/analytics/members-growth?months=3", Json))!;
            await NewMemberAsync();
            var after = (await Admin.GetFromJsonAsync<List<MembersGrowthPoint>>("/api/analytics/members-growth?months=3", Json))!;

            var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Cairo));
            Assert.Equal(3, after.Count);
            Assert.Equal(new DateOnly(today.Year, today.Month, 1), after[^1].Month);
            Assert.Equal(before[^1].NewMembers + 1, after[^1].NewMembers);
            Assert.Equal(before[^1].TotalMembers + 1, after[^1].TotalMembers);
            // The running total of the last month = all members today.
            Assert.Equal((await GetSummaryAsync()).TotalMembers, after[^1].TotalMembers);
        }

        [Fact]
        public async Task AttendanceRate_CountsFinishedSessions_WithoutCancelledOnes()
        {
            var day = new DateTime(2024, 3, 10, 10, 0, 0, DateTimeKind.Utc);
            await Factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                var session = await TestData.AddSessionAsync(db, trainer.Id, startUtc: day);
                await AddBookingAsync(db, session.Id, BookingStatus.Attended);
                await AddBookingAsync(db, session.Id, BookingStatus.Attended);
                await AddBookingAsync(db, session.Id, BookingStatus.Booked);    // no-show
                await AddBookingAsync(db, session.Id, BookingStatus.Cancelled); // not counted

                var cancelledSession = await TestData.AddSessionAsync(db, trainer.Id, startUtc: day.AddHours(2));
                cancelledSession.Status = SessionStatus.Cancelled;
                await db.SaveChangesAsync();
                await AddBookingAsync(db, cancelledSession.Id, BookingStatus.Booked); // not counted
            });

            var rate = (await Admin.GetFromJsonAsync<AttendanceRateResponse>(
                "/api/analytics/attendance-rate?from=2024-03-10&to=2024-03-10", Json))!;

            Assert.Equal(3, rate.Bookings);
            Assert.Equal(2, rate.Attended);
            Assert.Equal(1, rate.NoShows);
            Assert.Equal(66.7m, rate.RatePercent);
        }

        [Fact]
        public async Task AttendanceRate_NoBookings_IsZeroNotAnError()
        {
            var rate = (await Admin.GetFromJsonAsync<AttendanceRateResponse>(
                "/api/analytics/attendance-rate?from=2024-01-01&to=2024-01-02", Json))!;

            Assert.Equal(0, rate.Bookings);
            Assert.Equal(0, rate.RatePercent);
        }

        [Fact]
        public async Task PlansDistribution_CountsRunningMembershipsOnly()
        {
            var plan = await NewPlanAsync();
            var now = DateTime.UtcNow;
            await InsertMembershipAsync(await NewMemberAsync(), plan, now.AddDays(-1), now.AddDays(29));
            await InsertMembershipAsync(await NewMemberAsync(), plan, now.AddDays(-1), now.AddDays(29), MembershipStatus.Frozen, now.AddDays(3), 3);
            await InsertMembershipAsync(await NewMemberAsync(), plan, now.AddDays(-1), now.AddDays(29), MembershipStatus.Cancelled);
            await InsertMembershipAsync(await NewMemberAsync(), plan, now.AddDays(-40), now.AddDays(-10));

            var items = (await Admin.GetFromJsonAsync<List<PlanDistributionItem>>("/api/analytics/plans-distribution", Json))!;

            var item = Assert.Single(items, i => i.PlanId == plan.Id);
            Assert.Equal(2, item.ActiveMemberships);
            Assert.Equal(plan.Name, item.PlanName);
            Assert.InRange(items.Sum(i => i.Percent), 99m, 101m);
        }

        [Fact]
        public async Task TopCategories_OrderedByBookings_AndLimitedByTake()
        {
            var day = new DateTime(2024, 3, 20, 9, 0, 0, DateTimeKind.Utc);
            int yogaId = 0, boxingId = 0;
            await Factory.WithDbAsync(async db =>
            {
                var yoga = new Category { Name = TestData.UniqueName("Yoga") };
                var boxing = new Category { Name = TestData.UniqueName("Boxing") };
                db.Categories.AddRange(yoga, boxing);
                await db.SaveChangesAsync();
                (yogaId, boxingId) = (yoga.Id, boxing.Id);

                var yogaSession = await TestData.AddSessionAsync(db, (await TestData.AddTrainerAsync(db, yoga.Id)).Id, startUtc: day);
                await AddBookingAsync(db, yogaSession.Id, BookingStatus.Attended);
                await AddBookingAsync(db, yogaSession.Id, BookingStatus.Booked);
                await AddBookingAsync(db, yogaSession.Id, BookingStatus.Booked);
                await AddBookingAsync(db, yogaSession.Id, BookingStatus.Cancelled); // not counted

                var boxingSession = await TestData.AddSessionAsync(db, (await TestData.AddTrainerAsync(db, boxing.Id)).Id, startUtc: day);
                await AddBookingAsync(db, boxingSession.Id, BookingStatus.Booked);
            });

            var top = (await Admin.GetFromJsonAsync<List<TopCategoryItem>>(
                "/api/analytics/top-categories?from=2024-03-20&to=2024-03-20", Json))!;
            var first = (await Admin.GetFromJsonAsync<List<TopCategoryItem>>(
                "/api/analytics/top-categories?from=2024-03-20&to=2024-03-20&take=1", Json))!;

            Assert.Equal([yogaId, boxingId], top.Select(t => t.CategoryId));
            Assert.Equal(3, top[0].Bookings);
            Assert.Equal(1, top[0].Attended);
            Assert.Equal(1, top[1].Bookings);
            Assert.Equal(yogaId, Assert.Single(first).CategoryId);
        }

        [Theory]
        [InlineData(AppRoles.Trainer)]
        [InlineData(AppRoles.Member)]
        public async Task OnlyAdmins_SeeAnalytics(string role)
        {
            var client = await Factory.CreateClientForRoleAsync(role);

            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/analytics/summary")).StatusCode);
        }

        #endregion

        #region Helpers

        private async Task<AnalyticsSummaryResponse> GetSummaryAsync()
            => (await Admin.GetFromJsonAsync<AnalyticsSummaryResponse>("/api/analytics/summary", Json))!;

        private static Task<int> Scalar(GymManagementDAL.Data.Contexts.GymDbContext db, FormattableString sql)
            => db.Database.SqlQuery<int>(sql).SingleAsync();

        private async Task<string> GetCodeAsync(int memberId)
        {
            var code = "";
            await Factory.WithDbAsync(async db => code = await db.Members.Where(m => m.Id == memberId).Select(m => m.CheckInToken).FirstAsync());
            return code;
        }

        /// <summary>A booking of a new member, with the given status.</summary>
        private static async Task AddBookingAsync(GymManagementDAL.Data.Contexts.GymDbContext db, int sessionId, BookingStatus status)
        {
            var member = await TestData.AddMemberAsync(db);
            db.Bookings.Add(new Booking { MemberId = member.Id, SessionId = sessionId, Status = status });
            await db.SaveChangesAsync();
        }

        /// <summary>
        /// In the given month (Cairo summer time, UTC+3): 200 at 23:30 on the 14th, 300 at 00:30 on the 15th
        /// (21:30 UTC on the 14th) and a refund of 50 on the 15th.
        /// </summary>
        private async Task AddPaymentsNearCairoMidnightAsync(int year, int month)
        {
            var plan = await NewPlanAsync();
            var membership = await InsertMembershipAsync(await NewMemberAsync(), plan,
                new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(year, month, 28, 0, 0, 0, DateTimeKind.Utc));

            await Factory.WithDbAsync(async db =>
            {
                db.Payments.AddRange(
                    Payment(membership.Id, 200, PaymentType.Purchase, new DateTime(year, month, 14, 20, 30, 0, DateTimeKind.Utc)),
                    Payment(membership.Id, 300, PaymentType.Renewal, new DateTime(year, month, 14, 21, 30, 0, DateTimeKind.Utc)),
                    Payment(membership.Id, 50, PaymentType.Refund, new DateTime(year, month, 15, 10, 0, 0, DateTimeKind.Utc)));
                await db.SaveChangesAsync();
            });
        }

        private static Payment Payment(int membershipId, decimal amount, PaymentType type, DateTime paidAt)
            => new() { MembershipId = membershipId, Amount = amount, Type = type, Method = PaymentMethod.Cash, PaidAt = paidAt };

        #endregion
    }
}
