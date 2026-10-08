using GymManagement.Tests.Infrastructure;
using GymManagementBLL.DTOs.Analytics;
using GymManagementBLL.DTOs.Public;
using GymManagementBLL.DTOs.Settings;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Public
{
    /// <summary>
    /// The public landing page endpoints (/api/public/*, no login). The test database is shared,
    /// so the stats are checked as a difference: call, add known data, call again.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class PublicSiteTests(ApiFactory factory)
    {
        private readonly HttpClient _anonymous = factory.CreateHttpsClient();

        private async Task<PublicStatsResponse> GetStatsAsync()
            => (await _anonymous.GetFromJsonAsync<PublicStatsResponse>("/api/public/stats", Json))!;

        private async Task<List<PublicTrainerResponse>> GetTrainersAsync()
            => (await _anonymous.GetFromJsonAsync<List<PublicTrainerResponse>>("/api/public/trainers", Json))!;

        #region Access and privacy

        [Theory]
        [InlineData("/api/public/gym")]
        [InlineData("/api/public/stats")]
        [InlineData("/api/public/trainers")]
        public async Task Endpoints_WorkWithoutLogin(string url)
        {
            var response = await _anonymous.GetAsync(url);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task PublicGym_IsTheSameAsTheAdminSettings()
        {
            var admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);

            var publicGym = await _anonymous.GetFromJsonAsync<GymSettingsResponse>("/api/public/gym", Json);
            var adminGym = await admin.GetFromJsonAsync<GymSettingsResponse>("/api/settings/gym", Json);

            Assert.Equal(adminGym, publicGym);
            Assert.False(string.IsNullOrWhiteSpace(publicGym!.GymName));
        }

        [Fact]
        public async Task Trainers_HaveNoPersonalData()
        {
            await factory.WithDbAsync(db => TestData.AddTrainerAsync(db));

            var json = await _anonymous.GetFromJsonAsync<JsonElement>("/api/public/trainers");

            Assert.NotEqual(0, json.GetArrayLength());
            foreach (var trainer in json.EnumerateArray())
            {
                // Exactly these public fields, nothing else.
                var names = trainer.EnumerateObject().Select(p => p.Name).Order().ToArray();
                Assert.Equal(["categoryName", "id", "joinedAt", "name", "upcomingClasses"], names);

                foreach (var secret in new[] { "email", "phone", "dateOfBirth", "address", "userId", "gender" })
                    Assert.False(trainer.TryGetProperty(secret, out _), $"Public trainer JSON exposes '{secret}'.");
            }
        }

        #endregion

        #region Trainers

        [Fact]
        public async Task Trainers_AreOrderedByUpcomingClasses_ThenByName()
        {
            // Unique prefix, so only our three trainers are compared (other tests add trainers too).
            var prefix = TestData.UniquePersonName("Coach");
            int alpha = 0, beta = 0, gamma = 0;
            string categoryName = null!;

            await factory.WithDbAsync(async db =>
            {
                alpha = await AddNamedTrainerAsync(db, $"{prefix} Alpha");
                beta = await AddNamedTrainerAsync(db, $"{prefix} Beta");
                gamma = await AddNamedTrainerAsync(db, $"{prefix} Gamma");
                categoryName = await db.Trainers.Where(t => t.Id == gamma).Select(t => t.Category.Name).SingleAsync();

                var now = DateTime.UtcNow;

                // Gamma: 2 upcoming classes. The cancelled and the finished ones do not count.
                await TestData.AddSessionAsync(db, gamma, startUtc: now.AddDays(1));
                await TestData.AddSessionAsync(db, gamma, startUtc: now.AddDays(20));
                var cancelled = await TestData.AddSessionAsync(db, gamma, startUtc: now.AddDays(2));
                cancelled.Status = SessionStatus.Cancelled;
                await db.SaveChangesAsync();
                await TestData.AddSessionAsync(db, gamma, startUtc: now.AddDays(-3));

                // Alpha and Beta: 1 upcoming class each -> ordered by name.
                await TestData.AddSessionAsync(db, beta, startUtc: now.AddDays(1));
                await TestData.AddSessionAsync(db, alpha, startUtc: now.AddDays(3));
            });

            var ours = (await GetTrainersAsync()).Where(t => t.Name.StartsWith(prefix)).ToList();

            Assert.Equal([gamma, alpha, beta], ours.Select(t => t.Id));
            Assert.Equal([2, 1, 1], ours.Select(t => t.UpcomingClasses));
            Assert.Equal(categoryName, ours[0].CategoryName);
            Assert.True(Math.Abs((DateTime.UtcNow - ours[0].JoinedAt).TotalMinutes) < 5);
        }

        [Fact]
        public async Task Trainers_WholeList_IsSortedByUpcomingClassesDescending()
        {
            var trainers = await GetTrainersAsync();

            for (var i = 1; i < trainers.Count; i++)
                Assert.True(trainers[i - 1].UpcomingClasses >= trainers[i].UpcomingClasses);
        }

        [Fact]
        public async Task Trainers_DeletedTrainer_IsNotListed()
        {
            var trainerId = 0;
            await factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                trainerId = trainer.Id;
                db.Trainers.Remove(trainer); // soft delete
                await db.SaveChangesAsync();
            });

            Assert.DoesNotContain(await GetTrainersAsync(), t => t.Id == trainerId);
        }

        private static async Task<int> AddNamedTrainerAsync(GymManagementDAL.Data.Contexts.GymDbContext db, string name)
        {
            var trainer = await TestData.AddTrainerAsync(db);
            trainer.Name = name;
            await db.SaveChangesAsync();
            return trainer.Id;
        }

        #endregion

        #region Stats

        [Fact]
        public async Task Stats_CountOnlyWhatTheWebsiteShouldShow()
        {
            var before = await GetStatsAsync();
            var now = DateTime.UtcNow;

            await factory.WithDbAsync(async db =>
            {
                // +1: a running membership.
                var running = await TestData.AddMemberAsync(db);
                await TestData.AddMembershipToMemberAsync(db, running.Id, now.AddDays(-5), now.AddDays(25));

                // +1: two running memberships (a renewal) = still ONE member.
                var renewed = await TestData.AddMemberAsync(db);
                await TestData.AddMembershipToMemberAsync(db, renewed.Id, now.AddDays(-5), now.AddDays(25));
                await TestData.AddMembershipToMemberAsync(db, renewed.Id, now.AddDays(-1), now.AddDays(29));

                // +1: was frozen, but the freeze is already over -> active again.
                var unfrozen = await TestData.AddMemberAsync(db);
                var freezeOver = await TestData.AddMembershipToMemberAsync(db, unfrozen.Id, now.AddDays(-10), now.AddDays(20), MembershipStatus.Frozen);
                freezeOver.FrozenUntil = now.AddDays(-1);
                await db.SaveChangesAsync();

                // +0: frozen right now.
                var frozen = await TestData.AddMemberAsync(db);
                await TestData.AddMembershipToMemberAsync(db, frozen.Id, now.AddDays(-5), now.AddDays(25), MembershipStatus.Frozen);

                // +0: expired.
                var expired = await TestData.AddMemberAsync(db);
                await TestData.AddMembershipToMemberAsync(db, expired.Id, now.AddDays(-40), now.AddDays(-10));

                // +0: cancelled.
                var cancelled = await TestData.AddMemberAsync(db);
                await TestData.AddMembershipToMemberAsync(db, cancelled.Id, now.AddDays(-5), now.AddDays(25), MembershipStatus.Cancelled);

                // +0: starts next week.
                var future = await TestData.AddMemberAsync(db);
                await TestData.AddMembershipToMemberAsync(db, future.Id, now.AddDays(7), now.AddDays(37));

                // Trainers: +1 (the deleted one does not count).
                var trainer = await TestData.AddTrainerAsync(db);
                var deletedTrainer = await TestData.AddTrainerAsync(db);
                db.Trainers.Remove(deletedTrainer);
                await db.SaveChangesAsync();

                // Programs: +1.
                db.Categories.Add(new Category { Name = TestData.UniqueName("Program") });
                await db.SaveChangesAsync();

                // Classes this week: +1 (in 2 days). Cancelled, in 8 days and finished ones do not count.
                await TestData.AddSessionAsync(db, trainer.Id, startUtc: now.AddDays(2));
                var cancelledSession = await TestData.AddSessionAsync(db, trainer.Id, startUtc: now.AddDays(3));
                cancelledSession.Status = SessionStatus.Cancelled;
                await db.SaveChangesAsync();
                await TestData.AddSessionAsync(db, trainer.Id, startUtc: now.AddDays(8));
                await TestData.AddSessionAsync(db, trainer.Id, startUtc: now.AddDays(-1));
            });

            var after = await GetStatsAsync();

            Assert.Equal(before.ActiveMembers + 3, after.ActiveMembers);
            Assert.Equal(before.Trainers + 1, after.Trainers);
            Assert.Equal(before.Programs + 1, after.Programs);
            Assert.Equal(before.ClassesThisWeek + 1, after.ClassesThisWeek);
        }

        [Fact]
        public async Task Stats_ActiveMembers_IsTheSameNumberAsTheAdminDashboard()
        {
            var admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);

            var stats = await GetStatsAsync();
            var summary = await admin.GetFromJsonAsync<AnalyticsSummaryResponse>("/api/analytics/summary", Json);

            Assert.Equal(summary!.ActiveMembers, stats.ActiveMembers);
            Assert.Equal(summary.TotalTrainers, stats.Trainers);
        }

        [Fact]
        public async Task Stats_MatchHandWrittenSql()
        {
            var stats = await GetStatsAsync();
            var now = DateTime.UtcNow;

            await factory.WithDbAsync(async db =>
            {
                Assert.Equal(await Scalar(db, $"SELECT COUNT(*) AS [Value] FROM Categories WHERE IsDeleted = 0"), stats.Programs);
                Assert.Equal(await Scalar(db, $"SELECT COUNT(*) AS [Value] FROM Trainers WHERE IsDeleted = 0"), stats.Trainers);

                var cheapest = await db.Database.SqlQuery<decimal?>($@"
                    SELECT MIN(Price * 30 / DurationDays) AS [Value] FROM Plans WHERE IsActive = 1 AND IsDeleted = 0").SingleAsync();
                Assert.Equal(cheapest is null ? null : Math.Round(cheapest.Value, 2), stats.FromMonthlyPrice);
            });

            Assert.True(stats.Programs > 0); // seeded categories
        }

        [Fact]
        public async Task Stats_FromMonthlyPrice_IsTheCheapestActivePlanPer30Days()
        {
            Plan cheapActive = null!, cheaperInactive = null!;
            await factory.WithDbAsync(async db =>
            {
                // 2.00 for 90 days = 0.6667 per 30 days -> 0.67 (cheaper than any real plan).
                cheapActive = await TestData.AddPlanAsync(db, price: 2m, durationDays: 90);
                // Even cheaper (0.30 / month) but inactive: must be ignored.
                cheaperInactive = await TestData.AddPlanAsync(db, price: 0.30m, durationDays: 30, isActive: false);
            });

            try
            {
                var stats = await GetStatsAsync();

                Assert.Equal(0.67m, stats.FromMonthlyPrice);
            }
            finally
            {
                // Remove the fake cheap plans so other tests see the normal plans again.
                await RemovePlansAsync(cheapActive.Id, cheaperInactive.Id);
            }
        }

        [Fact]
        public async Task Stats_FromMonthlyPrice_IsNull_WhenNoPlanIsActive()
        {
            List<int> activeIds = [];
            await factory.WithDbAsync(async db =>
            {
                activeIds = await db.Plans.Where(p => p.IsActive).Select(p => p.Id).ToListAsync();
                await db.Plans.Where(p => p.IsActive).ExecuteUpdateAsync(s => s.SetProperty(p => p.IsActive, false));
            });

            try
            {
                var stats = await GetStatsAsync();

                Assert.Null(stats.FromMonthlyPrice);
            }
            finally
            {
                // Put the plans back exactly as they were.
                await factory.WithDbAsync(db =>
                    db.Plans.Where(p => activeIds.Contains(p.Id)).ExecuteUpdateAsync(s => s.SetProperty(p => p.IsActive, true)));
            }
        }

        private Task RemovePlansAsync(params int[] ids)
            => factory.WithDbAsync(async db =>
            {
                db.Plans.RemoveRange(await db.Plans.Where(p => ids.Contains(p.Id)).ToListAsync()); // soft delete
                await db.SaveChangesAsync();
            });

        private static Task<int> Scalar(GymManagementDAL.Data.Contexts.GymDbContext db, FormattableString sql)
            => db.Database.SqlQuery<int>(sql).SingleAsync();

        #endregion
    }
}
