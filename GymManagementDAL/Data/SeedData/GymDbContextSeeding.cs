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

            // IgnoreQueryFilters: soft-deleted rows still count, so deleted plans are not re-seeded.
            var hasPlans = await dbContext.Plans.IgnoreQueryFilters().AnyAsync(ct);
            var hasCategories = await dbContext.Categories.IgnoreQueryFilters().AnyAsync(ct);

            if (hasPlans && hasCategories)
                return false;

            if (!hasPlans)
                dbContext.Plans.AddRange(await LoadDataFromJsonAsync<Plan>(seedFolder, "plans.json", ct));

            if (!hasCategories)
                dbContext.Categories.AddRange(await LoadDataFromJsonAsync<Category>(seedFolder, "categories.json", ct));

            // CreatedAt is filled automatically by GymDbContext.SaveChangesAsync.
            return await dbContext.SaveChangesAsync(ct) > 0;
        }

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
