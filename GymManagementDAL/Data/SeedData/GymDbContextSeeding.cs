using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GymManagementDAL.Data.SeedData
{
    /// <summary>
    /// Seeds reference data (plans, categories) from JSON files that are copied
    /// to the output folder (bin/.../SeedData). Safe to run on every startup:
    /// each table is only seeded when it is empty.
    /// </summary>
    public static class GymDbContextSeeding
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public static string DefaultSeedFolder => Path.Combine(AppContext.BaseDirectory, "SeedData");

        public static async Task<bool> SeedAsync(GymDbContext dbContext, string? seedFolder = null, CancellationToken ct = default)
        {
            seedFolder ??= DefaultSeedFolder;

            var hasPlans = await dbContext.Plans.AnyAsync(ct);
            var hasCategories = await dbContext.Categories.AnyAsync(ct);

            if (hasPlans && hasCategories)
                return false;

            var now = DateTime.UtcNow;

            if (!hasPlans)
            {
                var plans = await LoadDataFromJsonAsync<Plan>(seedFolder, "plans.json", ct);
                foreach (var plan in plans)
                    plan.CreatedAt = now;

                dbContext.Plans.AddRange(plans);
            }

            if (!hasCategories)
            {
                var categories = await LoadDataFromJsonAsync<Category>(seedFolder, "categories.json", ct);
                foreach (var category in categories)
                    category.CreatedAt = now;

                dbContext.Categories.AddRange(categories);
            }

            return await dbContext.SaveChangesAsync(ct) > 0;
        }

        /// <summary>
        /// Synchronous wrapper kept for the legacy MVC project (removed in B2).
        /// </summary>
        public static bool SeedData(GymDbContext dbContext)
            => SeedAsync(dbContext).GetAwaiter().GetResult();

        private static async Task<List<T>> LoadDataFromJsonAsync<T>(string folder, string fileName, CancellationToken ct)
        {
            var filePath = Path.Combine(folder, fileName);

            if (!File.Exists(filePath))
                throw new FileNotFoundException($"Seed file not found: {filePath}", filePath);

            await using var stream = File.OpenRead(filePath);

            return await JsonSerializer.DeserializeAsync<List<T>>(stream, JsonOptions, ct) ?? [];
        }
    }
}
