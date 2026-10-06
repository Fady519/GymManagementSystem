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

        public static string UniqueEmail() => $"u{Interlocked.Increment(ref _counter)}.{Guid.NewGuid().ToString("N")[..10]}@test.com";

        public static string UniquePhone() => $"010{Random.Shared.Next(10_000_000, 99_999_999)}";

        public static async Task<Member> AddMemberAsync(GymDbContext db, string? name = null, bool withDetails = false)
        {
            var member = new Member
            {
                Name = name ?? UniqueName("Member"),
                Email = UniqueEmail(),
                Phone = UniquePhone(),
                DateOfBirth = new DateOnly(1995, 1, 1),
                Gender = Gender.Male,
            };

            if (withDetails)
            {
                member.Address = new Address { BuildingNumber = 5, Street = "شارع التحرير", City = "القاهرة" };
                member.HealthRecord = new HealthRecord { Height = 180, Weight = 80, BloodType = "O+" };
            }

            db.Members.Add(member);
            await db.SaveChangesAsync();
            return member;
        }

        public static async Task<Trainer> AddTrainerAsync(GymDbContext db)
        {
            var trainer = new Trainer
            {
                Name = UniqueName("Trainer"),
                Email = UniqueEmail(),
                Phone = UniquePhone(),
                DateOfBirth = new DateOnly(1990, 1, 1),
                Gender = Gender.Female,
                Specialities = Specialities.Yoga,
            };

            db.Trainers.Add(trainer);
            await db.SaveChangesAsync();
            return trainer;
        }

        public static async Task<Session> AddSessionAsync(GymDbContext db, int trainerId)
        {
            var categoryId = db.Categories.Select(c => c.Id).First();
            var start = DateTime.UtcNow.AddDays(3);

            var session = new Session
            {
                Description = "Test session",
                Capacity = 10,
                StartDate = start,
                EndDate = start.AddHours(1),
                CategoryId = categoryId,
                TrainerId = trainerId,
            };

            db.Sessions.Add(session);
            await db.SaveChangesAsync();
            return session;
        }

        /// <summary>Creates a member and a membership on the given plan.</summary>
        public static async Task<Membership> AddMembershipAsync(GymDbContext db, int planId, DateTime endDateUtc,
            MembershipStatus status = MembershipStatus.Active)
        {
            var member = await AddMemberAsync(db);
            var plan = await db.Plans.FindAsync(planId) ?? throw new InvalidOperationException("Plan not found");

            var membership = new Membership
            {
                MemberId = member.Id,
                PlanId = planId,
                StartDate = endDateUtc.AddDays(-plan.DurationDays),
                EndDate = endDateUtc,
                Status = status,
                PlanName = plan.Name,
                PricePaid = plan.Price,
                DurationDays = plan.DurationDays,
            };

            db.Memberships.Add(membership);
            await db.SaveChangesAsync();
            return membership;
        }
    }
}
