using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GymManagementDAL.Data.SeedData
{
    /// <summary>
    /// Fills the database with about 3 months of realistic demo data, so the dashboard and the
    /// reports have something to show: trainers, members, memberships with payments (renewals,
    /// a refund, frozen members), a class schedule with bookings, and daily QR check-ins.
    ///
    /// Run it once (it is never run automatically):
    ///   dotnet run --project GymManagementAPI -- --seed-demo
    ///
    /// - Safe to run twice: it does nothing if the demo data already exists.
    /// - All demo people use the "@demo.gym" email domain, so they are easy to find (or delete).
    /// - Creates 3 demo logins (admin / trainer / member) with the password from DemoData:Password.
    /// - Uses a fixed random seed, so every run creates the same shape of data. All dates are
    ///   relative to "now", so the dashboard always looks current.
    /// - The rows are written directly (not through the services), but they follow the same rules:
    ///   one running membership per member, bookings only with a membership, one allowed check-in per day...
    /// </summary>
    public static class DemoDataSeeding
    {
        public const string EmailDomain = "demo.gym";
        public const string AdminEmail = "admin@demo.gym";
        public const string TrainerEmail = "trainer@demo.gym";
        public const string MemberEmail = "member@demo.gym";

        public const int MemberCount = 40;
        public const int TrainerCount = 6;
        public const int HistoryDays = 90;
        private const int ScheduleDaysAhead = 14;

        public static async Task<string> SeedAsync(
            GymDbContext db,
            UserManager<ApplicationUser> userManager,
            string? password,
            TimeZoneInfo gymZone,
            DateTime utcNow,
            CancellationToken ct = default)
        {
            // The password is a secret (User Secrets locally, environment variable on the server).
            if (string.IsNullOrWhiteSpace(password))
                return "Demo data not seeded: set DemoData:Password.";

            if (await userManager.FindByEmailAsync(AdminEmail) is not null
                || await db.Members.IgnoreQueryFilters().AnyAsync(m => m.Email.EndsWith("@" + EmailDomain), ct))
                return "Demo data already exists.";

            var plans = await db.Plans.Where(p => p.IsActive).OrderBy(p => p.Price).ToListAsync(ct);
            var categories = await db.Categories.OrderBy(c => c.Id).ToListAsync(ct);
            if (plans.Count == 0 || categories.Count == 0)
                return "Demo data not seeded: there are no active plans or no categories.";

            var usedPhones = await db.Members.IgnoreQueryFilters().Select(m => m.Phone)
                .Concat(db.Trainers.IgnoreQueryFilters().Select(t => t.Phone))
                .ToListAsync(ct);

            // Everything is saved in ONE transaction: either all the demo data exists, or none of it.
            // (UserManager uses this same DbContext, so the accounts are part of the transaction too.)
            await using var transaction = await db.Database.BeginTransactionAsync(ct);

            var startOfHistory = utcNow.AddDays(-HistoryDays - 30);
            var admin = await CreateAccountAsync(userManager, AdminEmail, "Demo Admin", AppRoles.Admin, password, startOfHistory);
            var trainerAccount = await CreateAccountAsync(userManager, TrainerEmail, "Karim Adel", AppRoles.Trainer, password, startOfHistory);
            var memberAccount = await CreateAccountAsync(userManager, MemberEmail, "Omar Hassan", AppRoles.Member, password, startOfHistory);

            var builder = new DemoBuilder(gymZone, utcNow, plans, categories, usedPhones, admin.Id);
            builder.Build(trainerAccount.Id, memberAccount.Id);

            db.Trainers.AddRange(builder.Trainers);
            db.Members.AddRange(builder.Members);
            db.Memberships.AddRange(builder.Memberships);
            db.Sessions.AddRange(builder.Sessions);
            db.Bookings.AddRange(builder.Bookings);
            db.CheckIns.AddRange(builder.CheckIns);
            await db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);

            return $"Demo data created: {builder.Trainers.Count} trainers, {builder.Members.Count} members, "
                + $"{builder.Memberships.Count} memberships, {builder.Memberships.Sum(m => m.Payments.Count)} payments, "
                + $"{builder.Sessions.Count} sessions, {builder.Bookings.Count} bookings, {builder.CheckIns.Count} check-ins. "
                + $"Logins: {AdminEmail}, {TrainerEmail}, {MemberEmail}.";
        }

        private static async Task<ApplicationUser> CreateAccountAsync(
            UserManager<ApplicationUser> userManager, string email, string fullName, string role, string password, DateTime createdAt)
        {
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                FullName = fullName,
                IsActive = true,
                CreatedAt = createdAt,
            };

            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
                throw new InvalidOperationException(
                    $"Could not create the demo account {email}: " + string.Join(" ", result.Errors.Select(e => e.Description)));

            await userManager.AddToRoleAsync(user, role);
            return user;
        }

        /// <summary>Builds the objects in memory; SeedAsync saves them with one SaveChanges.</summary>
        private sealed class DemoBuilder(
            TimeZoneInfo zone, DateTime now, List<Plan> plans, List<Category> categories, IEnumerable<string> usedPhones, int adminUserId)
        {
            private static readonly string[] MaleNames = ["Ahmed", "Mohamed", "Youssef", "Mostafa", "Mahmoud", "Hassan", "Amr", "Tarek", "Khaled", "Ali", "Ziad", "Hazem", "Sherif", "Adham", "Seif", "Marwan", "Belal", "Islam", "Hossam", "Nader"];
            private static readonly string[] FemaleNames = ["Nour", "Mariam", "Salma", "Yasmin", "Habiba", "Farida", "Aya", "Rana", "Dina", "Menna", "Hana", "Laila", "Malak", "Jana", "Reem", "Nada", "Sara", "Heba", "Rawan", "Esraa"];
            private static readonly string[] LastNames = ["Hassan", "Mahmoud", "Ibrahim", "Mostafa", "Adel", "Fathy", "Samir", "Nabil", "Gamal", "Saad", "Fouad", "Ashraf", "Salah", "Hamdy", "Kamal", "Yassin", "Ezzat", "Lotfy", "Zaki", "Shawky"];
            private static readonly (string City, string Street)[] Streets =
            [
                ("Cairo", "Abbas El Akkad St"), ("Cairo", "Makram Ebeid St"), ("Cairo", "El Thawra St"), ("Cairo", "Road 9"),
                ("Giza", "Faisal St"), ("Giza", "El Haram St"), ("Giza", "Gameat El Dowal St"), ("Alexandria", "Fouad St"),
            ];
            private static readonly string[] BloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
            private static readonly Dictionary<string, string[]> ClassNames = new(StringComparer.OrdinalIgnoreCase)
            {
                ["General Fitness"] = ["Full Body Strength", "Cardio Burn", "Core and Mobility"],
                ["Yoga"] = ["Morning Yoga Flow", "Power Yoga", "Stretch and Relax"],
                ["Boxing"] = ["Boxing Basics", "Boxing Conditioning", "Pads and Footwork"],
                ["CrossFit"] = ["CrossFit WOD", "HIIT Circuit", "Olympic Lifting"],
            };

            private readonly Random _random = new(2026); // fixed seed: the same data shape on every run
            private readonly DateOnly _today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(now, zone));
            private readonly HashSet<string> _phones = [.. usedPhones];
            private readonly HashSet<string> _names = [];
            private readonly Dictionary<Member, List<Membership>> _membershipsByMember = [];

            public List<Trainer> Trainers { get; } = [];
            public List<Member> Members { get; } = [];
            public List<Membership> Memberships { get; } = [];
            public List<Session> Sessions { get; } = [];
            public List<Booking> Bookings { get; } = [];
            public List<CheckIn> CheckIns { get; } = [];

            public void Build(int demoTrainerUserId, int demoMemberUserId)
            {
                AddTrainers(demoTrainerUserId);
                AddMembers(demoMemberUserId);
                CancelAndFreezeSome();
                AddSchedule();
                AddBookings();
                AddCheckIns();
            }

            #region People

            private void AddTrainers(int demoTrainerUserId)
            {
                var joined = Utc(_today.AddDays(-HistoryDays - 30), 10);

                for (var i = 0; i < TrainerCount; i++)
                {
                    // Round robin: every category has at least one trainer.
                    var category = categories[i % categories.Count];
                    var isDemo = i == 0;
                    var (name, gender) = isDemo ? ("Karim Adel", Gender.Male) : NewName();

                    Trainers.Add(new Trainer
                    {
                        Name = name,
                        Email = isDemo ? TrainerEmail : $"coach.{Slug(name)}@{EmailDomain}",
                        Phone = NewPhone(),
                        Gender = gender,
                        DateOfBirth = new DateOnly(1985, 1, 1).AddDays(_random.Next(0, 4000)),
                        Address = NewAddress(),
                        Category = category,
                        UserId = isDemo ? demoTrainerUserId : null,
                        CreatedAt = joined,
                    });
                }
            }

            private void AddMembers(int demoMemberUserId)
            {
                for (var i = 0; i < MemberCount; i++)
                {
                    var isDemo = i == 0;
                    var (name, gender) = isDemo ? ("Omar Hassan", Gender.Male) : NewName();

                    // Join dates are spread over the last 3 months, so "members growth" has a curve.
                    var joinedDay = isDemo ? _today.AddDays(-80) : _today.AddDays(-_random.Next(1, HistoryDays + 1));
                    var joinedAt = Utc(joinedDay, _random.Next(9, 21), _random.Next(0, 60));
                    if (joinedAt > now)
                        joinedAt = now.AddHours(-1);

                    var member = new Member
                    {
                        Name = name,
                        Email = isDemo ? MemberEmail : $"{Slug(name)}{i}@{EmailDomain}",
                        Phone = NewPhone(),
                        Gender = gender,
                        DateOfBirth = new DateOnly(1980, 1, 1).AddDays(_random.Next(0, 9500)),
                        Address = NewAddress(),
                        UserId = isDemo ? demoMemberUserId : null,
                        CreatedAt = joinedAt,
                        // CheckInToken is left empty: the database default generates a random code.
                    };

                    if (isDemo || _random.NextDouble() < 0.8)
                    {
                        var male = gender == Gender.Male;
                        member.HealthRecord = new HealthRecord
                        {
                            Height = male ? _random.Next(165, 191) : _random.Next(155, 176),
                            Weight = male ? _random.Next(65, 101) : _random.Next(50, 81),
                            BloodType = BloodTypes[_random.Next(BloodTypes.Length)],
                            CreatedAt = joinedAt,
                        };
                    }

                    Members.Add(member);
                    _membershipsByMember[member] = [];
                    AddMembershipHistory(member, joinedAt, isDemo);
                }
            }

            /// <summary>Buys a plan on the join day, then (sometimes) renews, like a real member would.</summary>
            private void AddMembershipHistory(Member member, DateTime joinedAt, bool isDemo)
            {
                // The demo member always has a running membership (a 90-day plan bought 80 days ago).
                var plan = isDemo ? plans.FirstOrDefault(p => p.DurationDays >= 90) ?? plans[^1] : PickPlan();
                var start = joinedAt;
                var paidAt = joinedAt;
                var type = PaymentType.Purchase;

                while (true)
                {
                    var membership = AddMembership(member, plan, start, paidAt, type);

                    if (membership.EndDate > now)
                    {
                        // Still running. Some members renew early when it's about to end (a queued renewal).
                        if (!isDemo && membership.EndDate <= now.AddDays(7) && _random.NextDouble() < 0.3)
                            AddMembership(member, plan, membership.EndDate, Max(now.AddHours(-_random.Next(1, 30)), membership.StartDate), PaymentType.Renewal);
                        break;
                    }

                    // Ended: 70% come back, the others leave the gym.
                    if (_random.NextDouble() >= 0.7)
                        break;

                    if (_random.NextDouble() < 0.2)
                        plan = PickPlan(); // changed / upgraded the plan

                    type = PaymentType.Renewal;
                    if (_random.NextDouble() < 0.5)
                    {
                        // Renewed early: paid in the last days, the new one starts when the old one ends.
                        paidAt = membership.EndDate.AddDays(-_random.Next(1, 4));
                        start = membership.EndDate;
                    }
                    else
                    {
                        // Came back after a break (never before the old one ended, even on the same day).
                        start = Max(Utc(LocalDay(membership.EndDate).AddDays(_random.Next(0, 12)), _random.Next(9, 21)), membership.EndDate);
                        if (start > now)
                            break;
                        paidAt = start;
                    }
                }
            }

            private Membership AddMembership(Member member, Plan plan, DateTime start, DateTime paidAt, PaymentType type)
            {
                var membership = new Membership
                {
                    Member = member,
                    Plan = plan,
                    PlanName = plan.Name,
                    PricePaid = plan.Price,
                    DurationDays = plan.DurationDays,
                    StartDate = start,
                    EndDate = start.AddDays(plan.DurationDays),
                    Status = MembershipStatus.Active,
                    CreatedAt = paidAt,
                };

                membership.Payments.Add(new Payment
                {
                    Amount = plan.Price,
                    Method = PickPaymentMethod(),
                    Type = type,
                    PaidAt = paidAt,
                    ReceivedByUserId = adminUserId,
                    CreatedAt = paidAt,
                });

                Memberships.Add(membership);
                _membershipsByMember[member].Add(membership);
                return membership;
            }

            /// <summary>2 members cancelled with a refund, 2 members are frozen right now.</summary>
            private void CancelAndFreezeSome()
            {
                // Running for at least 5 more days, started 5+ days ago, no renewal waiting after it.
                var candidates = Members.Skip(1) // never the demo member
                    .Select(m => _membershipsByMember[m][^1])
                    .Where(m => m.StartDate <= now.AddDays(-5) && m.EndDate > now.AddDays(5))
                    .ToList();

                foreach (var membership in candidates.Take(2))
                {
                    membership.Status = MembershipStatus.Cancelled;
                    membership.CancelledAt = now.AddDays(-_random.Next(1, 4));
                    membership.CancellationReason = "Moved to another city";

                    membership.Payments.Add(new Payment
                    {
                        Amount = Math.Round(membership.PricePaid / 2, 0),
                        Method = PaymentMethod.Cash,
                        Type = PaymentType.Refund,
                        PaidAt = membership.CancelledAt.Value,
                        ReceivedByUserId = adminUserId,
                        Notes = membership.CancellationReason,
                        CreatedAt = membership.CancelledAt.Value,
                    });
                }

                foreach (var membership in candidates.Skip(2).Take(2))
                {
                    const int days = 10;
                    var freezeStart = now.AddDays(-3);

                    // Same as MembershipService.FreezeAsync: the frozen days are added to the end date.
                    membership.Status = MembershipStatus.Frozen;
                    membership.FrozenUntil = freezeStart.AddDays(days);
                    membership.TotalFrozenDays = days;
                    membership.EndDate = membership.EndDate.AddDays(days);
                    membership.Freezes.Add(new MembershipFreeze
                    {
                        StartDate = freezeStart,
                        EndDate = freezeStart.AddDays(days),
                        Days = days,
                        Reason = "Travelling",
                        CreatedAt = freezeStart,
                    });
                }
            }

            #endregion

            #region Schedule and bookings

            private void AddSchedule()
            {
                for (var day = _today.AddDays(-HistoryDays); day <= _today.AddDays(ScheduleDaysAhead); day = day.AddDays(1))
                {
                    // Friday is the weekend: one late-morning class. Other days: morning + evening (+ a late class).
                    List<(int Hour, int Minute)> slots = day.DayOfWeek switch
                    {
                        DayOfWeek.Friday => [(11, 0)],
                        DayOfWeek.Sunday or DayOfWeek.Tuesday or DayOfWeek.Thursday => [(8, 0), (19, 0), (20, 30)],
                        _ => [(8, 0), (19, 0)],
                    };

                    // A different trainer for each class of the day.
                    var trainersToday = Trainers.OrderBy(_ => _random.Next()).ToList();

                    for (var i = 0; i < slots.Count; i++)
                    {
                        var trainer = trainersToday[i % trainersToday.Count];
                        var start = Utc(day, slots[i].Hour, slots[i].Minute);
                        var names = ClassNames.GetValueOrDefault(trainer.Category.Name, ["Group Training"]);

                        Sessions.Add(new Session
                        {
                            Description = names[_random.Next(names.Length)],
                            Capacity = _random.Next(12, 21),
                            StartDate = start,
                            EndDate = start.AddMinutes(60),
                            Status = _random.NextDouble() < 0.03 ? SessionStatus.Cancelled : SessionStatus.Scheduled,
                            Trainer = trainer,
                            Category = trainer.Category, // a session's category is always its trainer's speciality
                            CreatedAt = Min(start.AddDays(-7), now),
                        });
                    }
                }
            }

            private void AddBookings()
            {
                foreach (var session in Sessions)
                {
                    var isPast = session.EndDate <= now;

                    // Only members with a running (not frozen) membership on that day can book.
                    var candidates = Members
                        .Select(m => (Member: m, Membership: CoveringMembership(m, session.StartDate)))
                        .Where(x => x.Membership is not null)
                        .OrderBy(_ => _random.Next())
                        .ToList();

                    var wanted = isPast ? _random.Next(3, 11) : _random.Next(1, 8);
                    foreach (var (member, membership) in candidates.Take(Math.Min(wanted, session.Capacity)))
                        AddBooking(member, membership!, session, isPast);
                }

                // The demo member has a few upcoming classes to show in the member portal.
                var demo = Members[0];
                var upcoming = Sessions
                    .Where(s => s.StartDate > now && s.StartDate <= now.AddDays(7) && s.Status == SessionStatus.Scheduled)
                    .Where(s => !Bookings.Any(b => b.Session == s && b.Member == demo))
                    .Take(Math.Max(0, 3 - Bookings.Count(b => b.Member == demo && b.Session.StartDate > now)));

                foreach (var session in upcoming)
                {
                    var membership = CoveringMembership(demo, session.StartDate);
                    if (membership is not null && Bookings.Count(b => b.Session == session && b.Status != BookingStatus.Cancelled) < session.Capacity)
                        AddBooking(demo, membership, session, isPast: false, forceBooked: true);
                }
            }

            private void AddBooking(Member member, Membership membership, Session session, bool isPast, bool forceBooked = false)
            {
                var roll = _random.NextDouble();
                var status = session.Status == SessionStatus.Cancelled ? BookingStatus.Cancelled // cancelling a session cancels its bookings
                    : forceBooked ? BookingStatus.Booked
                    : isPast ? (roll < 0.8 ? BookingStatus.Attended : roll < 0.93 ? BookingStatus.Booked : BookingStatus.Cancelled)
                    : (roll < 0.9 ? BookingStatus.Booked : BookingStatus.Cancelled);

                var bookedAt = session.StartDate.AddDays(-_random.Next(1, 6)).AddHours(-_random.Next(0, 10));

                Bookings.Add(new Booking
                {
                    Member = member,
                    Session = session,
                    Status = status,
                    CreatedAt = Min(Max(bookedAt, membership.CreatedAt), now),
                });
            }

            #endregion

            #region Check-ins

            private void AddCheckIns()
            {
                var checkedIn = new HashSet<(Member, DateOnly)>();

                // 1. Everyone who attended a class came in shortly before it.
                foreach (var booking in Bookings.Where(b => b.Status == BookingStatus.Attended))
                {
                    var time = booking.Session.StartDate.AddMinutes(-_random.Next(10, 31));
                    if (checkedIn.Add((booking.Member, LocalDay(time))))
                        AddCheckIn(booking.Member, time,
                            CoveringMembership(booking.Member, time) ?? CoveringMembership(booking.Member, booking.Session.StartDate), null);
                }

                // 2. Normal gym visits: each member has their own habit (from ~1 to ~3.5 visits a week).
                var habit = Members.ToDictionary(m => m, _ => 0.15 + _random.NextDouble() * 0.35);

                for (var day = _today.AddDays(-HistoryDays); day <= _today; day = day.AddDays(1))
                {
                    foreach (var member in Members)
                    {
                        var time = Utc(day, _random.Next(7, 22), _random.Next(0, 60));
                        var visits = _random.NextDouble() < habit[member];
                        if (time > now || time < member.CreatedAt || !visits)
                            continue;

                        var membership = CoveringMembership(member, time);
                        if (membership is not null)
                        {
                            if (!checkedIn.Add((member, day)))
                                continue;

                            AddCheckIn(member, time, membership, null);

                            // Rarely, the QR is scanned twice: the second scan is denied.
                            if (_random.NextDouble() < 0.02 && time.AddMinutes(2) <= now)
                                AddCheckIn(member, time.AddMinutes(2), membership, CheckInDenyReason.AlreadyCheckedInToday);
                            continue;
                        }

                        // No running membership: a few of them still try (frozen or recently expired).
                        var (reason, relevant) = WhyDenied(member, time);
                        if (reason is not null && _random.NextDouble() < 0.15)
                            AddCheckIn(member, time, relevant, reason);
                    }
                }
            }

            private void AddCheckIn(Member member, DateTime time, Membership? membership, CheckInDenyReason? denyReason)
                => CheckIns.Add(new CheckIn
                {
                    Member = member,
                    Membership = membership,
                    CheckedInAt = time,
                    Day = LocalDay(time),
                    Result = denyReason is null ? CheckInResult.Allowed : CheckInResult.Denied,
                    DenyReason = denyReason,
                    CheckedByUserId = adminUserId,
                    CreatedAt = time,
                });

            /// <summary>Only the realistic denials: frozen now, or expired in the last 3 weeks.</summary>
            private (CheckInDenyReason? Reason, Membership? Membership) WhyDenied(Member member, DateTime time)
            {
                var memberships = _membershipsByMember[member];

                var frozen = memberships.FirstOrDefault(m => m.StartDate <= time && time < m.EndDate && IsFrozenAt(m, time));
                if (frozen is not null)
                    return (CheckInDenyReason.MembershipFrozen, frozen);

                var expired = memberships.Where(m => m.EndDate <= time && m.EndDate > time.AddDays(-21)).OrderBy(m => m.EndDate).LastOrDefault();
                if (expired is not null && !memberships.Any(m => m.StartDate > time))
                    return (CheckInDenyReason.MembershipExpired, expired);

                return (null, null);
            }

            #endregion

            #region Helpers

            /// <summary>The membership that lets the member in at this moment (started, not ended, not cancelled yet, not frozen).</summary>
            private Membership? CoveringMembership(Member member, DateTime time)
                => _membershipsByMember[member].FirstOrDefault(m =>
                    m.StartDate <= time && time < m.EndDate
                    && !(m.CancelledAt is { } cancelledAt && cancelledAt <= time)
                    && !IsFrozenAt(m, time));

            private static bool IsFrozenAt(Membership membership, DateTime time)
                => membership.Freezes.Any(f => f.StartDate <= time && time < f.EndDate);

            private Plan PickPlan()
            {
                // Most people buy the cheap plans (plans are sorted by price).
                int[] weights = plans.Count == 4 ? [45, 25, 20, 10] : [.. plans.Select(_ => 1)];
                var roll = _random.Next(weights.Sum());
                for (var i = 0; i < plans.Count; i++)
                {
                    if (roll < weights[i])
                        return plans[i];
                    roll -= weights[i];
                }
                return plans[0];
            }

            private PaymentMethod PickPaymentMethod()
            {
                var roll = _random.Next(100);
                return roll < 50 ? PaymentMethod.Cash : roll < 75 ? PaymentMethod.Card : roll < 95 ? PaymentMethod.InstaPay : PaymentMethod.Online;
            }

            private (string Name, Gender Gender) NewName()
            {
                while (true)
                {
                    var gender = _random.Next(2) == 0 ? Gender.Male : Gender.Female;
                    var first = gender == Gender.Male ? MaleNames[_random.Next(MaleNames.Length)] : FemaleNames[_random.Next(FemaleNames.Length)];
                    var name = $"{first} {LastNames[_random.Next(LastNames.Length)]}";
                    if (_names.Add(name))
                        return (name, gender);
                }
            }

            /// <summary>A unique Egyptian mobile number (matches the API's phone validation: 01[0125] + 8 digits).</summary>
            private string NewPhone()
            {
                string[] prefixes = ["010", "011", "012", "015"];
                while (true)
                {
                    var phone = prefixes[_random.Next(prefixes.Length)] + _random.Next(10_000_000, 100_000_000);
                    if (_phones.Add(phone))
                        return phone;
                }
            }

            private Address NewAddress()
            {
                var (city, street) = Streets[_random.Next(Streets.Length)];
                return new Address { BuildingNumber = _random.Next(1, 121), Street = street, City = city };
            }

            private static string Slug(string name) => name.ToLowerInvariant().Replace(' ', '.');

            /// <summary>A gym-local date and time converted to UTC (the database stores UTC).</summary>
            private DateTime Utc(DateOnly day, int hour, int minute = 0)
                => TimeZoneInfo.ConvertTimeToUtc(day.ToDateTime(new TimeOnly(hour, minute)), zone);

            private DateOnly LocalDay(DateTime utc) => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utc, zone));

            private static DateTime Min(DateTime a, DateTime b) => a < b ? a : b;
            private static DateTime Max(DateTime a, DateTime b) => a > b ? a : b;

            #endregion
        }
    }
}
