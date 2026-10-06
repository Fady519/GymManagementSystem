using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;

namespace GymManagement.Tests.Infrastructure
{
    /// <summary>Helpers that insert test data directly into the database.</summary>
    public static class TestData
    {
        private static int _counter;

        public static string UniqueName(string prefix = "Plan") =>
            $"{prefix} {Guid.NewGuid().ToString("N")[..8]}";

        /// <summary>Creates a member (with health record) and a membership on the given plan.</summary>
        public static async Task AddMembershipAsync(GymDbContext db, int planId, DateTime endDateUtc)
        {
            var n = Interlocked.Increment(ref _counter);
            var phoneSuffix = (Random.Shared.Next(10_000_000, 99_999_999)).ToString();

            var member = new Member
            {
                Name = $"Test Member {n}",
                Email = $"m{n}.{Guid.NewGuid().ToString("N")[..12]}@test.com",
                Phone = $"010{phoneSuffix}",
                DateOfBirth = new DateOnly(1995, 1, 1),
                Gender = Gender.Male,
                Address = new Address { BuildingNumber = 1, City = "Cairo", Street = "Test" },
                Photo = "test.jpg",
                HealthRecord = new HealthRecord { Height = 180, Weight = 80, BloodType = "O+" },
            };

            db.Members.Add(member);
            await db.SaveChangesAsync();

            db.Memberships.Add(new Membership
            {
                MemberId = member.Id,
                PlanId = planId,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                EndDate = endDateUtc,
            });
            await db.SaveChangesAsync();
        }
    }
}
