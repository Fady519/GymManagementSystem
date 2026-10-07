using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Memberships;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Memberships
{
    [Collection(ApiCollection.Name)]
    public sealed class MembershipsEndpointsTests(ApiFactory factory) : MembershipTestBase(factory)
    {
        #region Create

        [Fact]
        public async Task Create_Returns201_WithCorrectEndDate_AndPurchasePayment()
        {
            var plan = await NewPlanAsync(price: 450, days: 30);
            var memberId = await NewMemberAsync();

            var membership = await BuyAsync(memberId, plan.Id, PaymentMethod.InstaPay);

            Assert.Equal(MembershipState.Active, membership.State);
            AssertCloseTo(DateTime.UtcNow, membership.StartDate);
            Assert.Equal(membership.StartDate.AddDays(30), membership.EndDate);
            Assert.Equal(450, membership.PricePaid);

            // C1 fix: the payment was saved together with the membership.
            var details = await GetDetailsAsync(membership.Id);
            var payment = Assert.Single(details.Payments);
            Assert.Equal(450, payment.Amount);
            Assert.Equal(PaymentType.Purchase, payment.Type);
            Assert.Equal(PaymentMethod.InstaPay, payment.Method);
            Assert.Equal("Test Admin", payment.ReceivedBy);
        }

        [Fact]
        public async Task Create_WhenMemberAlreadyHasRunningMembership_Returns409()
        {
            var current = await NewRunningMembershipAsync();

            var response = await Admin.PostAsJsonAsync("/api/memberships",
                new CreateMembershipRequest(current.MemberId, current.PlanId, PaymentMethod.Cash, null), Json);

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Membership.AlreadyHasMembership");
        }

        [Fact]
        public async Task Create_WithInactivePlan_Returns409()
        {
            var plan = await NewPlanAsync(isActive: false);

            var response = await Admin.PostAsJsonAsync("/api/memberships",
                new CreateMembershipRequest(await NewMemberAsync(), plan.Id, PaymentMethod.Cash, null), Json);

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Membership.PlanInactive");
        }

        [Fact]
        public async Task Create_WithUnknownMember_Returns400()
        {
            var plan = await NewPlanAsync();

            var response = await Admin.PostAsJsonAsync("/api/memberships",
                new CreateMembershipRequest(999_999, plan.Id, PaymentMethod.Cash, null), Json);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Membership.MemberNotFound");
        }

        [Fact]
        public async Task Create_WithInvalidBody_Returns400()
        {
            var response = await Admin.PostAsJsonAsync("/api/memberships",
                new CreateMembershipRequest(0, 0, PaymentMethod.Cash, null), Json);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        #endregion

        #region Renew

        [Fact]
        public async Task EarlyRenewal_StartsWhenCurrentEnds_AndAddsRenewalPayment()
        {
            var current = await NewRunningMembershipAsync();

            var response = await RenewAsync(current.Id);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var renewal = await response.ReadAsAsync<MembershipResponse>();
            Assert.Equal(current.EndDate, renewal.StartDate);
            Assert.Equal(MembershipState.Upcoming, renewal.State);

            var payment = Assert.Single((await GetDetailsAsync(renewal.Id)).Payments);
            Assert.Equal(PaymentType.Renewal, payment.Type);
        }

        [Fact]
        public async Task EarlyRenewal_Twice_Returns409()
        {
            var current = await NewRunningMembershipAsync();
            Assert.Equal(HttpStatusCode.Created, (await RenewAsync(current.Id)).StatusCode);

            await AssertProblemAsync(await RenewAsync(current.Id), HttpStatusCode.Conflict, "Membership.RenewalAlreadyQueued");
        }

        [Fact]
        public async Task Renew_AfterItEnded_OnSamePlan_StartsNow()
        {
            var plan = await NewPlanAsync(days: 30);
            var memberId = await NewMemberAsync();
            var old = await InsertMembershipAsync(memberId, plan, DateTime.UtcNow.AddDays(-40), DateTime.UtcNow.AddDays(-10));

            var response = await RenewAsync(old.Id);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var renewal = await response.ReadAsAsync<MembershipResponse>();
            Assert.Equal(plan.Id, renewal.PlanId);
            Assert.Equal(MembershipState.Active, renewal.State);
            AssertCloseTo(DateTime.UtcNow, renewal.StartDate);
        }

        [Fact]
        public async Task Renew_WithAnotherPlan_CopiesTheNewPlan()
        {
            var current = await NewRunningMembershipAsync(days: 30, price: 300);
            var premium = await NewPlanAsync(price: 900, days: 90);

            var renewal = await (await RenewAsync(current.Id, premium.Id)).ReadAsAsync<MembershipResponse>();

            Assert.Equal(premium.Id, renewal.PlanId);
            Assert.Equal(premium.Name, renewal.PlanName);
            Assert.Equal(900, renewal.PricePaid);
            Assert.Equal(renewal.StartDate.AddDays(90), renewal.EndDate);
        }

        [Fact]
        public async Task Renew_CancelledMembership_Returns409()
        {
            var current = await NewRunningMembershipAsync();
            Assert.Equal(HttpStatusCode.OK, (await CancelAsync(current.Id)).StatusCode);

            await AssertProblemAsync(await RenewAsync(current.Id), HttpStatusCode.Conflict, "Membership.Cancelled");
        }

        #endregion

        #region Cancel

        [Fact]
        public async Task Cancel_KeepsTheRow_AndMarksItCancelled()
        {
            var current = await NewRunningMembershipAsync();

            var response = await CancelAsync(current.Id, reason: "Moved to another city");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var cancelled = await response.ReadAsAsync<MembershipResponse>();
            Assert.Equal(MembershipState.Cancelled, cancelled.State);
            Assert.NotNull(cancelled.CancelledAt);
            Assert.Equal("Moved to another city", cancelled.CancellationReason);

            // H12 fix: nothing was deleted from the database.
            await Factory.WithDbAsync(async db =>
            {
                Assert.True(await db.Memberships.AnyAsync(m => m.Id == current.Id));
                Assert.Equal(1, await db.Payments.CountAsync(p => p.MembershipId == current.Id));
            });
        }

        [Fact]
        public async Task Cancel_WithRefund_AddsRefundPayment()
        {
            var current = await NewRunningMembershipAsync(price: 300);

            Assert.Equal(HttpStatusCode.OK, (await CancelAsync(current.Id, refund: 100, method: PaymentMethod.Cash)).StatusCode);

            var payments = (await GetDetailsAsync(current.Id)).Payments;
            Assert.Equal(2, payments.Count);
            var refund = Assert.Single(payments, p => p.Type == PaymentType.Refund);
            Assert.Equal(100, refund.Amount);
        }

        [Fact]
        public async Task Cancel_RefundMoreThanPaid_Returns400()
        {
            var current = await NewRunningMembershipAsync(price: 300);

            var response = await CancelAsync(current.Id, refund: 301, method: PaymentMethod.Cash);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Membership.RefundTooHigh");
        }

        [Fact]
        public async Task Cancel_RefundWithoutMethod_Returns400()
        {
            var current = await NewRunningMembershipAsync();

            Assert.Equal(HttpStatusCode.BadRequest, (await CancelAsync(current.Id, refund: 50)).StatusCode);
        }

        [Fact]
        public async Task Cancel_WhenRenewalIsWaiting_Returns409()
        {
            var current = await NewRunningMembershipAsync();
            Assert.Equal(HttpStatusCode.Created, (await RenewAsync(current.Id)).StatusCode);

            await AssertProblemAsync(await CancelAsync(current.Id), HttpStatusCode.Conflict, "Membership.HasQueuedRenewal");
        }

        [Fact]
        public async Task Cancel_EndedMembership_Returns409()
        {
            var plan = await NewPlanAsync();
            var old = await InsertMembershipAsync(await NewMemberAsync(), plan, DateTime.UtcNow.AddDays(-40), DateTime.UtcNow.AddDays(-10));

            await AssertProblemAsync(await CancelAsync(old.Id), HttpStatusCode.Conflict, "Membership.Expired");
        }

        [Fact]
        public async Task Cancel_CancelsTheMembersFutureBookings()
        {
            var current = await NewRunningMembershipAsync();
            var bookingId = await BookSessionInDbAsync(current.MemberId, DateTime.UtcNow.AddDays(3));

            Assert.Equal(HttpStatusCode.OK, (await CancelAsync(current.Id)).StatusCode);

            Assert.Equal(BookingStatus.Cancelled, await GetBookingStatusAsync(bookingId));
        }

        [Fact]
        public async Task CancelWaitingRenewal_KeepsBookingsTheCurrentMembershipCovers()
        {
            var current = await NewRunningMembershipAsync(days: 30);
            var renewal = await (await RenewAsync(current.Id)).ReadAsAsync<MembershipResponse>();
            var coveredBooking = await BookSessionInDbAsync(current.MemberId, DateTime.UtcNow.AddDays(5));
            var laterBooking = await BookSessionInDbAsync(current.MemberId, DateTime.UtcNow.AddDays(40));

            Assert.Equal(HttpStatusCode.OK, (await CancelAsync(renewal.Id)).StatusCode);

            Assert.Equal(BookingStatus.Booked, await GetBookingStatusAsync(coveredBooking));
            Assert.Equal(BookingStatus.Cancelled, await GetBookingStatusAsync(laterBooking));
        }

        #endregion

        #region Lists

        [Fact]
        public async Task GetAll_FiltersByCalculatedState()
        {
            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            var now = DateTime.UtcNow;

            var expired = await InsertMembershipAsync(memberId, plan, now.AddDays(-60), now.AddDays(-30));
            var cancelled = await InsertMembershipAsync(memberId, plan, now.AddDays(-29), now.AddDays(-20), MembershipStatus.Cancelled);
            var frozen = await InsertMembershipAsync(memberId, plan, now.AddDays(-5), now.AddDays(25), MembershipStatus.Frozen, now.AddDays(3), 3);
            var upcoming = await InsertMembershipAsync(memberId, plan, now.AddDays(25), now.AddDays(55));

            async Task<int> OnlyIdAsync(MembershipState state)
            {
                var page = await Admin.GetFromJsonAsync<PagedResult<MembershipResponse>>(
                    $"/api/memberships?memberId={memberId}&state={state}", Json);
                return Assert.Single(page!.Items).Id;
            }

            Assert.Equal(expired.Id, await OnlyIdAsync(MembershipState.Expired));
            Assert.Equal(cancelled.Id, await OnlyIdAsync(MembershipState.Cancelled));
            Assert.Equal(frozen.Id, await OnlyIdAsync(MembershipState.Frozen));
            Assert.Equal(upcoming.Id, await OnlyIdAsync(MembershipState.Upcoming));
        }

        [Fact]
        public async Task ExpiringSoon_ListsOnlyMembershipsEndingSoonWithoutRenewal()
        {
            var plan = await NewPlanAsync();
            var now = DateTime.UtcNow;

            var endingSoon = await InsertMembershipAsync(await NewMemberAsync(), plan, now.AddDays(-27), now.AddDays(3));
            var endingLater = await InsertMembershipAsync(await NewMemberAsync(), plan, now.AddDays(-10), now.AddDays(20));
            var renewedMemberId = await NewMemberAsync();
            var renewed = await InsertMembershipAsync(renewedMemberId, plan, now.AddDays(-27), now.AddDays(3));
            await InsertMembershipAsync(renewedMemberId, plan, renewed.EndDate, renewed.EndDate.AddDays(30));

            var list = (await Admin.GetFromJsonAsync<List<MembershipResponse>>("/api/memberships/expiring-soon?days=7", Json))!;

            Assert.Contains(list, m => m.Id == endingSoon.Id);
            Assert.DoesNotContain(list, m => m.Id == endingLater.Id);
            Assert.DoesNotContain(list, m => m.Id == renewed.Id);
        }

        [Fact]
        public async Task GetById_Unknown_Returns404()
            => await AssertProblemAsync(await Admin.GetAsync("/api/memberships/999999"), HttpStatusCode.NotFound, "Membership.NotFound");

        #endregion

        #region Security

        [Fact]
        public async Task Member_CannotManageMemberships_Returns403()
        {
            var member = await Factory.CreateClientForRoleAsync(AppRoles.Member);

            await AssertProblemAsync(await member.GetAsync("/api/memberships"), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        [Fact]
        public async Task Anonymous_Returns401()
        {
            var anonymous = Factory.CreateHttpsClient();

            await AssertProblemAsync(await anonymous.GetAsync("/api/payments"), HttpStatusCode.Unauthorized, "Auth.Unauthenticated");
        }

        #endregion
    }
}
