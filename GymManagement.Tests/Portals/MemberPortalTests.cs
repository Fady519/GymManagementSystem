using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Bookings;
using GymManagementBLL.DTOs.Common;
using GymManagementBLL.DTOs.Members;
using GymManagementBLL.DTOs.Memberships;
using GymManagementBLL.DTOs.Payments;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Portals
{
    /// <summary>Member account invites (reception) + the member portal (/api/me).</summary>
    [Collection(ApiCollection.Name)]
    public sealed class MemberPortalTests(ApiFactory factory)
    {
        #region Helpers

        private async Task<int> AddMemberAsync(bool withMembership = false)
        {
            var memberId = 0;
            await factory.WithDbAsync(async db =>
            {
                memberId = (await TestData.AddMemberAsync(db, withDetails: true)).Id;
                if (withMembership)
                    await TestData.AddMembershipToMemberAsync(db, memberId, DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(30));
            });
            return memberId;
        }

        private async Task<int> AddUpcomingSessionAsync()
        {
            var sessionId = 0;
            await factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                sessionId = (await TestData.AddSessionAsync(db, trainer.Id)).Id;
            });
            return sessionId;
        }

        #endregion

        #region Member account (reception)

        [Fact]
        public async Task CreateAccount_SendsInvite_AndTheMemberLogsInWithTheirMemberId()
        {
            var admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);
            var memberId = await AddMemberAsync();

            var response = await admin.PostAsync($"/api/members/{memberId}/account", null);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.ReadAsAsync<MemberWithAccountResponse>();
            Assert.True(result.InviteSent);
            Assert.True(result.Member.HasAccount);

            await factory.AcceptInviteAsync(result.Member.Email);
            var login = await factory.LoginAsync(result.Member.Email);

            Assert.Equal([AppRoles.Member], login.User.Roles);
            Assert.Equal(memberId, login.User.MemberId);
        }

        [Fact]
        public async Task CreateAccount_AfterActivation_Returns409()
        {
            var admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);
            var memberId = await AddMemberAsync();
            var result = await (await admin.PostAsync($"/api/members/{memberId}/account", null)).ReadAsAsync<MemberWithAccountResponse>();
            await factory.AcceptInviteAsync(result.Member.Email);

            var again = await admin.PostAsync($"/api/members/{memberId}/account", null);

            await AssertProblemAsync(again, HttpStatusCode.Conflict, "Member.AlreadyHasAccount");
        }

        [Fact]
        public async Task CreateAccount_EmailAlreadyUsedByAnotherLogin_Returns409_AndLinksNothing()
        {
            var admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);
            var memberId = await AddMemberAsync();
            var otherAccountEmail = await factory.CreateUserAsync(AppRoles.Admin);
            await factory.WithDbAsync(async db =>
            {
                var member = await db.Members.FirstAsync(m => m.Id == memberId);
                member.Email = otherAccountEmail;
                await db.SaveChangesAsync();
            });

            var response = await admin.PostAsync($"/api/members/{memberId}/account", null);

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Member.EmailTaken");
            await factory.WithDbAsync(async db =>
                Assert.Null(await db.Members.Where(m => m.Id == memberId).Select(m => m.UserId).FirstAsync()));
        }

        [Fact]
        public async Task CreateAccount_UnknownMember_Returns404()
        {
            var admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);

            await AssertProblemAsync(await admin.PostAsync("/api/members/999999/account", null), HttpStatusCode.NotFound, "Member.NotFound");
        }

        #endregion

        #region Access rules

        [Theory]
        [InlineData(AppRoles.Admin)]
        [InlineData(AppRoles.Trainer)]
        public async Task Me_IsForMembersOnly(string role)
        {
            var client = await factory.CreateClientForRoleAsync(role);

            await AssertProblemAsync(await client.GetAsync("/api/me"), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        [Fact]
        public async Task Me_MemberAccountNotLinkedToAProfile_Returns403()
        {
            var client = await factory.CreateClientForRoleAsync(AppRoles.Member); // account without a member row

            await AssertProblemAsync(await client.GetAsync("/api/me"), HttpStatusCode.Forbidden, "Auth.NotAMember");
        }

        [Fact]
        public async Task Member_CannotUseTheAdminMemberEndpoints()
        {
            var memberId = await AddMemberAsync();
            var otherId = await AddMemberAsync();
            var client = await factory.CreateClientForMemberAsync(memberId);

            await AssertProblemAsync(await client.GetAsync($"/api/members/{otherId}"), HttpStatusCode.Forbidden, "Auth.Forbidden");
            await AssertProblemAsync(await client.GetAsync($"/api/members/{memberId}"), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        #endregion

        #region Profile

        [Fact]
        public async Task GetProfile_ReturnsMyOwnData()
        {
            var memberId = await AddMemberAsync();
            var client = await factory.CreateClientForMemberAsync(memberId);

            var me = await client.GetFromJsonAsync<MemberResponse>("/api/me", Json);

            Assert.Equal(memberId, me!.Id);
            Assert.True(me.HasAccount);
            Assert.NotNull(me.HealthRecord);
        }

        [Fact]
        public async Task UpdateProfile_ChangesPhoneAndAddress_ButNeverNameOrEmail()
        {
            var memberId = await AddMemberAsync();
            var client = await factory.CreateClientForMemberAsync(memberId);
            var before = await client.GetFromJsonAsync<MemberResponse>("/api/me", Json);
            var newPhone = TestData.UniquePhone();

            // Extra fields (name, email) are simply ignored: they are not part of the request type.
            var response = await client.PutAsJsonAsync("/api/me", new
            {
                phone = newPhone,
                address = new AddressDto(7, "Nile Street", "Giza"),
                name = "Hacker Name",
                email = "hacker@test.com",
            });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var after = await response.ReadAsAsync<MemberResponse>();
            Assert.Equal(newPhone, after.Phone);
            Assert.Equal("Giza", after.Address!.City);
            Assert.Equal(before!.Name, after.Name);
            Assert.Equal(before.Email, after.Email);
        }

        [Fact]
        public async Task UpdateProfile_PhoneOfAnotherMember_Returns409()
        {
            var memberId = await AddMemberAsync();
            var otherId = await AddMemberAsync();
            var otherPhone = "";
            await factory.WithDbAsync(async db => otherPhone = await db.Members.Where(m => m.Id == otherId).Select(m => m.Phone).FirstAsync());
            var client = await factory.CreateClientForMemberAsync(memberId);

            var response = await client.PutAsJsonAsync("/api/me", new UpdateMyProfileRequest(otherPhone, null));

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Member.PhoneTaken");
        }

        [Fact]
        public async Task UpdateProfile_InvalidPhone_Returns400()
        {
            var client = await factory.CreateClientForMemberAsync(await AddMemberAsync());

            var response = await client.PutAsJsonAsync("/api/me", new UpdateMyProfileRequest("12345", null));

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Validation.Failed");
        }

        [Fact]
        public async Task SaveHealthRecord_UpdatesMyRecord()
        {
            var client = await factory.CreateClientForMemberAsync(await AddMemberAsync());

            var response = await client.PutAsJsonAsync("/api/me/health-record", new HealthRecordDto(175, 72, "A+", "Knee injury in 2022"));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var me = await client.GetFromJsonAsync<MemberResponse>("/api/me", Json);
            Assert.Equal("A+", me!.HealthRecord!.BloodType);
            Assert.Equal(72, me.HealthRecord.Weight);
        }

        [Fact]
        public async Task DeletePhoto_WithoutAPhoto_Returns204()
        {
            var client = await factory.CreateClientForMemberAsync(await AddMemberAsync());

            Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/me/photo")).StatusCode);
        }

        #endregion

        #region Memberships / payments

        [Fact]
        public async Task GetMemberships_ReturnsOnlyMine()
        {
            var memberId = await AddMemberAsync(withMembership: true);
            await AddMemberAsync(withMembership: true); // someone else
            var client = await factory.CreateClientForMemberAsync(memberId);

            var memberships = await client.GetFromJsonAsync<List<MembershipResponse>>("/api/me/memberships", Json);

            var only = Assert.Single(memberships!);
            Assert.Equal(memberId, only.MemberId);
        }

        [Fact]
        public async Task GetPayments_NewMember_ReturnsAnEmptyList()
        {
            var client = await factory.CreateClientForMemberAsync(await AddMemberAsync());

            var payments = await client.GetFromJsonAsync<List<PaymentResponse>>("/api/me/payments", Json);

            Assert.Empty(payments!);
        }

        #endregion

        #region Bookings

        [Fact]
        public async Task Book_ForMyself_ThenSeeItInMyUpcomingBookings_ThenCancelIt()
        {
            var memberId = await AddMemberAsync(withMembership: true);
            var sessionId = await AddUpcomingSessionAsync();
            var client = await factory.CreateClientForMemberAsync(memberId);

            var book = await client.PostAsJsonAsync("/api/me/bookings", new BookSessionRequest(sessionId));

            Assert.Equal(HttpStatusCode.Created, book.StatusCode);
            var booking = await book.ReadAsAsync<BookingResponse>();
            Assert.Equal(memberId, booking.MemberId);

            var upcoming = await client.GetFromJsonAsync<PagedResult<MyBookingItem>>("/api/me/bookings?upcoming=true", Json);
            var item = Assert.Single(upcoming!.Items);
            Assert.Equal(booking.Id, item.Id);
            Assert.False(string.IsNullOrEmpty(item.TrainerName));
            Assert.False(string.IsNullOrEmpty(item.CategoryName));

            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/me/bookings/{booking.Id}/cancel", null)).StatusCode);

            var afterCancel = await client.GetFromJsonAsync<PagedResult<MyBookingItem>>("/api/me/bookings?upcoming=true", Json);
            Assert.Empty(afterCancel!.Items);

            // Still in the full history, as Cancelled.
            var history = await client.GetFromJsonAsync<PagedResult<MyBookingItem>>("/api/me/bookings", Json);
            Assert.Equal(BookingStatus.Cancelled, Assert.Single(history!.Items).Status);
        }

        [Fact]
        public async Task Book_WithoutAValidMembership_Returns409()
        {
            var client = await factory.CreateClientForMemberAsync(await AddMemberAsync());
            var sessionId = await AddUpcomingSessionAsync();

            var response = await client.PostAsJsonAsync("/api/me/bookings", new BookSessionRequest(sessionId));

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Booking.NoValidMembership");
        }

        [Fact]
        public async Task GetBookings_NeverShowsOtherMembersBookings()
        {
            var memberId = await AddMemberAsync();
            var otherId = await AddMemberAsync();
            await factory.WithDbAsync(async db => await TestData.AddUpcomingBookingAsync(db, otherId));
            var client = await factory.CreateClientForMemberAsync(memberId);

            var page = await client.GetFromJsonAsync<PagedResult<MyBookingItem>>("/api/me/bookings", Json);

            Assert.Empty(page!.Items);
        }

        [Fact]
        public async Task CancelBooking_OfAnotherMember_Returns403()
        {
            var memberId = await AddMemberAsync();
            var otherId = await AddMemberAsync();
            var otherBookingId = 0;
            await factory.WithDbAsync(async db => otherBookingId = (await TestData.AddUpcomingBookingAsync(db, otherId)).Id);
            var client = await factory.CreateClientForMemberAsync(memberId);

            var response = await client.PostAsync($"/api/me/bookings/{otherBookingId}/cancel", null);

            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "Booking.NotYours");
        }

        [Fact]
        public async Task GetBookings_InvalidPageSize_Returns400()
        {
            var client = await factory.CreateClientForMemberAsync(await AddMemberAsync());

            await AssertProblemAsync(await client.GetAsync("/api/me/bookings?pageSize=0"), HttpStatusCode.BadRequest, "Validation.Failed");
        }

        #endregion
    }
}
