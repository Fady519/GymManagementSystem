using GymManagementDAL.Data.Contexts;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                    ["Database:MigrateOnStartup"] = "true",
                }));
        }

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

        Task IAsyncLifetime.DisposeAsync() => DisposeAsync().AsTask();
    }

    [CollectionDefinition(Name)]
    public sealed class ApiCollection : ICollectionFixture<ApiFactory>
    {
        public const string Name = "Api";
    }
}
