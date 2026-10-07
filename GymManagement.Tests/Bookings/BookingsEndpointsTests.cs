using GymManagement.Tests.Infrastructure;
using GymManagementBLL.DTOs.Bookings;
using GymManagementBLL.DTOs.Sessions;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Bookings
{
    [Collection(ApiCollection.Name)]
    public sealed class BookingsEndpointsTests(ApiFactory factory) : IAsyncLifetime
    {
        private HttpClient _admin = null!;

        public async Task InitializeAsync() => _admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);

        public Task DisposeAsync() => Task.CompletedTask;

        #region Helpers

        /// <summary>A new trainer + a session for them (fresh trainer = no overlaps with other tests).</summary>
        private async Task<Session> NewSessionAsync(DateTime? start = null, int minutes = 60, int capacity = 10)
        {
            Session session = null!;
            await factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                session = await TestData.AddSessionAsync(db, trainer.Id, startUtc: start ?? DateTime.UtcNow.AddDays(2),
                    durationMinutes: minutes, capacity: capacity);
            });
            return session;
        }

        /// <summary>A new member. By default with a membership valid for the next 30 days.</summary>
        private async Task<int> NewMemberAsync(bool withMembership = true, DateTime? membershipEnd = null,
            MembershipStatus status = MembershipStatus.Active)
        {
            var id = 0;
            await factory.WithDbAsync(async db =>
            {
                id = (await TestData.AddMemberAsync(db)).Id;
                if (withMembership)
                    await TestData.AddMembershipToMemberAsync(db, id, DateTime.UtcNow.AddDays(-1),
                        membershipEnd ?? DateTime.UtcNow.AddDays(30), status);
            });
            return id;
        }

        private Task<HttpResponseMessage> BookAsync(HttpClient client, int sessionId, int? memberId)
            => client.PostAsJsonAsync("/api/bookings", new CreateBookingRequest(sessionId, memberId));

        private async Task<int> AddBookingInDbAsync(int sessionId, int memberId)
        {
            var id = 0;
            await factory.WithDbAsync(async db => id = (await TestData.AddBookingAsync(db, sessionId, memberId)).Id);
            return id;
        }

        private async Task<SessionResponse> GetSessionAsync(int id)
            => (await _admin.GetFromJsonAsync<SessionResponse>($"/api/sessions/{id}", Json))!;

        #endregion

        #region Create

        [Fact]
        public async Task Admin_BooksMember_Returns201_AndSeatIsTaken()
        {
            var session = await NewSessionAsync(capacity: 5);
            var memberId = await NewMemberAsync();

            var response = await BookAsync(_admin, session.Id, memberId);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var booking = await response.ReadAsAsync<BookingResponse>();
            Assert.Equal(memberId, booking.MemberId);
            Assert.Equal(BookingStatus.Booked, booking.Status);
            Assert.Equal(4, (await GetSessionAsync(session.Id)).AvailableSlots);
        }

        [Fact]
        public async Task Admin_WithoutMemberId_Returns400()
        {
            var session = await NewSessionAsync();

            await AssertProblemAsync(await BookAsync(_admin, session.Id, null), HttpStatusCode.BadRequest, "Booking.MemberRequired");
        }

        [Fact]
        public async Task Member_AlwaysBooksHimself_EvenIfHeSendsAnotherMemberId()
        {
            var session = await NewSessionAsync();
            var me = await NewMemberAsync();
            var someoneElse = await NewMemberAsync();
            var client = await factory.CreateClientForMemberAsync(me);

            var response = await BookAsync(client, session.Id, someoneElse);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.Equal(me, (await response.ReadAsAsync<BookingResponse>()).MemberId);
        }

        [Fact]
        public async Task Trainer_CannotBook_Returns403()
        {
            var trainer = await factory.CreateClientForRoleAsync(AppRoles.Trainer);

            await AssertProblemAsync(await BookAsync(trainer, 1, 1), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        [Fact]
        public async Task SameMemberTwice_Returns409()
        {
            var session = await NewSessionAsync();
            var memberId = await NewMemberAsync();
            await AddBookingInDbAsync(session.Id, memberId);

            await AssertProblemAsync(await BookAsync(_admin, session.Id, memberId), HttpStatusCode.Conflict, "Booking.AlreadyBooked");
        }

        [Fact]
        public async Task FullSession_Returns409()
        {
            var session = await NewSessionAsync(capacity: 1);
            await AddBookingInDbAsync(session.Id, await NewMemberAsync());

            await AssertProblemAsync(await BookAsync(_admin, session.Id, await NewMemberAsync()), HttpStatusCode.Conflict, "Session.Full");
        }

        [Fact]
        public async Task TwoBookingsAtTheSameMoment_ForTheLastSeat_OnlyOneWins()
        {
            // The last seat is protected by RowVersion: the second save fails, retries, and sees "full".
            var session = await NewSessionAsync(capacity: 1);
            var first = await NewMemberAsync();
            var second = await NewMemberAsync();

            var responses = await Task.WhenAll(BookAsync(_admin, session.Id, first), BookAsync(_admin, session.Id, second));

            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Created);
            var loser = Assert.Single(responses, r => r.StatusCode != HttpStatusCode.Created);
            await AssertProblemAsync(loser, HttpStatusCode.Conflict, "Session.Full");
            Assert.Equal(1, (await GetSessionAsync(session.Id)).BookedCount);
        }

        [Fact]
        public async Task ManyBookingsAtTheSameMoment_NeverOverbook()
        {
            var session = await NewSessionAsync(capacity: 2);
            var members = new List<int>();
            for (var i = 0; i < 5; i++)
                members.Add(await NewMemberAsync());

            var responses = await Task.WhenAll(members.Select(m => BookAsync(_admin, session.Id, m)));

            Assert.Equal(2, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
            Assert.All(responses.Where(r => r.StatusCode != HttpStatusCode.Created),
                r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
            Assert.Equal(2, (await GetSessionAsync(session.Id)).BookedCount);
        }

        [Fact]
        public async Task MemberWithoutMembership_Returns409()
        {
            var session = await NewSessionAsync();

            await AssertProblemAsync(await BookAsync(_admin, session.Id, await NewMemberAsync(withMembership: false)),
                HttpStatusCode.Conflict, "Booking.NoValidMembership");
        }

        [Fact]
        public async Task MembershipEndingBeforeTheSession_Returns409()
        {
            var session = await NewSessionAsync(start: DateTime.UtcNow.AddDays(5));
            var memberId = await NewMemberAsync(membershipEnd: DateTime.UtcNow.AddDays(3));

            await AssertProblemAsync(await BookAsync(_admin, session.Id, memberId), HttpStatusCode.Conflict, "Booking.NoValidMembership");
        }

        [Fact]
        public async Task FrozenMembership_Returns409()
        {
            var session = await NewSessionAsync();
            var memberId = await NewMemberAsync(status: MembershipStatus.Frozen);

            await AssertProblemAsync(await BookAsync(_admin, session.Id, memberId), HttpStatusCode.Conflict, "Booking.NoValidMembership");
        }

        [Fact]
        public async Task OverlappingSessionForTheSameMember_Returns409()
        {
            var start = DateTime.UtcNow.AddDays(2);
            var first = await NewSessionAsync(start);
            var overlapping = await NewSessionAsync(start.AddMinutes(30)); // another trainer, same time
            var memberId = await NewMemberAsync();
            await AddBookingInDbAsync(first.Id, memberId);

            await AssertProblemAsync(await BookAsync(_admin, overlapping.Id, memberId), HttpStatusCode.Conflict, "Booking.MemberBusy");
        }

        [Fact]
        public async Task SessionAlreadyStarted_Returns409()
        {
            var running = await NewSessionAsync(start: DateTime.UtcNow.AddMinutes(-10));

            await AssertProblemAsync(await BookAsync(_admin, running.Id, await NewMemberAsync()), HttpStatusCode.Conflict, "Booking.SessionNotBookable");
        }

        [Fact]
        public async Task CancelledSession_Returns409()
        {
            var session = await NewSessionAsync();
            await _admin.PostAsync($"/api/sessions/{session.Id}/cancel", null);

            await AssertProblemAsync(await BookAsync(_admin, session.Id, await NewMemberAsync()), HttpStatusCode.Conflict, "Booking.SessionNotBookable");
        }

        #endregion

        #region Cancel

        [Fact]
        public async Task Member_CancelsOwnBooking_BeforeDeadline_ThenCanBookAgain()
        {
            var session = await NewSessionAsync(start: DateTime.UtcNow.AddDays(1));
            var memberId = await NewMemberAsync();
            var client = await factory.CreateClientForMemberAsync(memberId);
            var booking = await (await BookAsync(client, session.Id, null)).ReadAsAsync<BookingResponse>();

            var response = await client.PostAsync($"/api/bookings/{booking.Id}/cancel", null);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            await AssertProblemAsync(await client.PostAsync($"/api/bookings/{booking.Id}/cancel", null), HttpStatusCode.Conflict, "Booking.NotActive");
            Assert.Equal(HttpStatusCode.Created, (await BookAsync(client, session.Id, null)).StatusCode);
        }

        [Fact]
        public async Task Member_AfterDeadline_Returns409_ButAdminCanStillCancel()
        {
            var session = await NewSessionAsync(start: DateTime.UtcNow.AddHours(1)); // deadline is 2 hours
            var memberId = await NewMemberAsync();
            var bookingId = await AddBookingInDbAsync(session.Id, memberId);
            var client = await factory.CreateClientForMemberAsync(memberId);

            await AssertProblemAsync(await client.PostAsync($"/api/bookings/{bookingId}/cancel", null),
                HttpStatusCode.Conflict, "Booking.CancellationDeadlinePassed");

            Assert.Equal(HttpStatusCode.NoContent, (await _admin.PostAsync($"/api/bookings/{bookingId}/cancel", null)).StatusCode);
        }

        [Fact]
        public async Task Member_CannotCancelSomeoneElsesBooking()
        {
            var session = await NewSessionAsync();
            var bookingId = await AddBookingInDbAsync(session.Id, await NewMemberAsync());
            var stranger = await factory.CreateClientForMemberAsync(await NewMemberAsync());

            await AssertProblemAsync(await stranger.PostAsync($"/api/bookings/{bookingId}/cancel", null), HttpStatusCode.Forbidden, "Booking.NotYours");
        }

        [Fact]
        public async Task Cancel_AfterTheSessionStarted_Returns409_EvenForAdmin()
        {
            var running = await NewSessionAsync(start: DateTime.UtcNow.AddMinutes(-5));
            var bookingId = await AddBookingInDbAsync(running.Id, await NewMemberAsync());

            await AssertProblemAsync(await _admin.PostAsync($"/api/bookings/{bookingId}/cancel", null), HttpStatusCode.Conflict, "Booking.SessionStarted");
        }

        #endregion

        #region Attend

        [Fact]
        public async Task Attend_RunningSession_ByItsTrainer_Returns204_Once()
        {
            var running = await NewSessionAsync(start: DateTime.UtcNow.AddMinutes(-10));
            var bookingId = await AddBookingInDbAsync(running.Id, await NewMemberAsync());
            var trainer = await factory.CreateClientForTrainerAsync(running.TrainerId);

            var response = await trainer.PostAsync($"/api/bookings/{bookingId}/attend", null);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            await AssertProblemAsync(await trainer.PostAsync($"/api/bookings/{bookingId}/attend", null), HttpStatusCode.Conflict, "Booking.NotActive");
        }

        [Fact]
        public async Task Attend_ByAnotherTrainer_Returns403()
        {
            var running = await NewSessionAsync(start: DateTime.UtcNow.AddMinutes(-10));
            var bookingId = await AddBookingInDbAsync(running.Id, await NewMemberAsync());
            var otherTrainerId = 0;
            await factory.WithDbAsync(async db => otherTrainerId = (await TestData.AddTrainerAsync(db)).Id);
            var other = await factory.CreateClientForTrainerAsync(otherTrainerId);

            await AssertProblemAsync(await other.PostAsync($"/api/bookings/{bookingId}/attend", null), HttpStatusCode.Forbidden, "Session.NotYours");
        }

        [Fact]
        public async Task Attend_UpcomingSession_Returns409()
        {
            // H5: "attendance only for the running session" was only a comment in the old code.
            var session = await NewSessionAsync();
            var bookingId = await AddBookingInDbAsync(session.Id, await NewMemberAsync());

            await AssertProblemAsync(await _admin.PostAsync($"/api/bookings/{bookingId}/attend", null), HttpStatusCode.Conflict, "Booking.AttendanceNotOpen");
        }

        [Fact]
        public async Task Attend_AsMember_Returns403()
        {
            var member = await factory.CreateClientForRoleAsync(AppRoles.Member);

            await AssertProblemAsync(await member.PostAsync("/api/bookings/1/attend", null), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        #endregion
    }
}
