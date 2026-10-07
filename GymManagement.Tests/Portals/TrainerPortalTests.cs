using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Sessions;
using GymManagementBLL.DTOs.Trainers;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Portals
{
    /// <summary>Trainer portal (/api/trainer) + the "session cancelled" emails.</summary>
    [Collection(ApiCollection.Name)]
    public sealed class TrainerPortalTests(ApiFactory factory)
    {
        #region Trainer portal

        [Fact]
        public async Task GetProfile_ReturnsMyTrainerData()
        {
            var trainerId = 0;
            await factory.WithDbAsync(async db => trainerId = (await TestData.AddTrainerAsync(db)).Id);
            var client = await factory.CreateClientForTrainerAsync(trainerId);

            var me = await client.GetFromJsonAsync<TrainerResponse>("/api/trainer/me", Json);

            Assert.Equal(trainerId, me!.Id);
            Assert.True(me.HasAccount);
        }

        [Fact]
        public async Task GetSessions_ReturnsOnlyMySessions_EvenIfAnotherTrainerIdIsSent()
        {
            int myId = 0, otherId = 0, mySessionId = 0;
            await factory.WithDbAsync(async db =>
            {
                myId = (await TestData.AddTrainerAsync(db)).Id;
                otherId = (await TestData.AddTrainerAsync(db)).Id;
                mySessionId = (await TestData.AddSessionAsync(db, myId)).Id;
                await TestData.AddSessionAsync(db, otherId);
            });
            var client = await factory.CreateClientForTrainerAsync(myId);

            var page = await client.GetFromJsonAsync<PagedResult<SessionResponse>>($"/api/trainer/sessions?trainerId={otherId}", Json);

            var only = Assert.Single(page!.Items);
            Assert.Equal(mySessionId, only.Id);
        }

        [Fact]
        public async Task GetSessionBookings_OfAnotherTrainersSession_Returns403()
        {
            int myId = 0, otherSessionId = 0;
            await factory.WithDbAsync(async db =>
            {
                myId = (await TestData.AddTrainerAsync(db)).Id;
                var other = await TestData.AddTrainerAsync(db);
                otherSessionId = (await TestData.AddSessionAsync(db, other.Id)).Id;
            });
            var client = await factory.CreateClientForTrainerAsync(myId);

            var response = await client.GetAsync($"/api/trainer/sessions/{otherSessionId}/bookings");

            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "Session.NotYours");
        }

        [Fact]
        public async Task GetSessionBookings_OfMySession_ListsTheBookedMembers()
        {
            int myId = 0, sessionId = 0, memberId = 0;
            await factory.WithDbAsync(async db =>
            {
                myId = (await TestData.AddTrainerAsync(db)).Id;
                sessionId = (await TestData.AddSessionAsync(db, myId)).Id;
                memberId = (await TestData.AddMemberAsync(db)).Id;
                await TestData.AddBookingAsync(db, sessionId, memberId);
            });
            var client = await factory.CreateClientForTrainerAsync(myId);

            var bookings = await client.GetFromJsonAsync<List<SessionBookingItem>>($"/api/trainer/sessions/{sessionId}/bookings", Json);

            Assert.Equal(memberId, Assert.Single(bookings!).MemberId);
        }

        [Fact]
        public async Task MarkAttended_InMyRunningSession_Works_ButNotInAnotherTrainersSession()
        {
            int myId = 0, myBookingId = 0, otherBookingId = 0;
            await factory.WithDbAsync(async db =>
            {
                myId = (await TestData.AddTrainerAsync(db)).Id;
                var other = await TestData.AddTrainerAsync(db);
                var member = await TestData.AddMemberAsync(db);

                // Both sessions are running right now (started 10 minutes ago).
                var mySession = await TestData.AddSessionAsync(db, myId, startUtc: DateTime.UtcNow.AddMinutes(-10));
                var otherSession = await TestData.AddSessionAsync(db, other.Id, startUtc: DateTime.UtcNow.AddMinutes(-10));
                myBookingId = (await TestData.AddBookingAsync(db, mySession.Id, member.Id)).Id;
                otherBookingId = (await TestData.AddBookingAsync(db, otherSession.Id, member.Id)).Id;
            });
            var client = await factory.CreateClientForTrainerAsync(myId);

            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/trainer/bookings/{myBookingId}/attend", null)).StatusCode);
            await AssertProblemAsync(await client.PostAsync($"/api/trainer/bookings/{otherBookingId}/attend", null),
                HttpStatusCode.Forbidden, "Session.NotYours");
        }

        [Fact]
        public async Task Trainer_CannotUseAdminEndpoints()
        {
            var trainerId = 0;
            await factory.WithDbAsync(async db => trainerId = (await TestData.AddTrainerAsync(db)).Id);
            var client = await factory.CreateClientForTrainerAsync(trainerId);

            await AssertProblemAsync(await client.GetAsync("/api/members"), HttpStatusCode.Forbidden, "Auth.Forbidden");
            await AssertProblemAsync(await client.GetAsync("/api/me"), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        [Theory]
        [InlineData(AppRoles.Admin)]
        [InlineData(AppRoles.Member)]
        public async Task TrainerPortal_IsForTrainersOnly(string role)
        {
            var client = await factory.CreateClientForRoleAsync(role);

            await AssertProblemAsync(await client.GetAsync("/api/trainer/sessions"), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        [Fact]
        public async Task TrainerAccountNotLinkedToAProfile_Returns403()
        {
            var client = await factory.CreateClientForRoleAsync(AppRoles.Trainer); // account without a trainer row

            await AssertProblemAsync(await client.GetAsync("/api/trainer/me"), HttpStatusCode.Forbidden, "Auth.NotATrainer");
        }

        #endregion

        #region Session cancelled emails

        [Fact]
        public async Task CancelSession_EmailsEveryBookedMember_ButNotThoseWhoAlreadyCancelled()
        {
            var admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);
            int sessionId = 0;
            string bookedEmail = "", cancelledEmail = "";
            await factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                sessionId = (await TestData.AddSessionAsync(db, trainer.Id)).Id;

                var booked = await TestData.AddMemberAsync(db);
                var cancelled = await TestData.AddMemberAsync(db);
                await TestData.AddBookingAsync(db, sessionId, booked.Id);
                var oldBooking = await TestData.AddBookingAsync(db, sessionId, cancelled.Id);
                oldBooking.Status = BookingStatus.Cancelled;
                await db.SaveChangesAsync();

                bookedEmail = booked.Email;
                cancelledEmail = cancelled.Email;
            });

            var response = await admin.PostAsync($"/api/sessions/{sessionId}/cancel", null);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            var email = Assert.Single(factory.Emails.SentTo(bookedEmail));
            Assert.StartsWith("Session cancelled", email.Subject);
            Assert.Empty(factory.Emails.SentTo(cancelledEmail));

            await factory.WithDbAsync(async db =>
                Assert.All(await db.Bookings.Where(b => b.SessionId == sessionId).ToListAsync(),
                    b => Assert.Equal(BookingStatus.Cancelled, b.Status)));
        }

        [Fact]
        public async Task CancelSession_WhenTheMailServerIsDown_StillCancels()
        {
            var admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);
            var sessionId = 0;
            await factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                sessionId = (await TestData.AddSessionAsync(db, trainer.Id)).Id;
                var member = await TestData.AddMemberAsync(db);
                await TestData.AddBookingAsync(db, sessionId, member.Id);
            });

            factory.Emails.SimulateFailure = true;
            try
            {
                Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/sessions/{sessionId}/cancel", null)).StatusCode);
            }
            finally
            {
                factory.Emails.SimulateFailure = false;
            }

            await factory.WithDbAsync(async db =>
                Assert.Equal(SessionStatus.Cancelled, await db.Sessions.Where(s => s.Id == sessionId).Select(s => s.Status).FirstAsync()));
        }

        #endregion
    }
}
