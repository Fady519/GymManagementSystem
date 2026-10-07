using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using Microsoft.EntityFrameworkCore;

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

        /// <summary>A unique name made of letters only (person names can't contain digits).</summary>
        public static string UniquePersonName(string prefix = "Test")
        {
            var letters = Guid.NewGuid().ToString("N")[..10].Select(c => (char)('a' + Convert.ToInt32(c.ToString(), 16)));
            return $"{prefix} {new string(letters.ToArray())}";
        }

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

        public static async Task<Trainer> AddTrainerAsync(GymDbContext db, int? categoryId = null)
        {
            var trainer = new Trainer
            {
                Name = UniqueName("Trainer"),
                Email = UniqueEmail(),
                Phone = UniquePhone(),
                DateOfBirth = new DateOnly(1990, 1, 1),
                Gender = Gender.Female,
                CategoryId = categoryId ?? db.Categories.Select(c => c.Id).First(),
            };

            db.Trainers.Add(trainer);
            await db.SaveChangesAsync();
            return trainer;
        }

        /// <summary>
        /// Inserts a session directly (no API rules), so tests can also create sessions that are
        /// already running or finished. Default: starts in 3 days, 60 minutes, trainer's category.
        /// </summary>
        public static async Task<Session> AddSessionAsync(GymDbContext db, int trainerId, int? categoryId = null,
            DateTime? startUtc = null, int durationMinutes = 60, int capacity = 10)
        {
            var start = startUtc ?? DateTime.UtcNow.AddDays(3);

            var session = new Session
            {
                Description = "Test session",
                Capacity = capacity,
                StartDate = start,
                EndDate = start.AddMinutes(durationMinutes),
                CategoryId = categoryId ?? db.Trainers.Where(t => t.Id == trainerId).Select(t => t.CategoryId).First(),
                TrainerId = trainerId,
            };

            db.Sessions.Add(session);
            await db.SaveChangesAsync();
            return session;
        }

        public static async Task<Booking> AddBookingAsync(GymDbContext db, int sessionId, int memberId)
        {
            var booking = new Booking { MemberId = memberId, SessionId = sessionId };
            db.Bookings.Add(booking);
            await db.SaveChangesAsync();
            return booking;
        }

        /// <summary>Books the member into a new upcoming session.</summary>
        public static async Task<Booking> AddUpcomingBookingAsync(GymDbContext db, int memberId)
        {
            var trainer = await AddTrainerAsync(db);
            var session = await AddSessionAsync(db, trainer.Id);
            return await AddBookingAsync(db, session.Id, memberId);
        }

        /// <summary>Gives an existing member a membership on the first plan, valid from start to end.</summary>
        public static async Task<Membership> AddMembershipToMemberAsync(GymDbContext db, int memberId,
            DateTime startUtc, DateTime endUtc, MembershipStatus status = MembershipStatus.Active)
        {
            var plan = await db.Plans.OrderBy(p => p.Id).FirstAsync();

            var membership = new Membership
            {
                MemberId = memberId,
                PlanId = plan.Id,
                StartDate = startUtc,
                EndDate = endUtc,
                Status = status,
                PlanName = plan.Name,
                PricePaid = plan.Price,
                DurationDays = plan.DurationDays,
            };

            db.Memberships.Add(membership);
            await db.SaveChangesAsync();
            return membership;
        }

        /// <summary>Creates a member and a membership on the given plan.</summary>
        public static async Task<Membership> AddMembershipAsync(GymDbContext db, int planId, DateTime endDateUtc,
            MembershipStatus status = MembershipStatus.Active, string? memberName = null)
        {
            var member = await AddMemberAsync(db, memberName);
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
