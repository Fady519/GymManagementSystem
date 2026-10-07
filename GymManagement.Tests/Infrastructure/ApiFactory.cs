using GymManagementBLL.Abstractions;
using GymManagementBLL.DTOs.Auth;
using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace GymManagement.Tests.Infrastructure
{
    /// <summary>
    /// Boots the real API in memory against a dedicated SQL Server test database
    /// (GymManagement_Tests). The database is dropped and re-created (migrations + seed)
    /// once per test run, so tests never touch the development database.
    /// </summary>
    public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
    {
        public const string ConnectionString =
            "Server=.;Database=GymManagement_Tests;Trusted_Connection=true;TrustServerCertificate=true";

        public const string SuperAdminEmail = "superadmin@test.com";
        public const string DefaultPassword = "Test@12345";

        public static readonly string UploadsPath = Path.Combine(Path.GetTempPath(), "gym-tests-uploads");

        private readonly ConcurrentDictionary<string, string> _tokensByRole = new();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                    ["Database:MigrateOnStartup"] = "true",

                    // Test-only secrets (the real ones live in User Secrets).
                    ["Jwt:Key"] = "test-signing-key-that-is-long-enough-for-hmac-sha256",
                    ["Jwt:Issuer"] = "GymManagementAPI",
                    ["Jwt:Audience"] = "GymManagementClient",
                    ["SuperAdmin:Email"] = SuperAdminEmail,
                    ["SuperAdmin:Password"] = DefaultPassword,

                    // Many tests log in; the rate limit itself has its own test.
                    ["RateLimiting:AuthPermitLimit"] = "100000",

                    // Uploaded test photos go to a temp folder, not the project's uploads folder.
                    ["FileStorage:RootPath"] = UploadsPath,
                }));

            // Emails stay in memory (Emails property) instead of going to an SMTP server.
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IEmailSender>();
                services.AddSingleton<IEmailSender>(Emails);
            });
        }

        /// <summary>Every email the API "sent" during the test run.</summary>
        public FakeEmailSender Emails { get; } = new();

        public async Task InitializeAsync()
        {
            var options = new DbContextOptionsBuilder<GymDbContext>().UseSqlServer(ConnectionString).Options;
            await using (var db = new GymDbContext(options))
            {
                await db.Database.EnsureDeletedAsync();
            }

            // Accessing Services starts the host, which runs migrations + seeding.
            _ = Services;
        }

        /// <summary>Runs <paramref name="action"/> with a fresh DbContext from the API's container.</summary>
        public async Task WithDbAsync(Func<GymDbContext, Task> action)
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
            await action(db);
        }

        /// <summary>
        /// A client on https://localhost (the refresh cookie is "Secure") that does NOT store cookies,
        /// so each test decides exactly which cookie it sends.
        /// </summary>
        public HttpClient CreateHttpsClient()
            => CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                HandleCookies = false,
            });

        /// <summary>Creates an account directly in the database (no HTTP) and returns its email.</summary>
        public async Task<string> CreateUserAsync(string role, string password = DefaultPassword,
            bool isActive = true, bool mustChangePassword = false)
        {
            await using var scope = Services.CreateAsyncScope();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            var email = $"{role.ToLowerInvariant()}.{Guid.NewGuid().ToString("N")[..10]}@test.com";
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = $"Test {role}",
                IsActive = isActive,
                MustChangePassword = mustChangePassword,
                CreatedAt = DateTime.UtcNow,
            };

            var result = await userManager.CreateAsync(user, password);
            Assert.True(result.Succeeded, string.Join(" ", result.Errors.Select(e => e.Description)));
            await userManager.AddToRoleAsync(user, role);

            return email;
        }

        public async Task<AuthResponse> LoginAsync(string email, string password = DefaultPassword)
        {
            var response = await CreateHttpsClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
            response.EnsureSuccessStatusCode();
            return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        }

        /// <summary>Does what the invited person does: opens the newest invite email and chooses a password.</summary>
        public async Task AcceptInviteAsync(string email, string password = DefaultPassword)
        {
            var token = FakeEmailSender.ExtractToken(Emails.LastSentTo(email));
            var response = await CreateHttpsClient().PostAsJsonAsync("/api/auth/accept-invite", new AcceptInviteRequest(email, token, password));
            Assert.Equal(System.Net.HttpStatusCode.NoContent, response.StatusCode);
        }

        /// <summary>A client already logged in with the given role (one shared account per role).</summary>
        public async Task<HttpClient> CreateClientForRoleAsync(string role)
        {
            if (!_tokensByRole.TryGetValue(role, out var token))
            {
                var email = role == AppRoles.SuperAdmin ? SuperAdminEmail : await CreateUserAsync(role);
                token = (await LoginAsync(email)).AccessToken;
                _tokensByRole[role] = token;
            }

            var client = CreateHttpsClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        public static HttpClient WithToken(HttpClient client, string accessToken)
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            return client;
        }

        /// <summary>A client logged in as the given member (the token carries their memberId).</summary>
        public Task<HttpClient> CreateClientForMemberAsync(int memberId)
            => CreateLinkedClientAsync(AppRoles.Member, async (db, userId) =>
            {
                var member = await db.Members.FirstAsync(m => m.Id == memberId);
                member.UserId = userId;
            });

        /// <summary>A client logged in as the given trainer (the token carries their trainerId).</summary>
        public Task<HttpClient> CreateClientForTrainerAsync(int trainerId)
            => CreateLinkedClientAsync(AppRoles.Trainer, async (db, userId) =>
            {
                var trainer = await db.Trainers.FirstAsync(t => t.Id == trainerId);
                trainer.UserId = userId;
            });

        private async Task<HttpClient> CreateLinkedClientAsync(string role, Func<GymDbContext, int, Task> link)
        {
            var email = await CreateUserAsync(role);

            await WithDbAsync(async db =>
            {
                var userId = await db.Users.Where(u => u.Email == email).Select(u => u.Id).FirstAsync();
                await link(db, userId);
                await db.SaveChangesAsync();
            });

            return WithToken(CreateHttpsClient(), (await LoginAsync(email)).AccessToken);
        }

        Task IAsyncLifetime.DisposeAsync() => DisposeAsync().AsTask();
    }

    [CollectionDefinition(Name)]
    public sealed class ApiCollection : ICollectionFixture<ApiFactory>
    {
        public const string Name = "Api";
    }
}
