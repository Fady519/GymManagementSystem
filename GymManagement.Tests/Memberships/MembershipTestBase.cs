using GymManagement.Tests.Infrastructure;
using GymManagementBLL.DTOs.Memberships;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Memberships
{
    /// <summary>Shared helpers for the membership / freeze / payment tests.</summary>
    public abstract class MembershipTestBase(ApiFactory factory) : IAsyncLifetime
    {
        protected ApiFactory Factory { get; } = factory;
        protected HttpClient Admin { get; private set; } = null!;

        public async Task InitializeAsync() => Admin = await Factory.CreateClientForRoleAsync(AppRoles.Admin);

        public Task DisposeAsync() => Task.CompletedTask;

        protected async Task<Plan> NewPlanAsync(decimal price = 300, int days = 30, bool isActive = true)
        {
            Plan plan = null!;
            await Factory.WithDbAsync(async db => plan = await TestData.AddPlanAsync(db, price, days, isActive));
            return plan;
        }

        protected async Task<int> NewMemberAsync()
        {
            var id = 0;
            await Factory.WithDbAsync(async db => id = (await TestData.AddMemberAsync(db)).Id);
            return id;
        }

        /// <summary>Buys a membership through the API (asserts 201).</summary>
        protected async Task<MembershipResponse> BuyAsync(int memberId, int planId, PaymentMethod method = PaymentMethod.Cash)
        {
            var response = await Admin.PostAsJsonAsync("/api/memberships", new CreateMembershipRequest(memberId, planId, method, null), Json);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return await response.ReadAsAsync<MembershipResponse>();
        }

        /// <summary>A member + a fresh plan + a membership bought now through the API.</summary>
        protected async Task<MembershipResponse> NewRunningMembershipAsync(int days = 30, decimal price = 300)
        {
            var plan = await NewPlanAsync(price, days);
            return await BuyAsync(await NewMemberAsync(), plan.Id);
        }

        protected Task<HttpResponseMessage> RenewAsync(int id, int? planId = null)
            => Admin.PostAsJsonAsync($"/api/memberships/{id}/renew", new RenewMembershipRequest(planId, PaymentMethod.Card, null), Json);

        protected Task<HttpResponseMessage> CancelAsync(int id, decimal? refund = null, PaymentMethod? method = null, string? reason = null)
            => Admin.PostAsJsonAsync($"/api/memberships/{id}/cancel", new CancelMembershipRequest(refund, method, reason), Json);

        protected Task<HttpResponseMessage> FreezeAsync(int id, int days, string? reason = null)
            => Admin.PostAsJsonAsync($"/api/memberships/{id}/freeze", new FreezeMembershipRequest(days, reason), Json);

        protected Task<HttpResponseMessage> UnfreezeAsync(int id)
            => Admin.PostAsync($"/api/memberships/{id}/unfreeze", null);

        protected async Task<MembershipDetailsResponse> GetDetailsAsync(int id)
            => (await Admin.GetFromJsonAsync<MembershipDetailsResponse>($"/api/memberships/{id}", Json))!;

        /// <summary>Inserts a membership directly (no API rules), e.g. one that already ended or is frozen.</summary>
        protected async Task<Membership> InsertMembershipAsync(int memberId, Plan plan, DateTime start, DateTime end,
            MembershipStatus status = MembershipStatus.Active, DateTime? frozenUntil = null, int totalFrozenDays = 0)
        {
            var membership = new Membership
            {
                MemberId = memberId,
                PlanId = plan.Id,
                StartDate = start,
                EndDate = end,
                Status = status,
                FrozenUntil = frozenUntil,
                TotalFrozenDays = totalFrozenDays,
                PlanName = plan.Name,
                PricePaid = plan.Price,
                DurationDays = plan.DurationDays,
            };

            await Factory.WithDbAsync(async db =>
            {
                db.Memberships.Add(membership);
                await db.SaveChangesAsync();
            });
            return membership;
        }

        /// <summary>A new trainer + an upcoming session + a booking for the member. Returns the booking id.</summary>
        protected async Task<int> BookSessionInDbAsync(int memberId, DateTime start)
        {
            var id = 0;
            await Factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                var session = await TestData.AddSessionAsync(db, trainer.Id, startUtc: start);
                id = (await TestData.AddBookingAsync(db, session.Id, memberId)).Id;
            });
            return id;
        }

        protected async Task<BookingStatus> GetBookingStatusAsync(int bookingId)
        {
            var status = BookingStatus.Booked;
            await Factory.WithDbAsync(async db => status = (await db.Bookings.FindAsync(bookingId))!.Status);
            return status;
        }

        /// <summary>Two UTC times are "the same moment" for tests that compare with DateTime.UtcNow.</summary>
        protected static void AssertCloseTo(DateTime expected, DateTime actual, double toleranceSeconds = 60)
            => Assert.True(Math.Abs((expected - actual).TotalSeconds) <= toleranceSeconds, $"Expected about {expected:O} but was {actual:O}.");
    }
}
