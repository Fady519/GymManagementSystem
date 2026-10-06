using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Identity;

namespace GymManagementDAL.Data.SeedData
{
    /// <summary>
    /// Creates the 4 roles and the first SuperAdmin account. Safe to run on every startup:
    /// it only creates what is missing.
    /// </summary>
    public static class IdentitySeeding
    {
        /// <returns>A short message describing what happened (written to the log by the caller).</returns>
        public static async Task<string> SeedAsync(
            RoleManager<IdentityRole<int>> roleManager,
            UserManager<ApplicationUser> userManager,
            string? superAdminEmail,
            string? superAdminPassword,
            string superAdminFullName)
        {
            foreach (var role in AppRoles.All)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole<int>(role));
            }

            // The password is a secret (User Secrets locally, environment variable on the server),
            // so it is never committed to Git. Without it we just skip creating the account.
            if (string.IsNullOrWhiteSpace(superAdminEmail) || string.IsNullOrWhiteSpace(superAdminPassword))
                return "SuperAdmin not seeded: set SuperAdmin:Email and SuperAdmin:Password.";

            if (await userManager.FindByEmailAsync(superAdminEmail) is not null)
                return "SuperAdmin already exists.";

            var user = new ApplicationUser
            {
                UserName = superAdminEmail,
                Email = superAdminEmail,
                EmailConfirmed = true,
                FullName = superAdminFullName,
                CreatedAt = DateTime.UtcNow,
            };

            var result = await userManager.CreateAsync(user, superAdminPassword);
            if (!result.Succeeded)
                throw new InvalidOperationException(
                    "Could not create the SuperAdmin: " + string.Join(" ", result.Errors.Select(e => e.Description)));

            await userManager.AddToRoleAsync(user, AppRoles.SuperAdmin);
            return $"SuperAdmin {superAdminEmail} created.";
        }
    }
}
