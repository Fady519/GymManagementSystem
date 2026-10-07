using GymManagement.Tests.Infrastructure;
using GymManagementBLL.DTOs.Bookings;
using GymManagementBLL.DTOs.Members;
using GymManagementBLL.DTOs.Memberships;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Memberships
{
    [Collection(ApiCollection.Name)]
    public sealed class MembershipFreezeTests(ApiFactory factory) : MembershipTestBase(factory)
    {
        #region Freeze

        [Fact]
        public async Task Freeze10Days_MovesEndDateBy10Days()
        {
            var current = await NewRunningMembershipAsync();

            var response = await FreezeAsync(current.Id, 10, "Travel");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var frozen = await response.ReadAsAsync<MembershipResponse>();
            Assert.Equal(MembershipState.Frozen, frozen.State);
            Assert.Equal(current.EndDate.AddDays(10), frozen.EndDate);
            Assert.Equal(10, frozen.TotalFrozenDays);
            AssertCloseTo(DateTime.UtcNow.AddDays(10), frozen.FrozenUntil!.Value);

            var freeze = Assert.Single((await GetDetailsAsync(current.Id)).Freezes);
            Assert.Equal(10, freeze.Days);
            Assert.Equal("Travel", freeze.Reason);
        }

        [Theory]
        [InlineData(2)]
        [InlineData(31)]
        public async Task Freeze_DaysOutOfRange_Returns400(int days)
        {
            var current = await NewRunningMembershipAsync();

            Assert.Equal(HttpStatusCode.BadRequest, (await FreezeAsync(current.Id, days)).StatusCode);
        }

        [Fact]
        public async Task Freeze_MoreThan30DaysInTotal_Returns409()
        {
            var plan = await NewPlanAsync();
            var now = DateTime.UtcNow;
            var membership = await InsertMembershipAsync(await NewMemberAsync(), plan, now.AddDays(-10), now.AddDays(45), totalFrozenDays: 25);

            await AssertProblemAsync(await FreezeAsync(membership.Id, 10), HttpStatusCode.Conflict, "Membership.FreezeLimitReached");
            Assert.Equal(HttpStatusCode.OK, (await FreezeAsync(membership.Id, 5)).StatusCode);
        }

        [Fact]
        public async Task Freeze_AlreadyFrozen_Returns409()
        {
            var current = await NewRunningMembershipAsync();
            Assert.Equal(HttpStatusCode.OK, (await FreezeAsync(current.Id, 5)).StatusCode);

            await AssertProblemAsync(await FreezeAsync(current.Id, 5), HttpStatusCode.Conflict, "Membership.NotActive");
        }

        [Fact]
        public async Task Freeze_WaitingRenewal_Returns409()
        {
            var current = await NewRunningMembershipAsync();
            var renewal = await (await RenewAsync(current.Id)).ReadAsAsync<MembershipResponse>();

            await AssertProblemAsync(await FreezeAsync(renewal.Id, 5), HttpStatusCode.Conflict, "Membership.NotActive");
        }

        [Fact]
        public async Task Freeze_CancelsBookingsDuringTheFreeze_AndKeepsLaterOnes()
        {
            var current = await NewRunningMembershipAsync(days: 30);
            var duringFreeze = await BookSessionInDbAsync(current.MemberId, DateTime.UtcNow.AddDays(2));
            var afterFreeze = await BookSessionInDbAsync(current.MemberId, DateTime.UtcNow.AddDays(20));

            Assert.Equal(HttpStatusCode.OK, (await FreezeAsync(current.Id, 10)).StatusCode);

            Assert.Equal(BookingStatus.Cancelled, await GetBookingStatusAsync(duringFreeze));
            Assert.Equal(BookingStatus.Booked, await GetBookingStatusAsync(afterFreeze));
        }

        [Fact]
        public async Task Freeze_MovesTheWaitingRenewalToo()
        {
            var current = await NewRunningMembershipAsync();
            var renewal = await (await RenewAsync(current.Id)).ReadAsAsync<MembershipResponse>();

            var frozen = await (await FreezeAsync(current.Id, 5)).ReadAsAsync<MembershipResponse>();

            var movedRenewal = (await GetDetailsAsync(renewal.Id)).Membership;
            Assert.Equal(frozen.EndDate, movedRenewal.StartDate);
            Assert.Equal(renewal.EndDate.AddDays(5), movedRenewal.EndDate);
        }

        [Fact]
        public async Task Booking_DuringFreeze_Returns409_AfterFreeze_Succeeds()
        {
            var current = await NewRunningMembershipAsync(days: 30);
            Assert.Equal(HttpStatusCode.OK, (await FreezeAsync(current.Id, 5)).StatusCode);

            int duringId = 0, afterId = 0;
            await Factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                duringId = (await TestData.AddSessionAsync(db, trainer.Id, startUtc: DateTime.UtcNow.AddDays(2))).Id;
                afterId = (await TestData.AddSessionAsync(db, trainer.Id, startUtc: DateTime.UtcNow.AddDays(8))).Id;
            });

            var during = await Admin.PostAsJsonAsync("/api/bookings", new CreateBookingRequest(duringId, current.MemberId));
            var after = await Admin.PostAsJsonAsync("/api/bookings", new CreateBookingRequest(afterId, current.MemberId));

            await AssertProblemAsync(during, HttpStatusCode.Conflict, "Booking.NoValidMembership");
            Assert.Equal(HttpStatusCode.Created, after.StatusCode);
        }

        #endregion

        #region Unfreeze and freezes that end by themselves

        [Fact]
        public async Task UnfreezeEarly_GivesBackTheUnusedDays()
        {
            // Frozen 10 days, started 2.5 days ago => 3 days used (a started day counts), 7 days given back.
            var plan = await NewPlanAsync();
            var now = DateTime.UtcNow;
            var freezeStart = now.AddDays(-2.5);
            var membership = await InsertMembershipAsync(await NewMemberAsync(), plan, now.AddDays(-12.5), now.AddDays(27.5),
                MembershipStatus.Frozen, freezeStart.AddDays(10), totalFrozenDays: 10);

            await Factory.WithDbAsync(async db =>
            {
                db.MembershipFreezes.Add(new MembershipFreeze
                {
                    MembershipId = membership.Id, StartDate = freezeStart, EndDate = freezeStart.AddDays(10), Days = 10,
                });
                await db.SaveChangesAsync();
            });

            var response = await UnfreezeAsync(membership.Id);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var active = await response.ReadAsAsync<MembershipResponse>();
            Assert.Equal(MembershipState.Active, active.State);
            Assert.Equal(membership.EndDate.AddDays(-7), active.EndDate);
            Assert.Equal(3, active.TotalFrozenDays);
            Assert.Null(active.FrozenUntil);
            Assert.NotNull(Assert.Single((await GetDetailsAsync(membership.Id)).Freezes).EndedEarlyAt);
        }

        [Fact]
        public async Task Unfreeze_NotFrozen_Returns409()
        {
            var current = await NewRunningMembershipAsync();

            await AssertProblemAsync(await UnfreezeAsync(current.Id), HttpStatusCode.Conflict, "Membership.NotFrozen");
        }

        [Fact]
        public async Task FreezeThatEnded_CountsAsActive_AndCanBeFrozenAgain()
        {
            var plan = await NewPlanAsync();
            var now = DateTime.UtcNow;
            var memberId = await NewMemberAsync();
            var membership = await InsertMembershipAsync(memberId, plan, now.AddDays(-20), now.AddDays(15),
                MembershipStatus.Frozen, frozenUntil: now.AddDays(-1), totalFrozenDays: 5);

            Assert.Equal(MembershipState.Active, (await GetDetailsAsync(membership.Id)).Membership.State);
            var member = await Admin.GetFromJsonAsync<MemberResponse>($"/api/members/{memberId}", Json);
            Assert.Equal(MemberMembershipState.Active, member!.MembershipState);

            var refrozen = await (await FreezeAsync(membership.Id, 5)).ReadAsAsync<MembershipResponse>();
            Assert.Equal(MembershipState.Frozen, refrozen.State);
            Assert.Equal(10, refrozen.TotalFrozenDays);

            await Factory.WithDbAsync(async db =>
                Assert.Equal(MembershipStatus.Frozen, (await db.Memberships.SingleAsync(m => m.Id == membership.Id)).Status));
        }

        #endregion
    }
}
