using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Abstractions;
using GymManagementBLL.Common;
using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Data.SeedData;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace GymManagement.Tests.Data
{
    /// <summary>
    /// The API on its OWN database (GymManagement_DemoTests), seeded once with the demo data.
    /// The other tests use GymManagement_Tests, so their exact counts are not affected.
    /// </summary>
    public sealed class DemoDataFactory : WebApplicationFactory<Program>, IAsyncLifetime
    {
        private const string ConnectionString =
            "Server=.;Database=GymManagement_DemoTests;Trusted_Connection=true;TrustServerCertificate=true";

        public const string DemoPassword = "Demo@12345";

        public string FirstRunMessage { get; private set; } = "";

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                    ["Database:MigrateOnStartup"] = "true",
                    ["Jwt:Key"] = "test-signing-key-that-is-long-enough-for-hmac-sha256",
                    ["Jwt:Issuer"] = "GymManagementAPI",
                    ["Jwt:Audience"] = "GymManagementClient",
                    ["SuperAdmin:Email"] = ApiFactory.SuperAdminEmail,
                    ["SuperAdmin:Password"] = ApiFactory.DefaultPassword,
                    ["RateLimiting:AuthPermitLimit"] = "100000",
                    ["FileStorage:RootPath"] = ApiFactory.UploadsPath,
                }));

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IEmailSender>();
                services.AddSingleton<IEmailSender>(new FakeEmailSender());
            });
        }

        public async Task InitializeAsync()
        {
            var options = new DbContextOptionsBuilder<GymDbContext>().UseSqlServer(ConnectionString).Options;
            await using (var db = new GymDbContext(options))
            {
                await db.Database.EnsureDeletedAsync();
            }

            _ = Services; // starts the host: migrations + plans/categories/roles seeding
            FirstRunMessage = await SeedAsync(DemoPassword);
        }

        public async Task<string> SeedAsync(string? password)
        {
            await using var scope = Services.CreateAsyncScope();
            var services = scope.ServiceProvider;

            return await DemoDataSeeding.SeedAsync(
                services.GetRequiredService<GymDbContext>(),
                services.GetRequiredService<UserManager<ApplicationUser>>(),
                password,
                services.GetRequiredService<GymTimeZone>().Zone,
                services.GetRequiredService<IClock>().UtcNow);
        }

        public async Task<T> WithDbAsync<T>(Func<GymDbContext, Task<T>> query)
        {
            await using var scope = Services.CreateAsyncScope();
            return await query(scope.ServiceProvider.GetRequiredService<GymDbContext>());
        }

        public async Task<HttpClient> LoginAsync(string email)
        {
            var client = CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false });
            var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = DemoPassword });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var token = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        /// <summary>Stops the API, then drops GymManagement_DemoTests so it doesn't stay in SQL Server.</summary>
        async Task IAsyncLifetime.DisposeAsync()
        {
            await DisposeAsync();

            var options = new DbContextOptionsBuilder<GymDbContext>().UseSqlServer(ConnectionString).Options;
            await using var db = new GymDbContext(options);
            await db.Database.EnsureDeletedAsync();
        }
    }

    public sealed class DemoDataTests(DemoDataFactory factory) : IClassFixture<DemoDataFactory>
    {
        [Fact]
        public async Task Seed_CreatesAboutThreeMonthsOfData()
        {
            Assert.StartsWith("Demo data created", factory.FirstRunMessage);

            var counts = await factory.WithDbAsync(async db => new
            {
                Members = await db.Members.CountAsync(m => m.Email.EndsWith("@demo.gym")),
                Trainers = await db.Trainers.CountAsync(t => t.Email.EndsWith("@demo.gym")),
                Sessions = await db.Sessions.CountAsync(),
                Bookings = await db.Bookings.CountAsync(),
                CheckIns = await db.CheckIns.CountAsync(),
                Refunds = await db.Payments.CountAsync(p => p.Type == PaymentType.Refund),
                Frozen = await db.Memberships.CountAsync(m => m.Status == MembershipStatus.Frozen),
                OldestMember = await db.Members.MinAsync(m => m.CreatedAt),
            });

            Assert.Equal(DemoDataSeeding.MemberCount, counts.Members);
            Assert.Equal(DemoDataSeeding.TrainerCount, counts.Trainers);
            Assert.True(counts.Sessions > 150, $"sessions: {counts.Sessions}");
            Assert.True(counts.Bookings > 500, $"bookings: {counts.Bookings}");
            Assert.True(counts.CheckIns > 300, $"check-ins: {counts.CheckIns}");
            Assert.Equal(2, counts.Refunds);
            Assert.Equal(2, counts.Frozen);
            Assert.True(counts.OldestMember < DateTime.UtcNow.AddDays(-60), "members should have joined over the last 3 months");
        }

        [Fact]
        public async Task Seed_SecondRun_DoesNothing()
        {
            var before = await factory.WithDbAsync(db => db.Members.CountAsync());

            var message = await factory.SeedAsync(DemoDataFactory.DemoPassword);

            Assert.Equal("Demo data already exists.", message);
            Assert.Equal(before, await factory.WithDbAsync(db => db.Members.CountAsync()));
        }

        [Fact]
        public async Task Seed_WithoutPassword_DoesNothing()
        {
            var message = await factory.SeedAsync(password: null);

            Assert.Equal("Demo data not seeded: set DemoData:Password.", message);
        }

        [Fact]
        public async Task Data_FollowsTheBusinessRules()
        {
            await factory.WithDbAsync(async db =>
            {
                // A session's category is always its trainer's speciality.
                Assert.False(await db.Sessions.AnyAsync(s => s.CategoryId != s.Trainer.CategoryId));

                // No session has more active bookings than places.
                Assert.False(await db.Sessions.AnyAsync(s => s.Bookings.Count(b => b.Status != BookingStatus.Cancelled) > s.Capacity));

                // Every membership was paid, and every allowed check-in had a membership.
                Assert.False(await db.Memberships.AnyAsync(m => !m.Payments.Any(p => p.Type != PaymentType.Refund)));
                Assert.False(await db.CheckIns.AnyAsync(c => c.Result == CheckInResult.Allowed && c.MembershipId == null));

                // Nobody has two running memberships at the same time (a queued renewal starts when the other ends).
                Assert.False(await db.Memberships.AnyAsync(a => a.Status != MembershipStatus.Cancelled && db.Memberships.Any(b =>
                    b.Id != a.Id && b.MemberId == a.MemberId && b.Status != MembershipStatus.Cancelled
                    && b.StartDate < a.EndDate && a.StartDate < b.EndDate)));

                // Nothing happened in the future (except bookings for upcoming classes).
                var now = DateTime.UtcNow;
                Assert.False(await db.Payments.AnyAsync(p => p.PaidAt > now));
                Assert.False(await db.CheckIns.AnyAsync(c => c.CheckedInAt > now));
                Assert.False(await db.Bookings.AnyAsync(b => b.Status == BookingStatus.Attended && b.Session.StartDate > now));
                return true;
            });
        }

        [Fact]
        public async Task DemoAdmin_SeesALivelyDashboard()
        {
            var client = await factory.LoginAsync(DemoDataSeeding.AdminEmail);

            var summary = await client.GetFromJsonAsync<JsonElement>("/api/analytics/summary");
            Assert.True(summary.GetProperty("activeMembers").GetInt32() > 10);
            Assert.Equal(2, summary.GetProperty("frozenMembers").GetInt32());

            var revenue = await client.GetFromJsonAsync<JsonElement>("/api/analytics/revenue?period=Monthly");
            Assert.True(revenue.GetProperty("totalNet").GetDecimal() > 0);
        }

        [Fact]
        public async Task DemoMember_HasARunningMembership_AndUpcomingClasses()
        {
            var client = await factory.LoginAsync(DemoDataSeeding.MemberEmail);

            var memberships = await client.GetFromJsonAsync<JsonElement>("/api/me/memberships");
            Assert.True(memberships.GetArrayLength() >= 1);

            var bookings = await client.GetFromJsonAsync<JsonElement>("/api/me/bookings?upcoming=true");
            Assert.True(bookings.GetProperty("totalCount").GetInt32() >= 1);

            var qr = await client.GetAsync("/api/me/qr");
            Assert.Equal(HttpStatusCode.OK, qr.StatusCode);
        }

        [Fact]
        public async Task DemoTrainer_SeesTheirSessions()
        {
            var client = await factory.LoginAsync(DemoDataSeeding.TrainerEmail);

            var sessions = await client.GetFromJsonAsync<JsonElement>("/api/trainer/sessions");
            Assert.True(sessions.GetProperty("totalCount").GetInt32() > 0);
        }
    }
}
