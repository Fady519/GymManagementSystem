using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Sessions;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Sessions
{
    [Collection(ApiCollection.Name)]
    public sealed class SessionsEndpointsTests(ApiFactory factory) : IAsyncLifetime
    {
        private readonly HttpClient _anonymous = factory.CreateHttpsClient();
        private HttpClient _admin = null!;

        public async Task InitializeAsync() => _admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);

        public Task DisposeAsync() => Task.CompletedTask;

        #region Helpers

        /// <summary>Whole minutes, two days from now (always in the future).</summary>
        private static DateTime InTwoDays()
        {
            var t = DateTime.UtcNow.AddDays(2);
            return new DateTime(t.Year, t.Month, t.Day, t.Hour, t.Minute, 0, DateTimeKind.Utc);
        }

        /// <summary>A brand-new trainer, so other tests' sessions never overlap with ours.</summary>
        private async Task<Trainer> NewTrainerAsync()
        {
            Trainer trainer = null!;
            await factory.WithDbAsync(async db => trainer = await TestData.AddTrainerAsync(db));
            return trainer;
        }

        private static SaveSessionRequest NewRequest(Trainer trainer, DateTime? start = null, int minutes = 60, int capacity = 10)
        {
            var s = start ?? InTwoDays();
            return new SaveSessionRequest("Morning boxing class", capacity, s, s.AddMinutes(minutes), trainer.CategoryId, trainer.Id);
        }

        private async Task<SessionResponse> CreateSessionAsync(SaveSessionRequest request)
        {
            var response = await _admin.PostAsJsonAsync("/api/sessions", request, Json);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return await response.ReadAsAsync<SessionResponse>();
        }

        /// <summary>A member with a membership valid for the next 30 days.</summary>
        private async Task<int> NewMemberWithMembershipAsync()
        {
            var id = 0;
            await factory.WithDbAsync(async db =>
            {
                id = (await TestData.AddMemberAsync(db)).Id;
                await TestData.AddMembershipToMemberAsync(db, id, DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(30));
            });
            return id;
        }

        private async Task<Session> AddSessionInDbAsync(int trainerId, DateTime start, int minutes = 60, int capacity = 10)
        {
            Session session = null!;
            await factory.WithDbAsync(async db => session = await TestData.AddSessionAsync(db, trainerId, startUtc: start, durationMinutes: minutes, capacity: capacity));
            return session;
        }

        #endregion

        #region Create

        [Fact]
        public async Task Create_Valid_Returns201_WithCountsAndNames()
        {
            var trainer = await NewTrainerAsync();

            var response = await _admin.PostAsJsonAsync("/api/sessions", NewRequest(trainer, capacity: 12), Json);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(response.Headers.Location);

            var session = await response.ReadAsAsync<SessionResponse>();
            Assert.Equal(12, session.Capacity);
            Assert.Equal(0, session.BookedCount);
            Assert.Equal(12, session.AvailableSlots);
            Assert.Equal(SessionState.Upcoming, session.State);
            Assert.Equal(trainer.Name, session.TrainerName);
            Assert.False(string.IsNullOrEmpty(session.CategoryName));
        }

        [Theory]
        [InlineData(0)]   // H7: the old form accepted 0
        [InlineData(26)]
        public async Task Create_CapacityOutOfRange_Returns400(int capacity)
        {
            var response = await _admin.PostAsJsonAsync("/api/sessions", NewRequest(await NewTrainerAsync(), capacity: capacity), Json);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Validation.Failed");
        }

        [Theory]
        [InlineData(-60, 60)]   // starts in the past
        [InlineData(0, 10)]     // shorter than 30 minutes
        [InlineData(0, 300)]    // longer than 4 hours
        [InlineData(0, -30)]    // ends before it starts
        public async Task Create_InvalidTimes_Returns400(int startOffsetMinutes, int durationMinutes)
        {
            var trainer = await NewTrainerAsync();
            var start = startOffsetMinutes < 0 ? DateTime.UtcNow.AddMinutes(startOffsetMinutes) : InTwoDays();

            var response = await _admin.PostAsJsonAsync("/api/sessions", NewRequest(trainer, start, durationMinutes), Json);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Validation.Failed");
        }

        [Fact]
        public async Task Create_TimeWithoutUtcMarker_Returns400()
        {
            var trainer = await NewTrainerAsync();
            var local = DateTime.SpecifyKind(InTwoDays(), DateTimeKind.Unspecified); // sent without "Z"

            var response = await _admin.PostAsJsonAsync("/api/sessions", NewRequest(trainer, local), Json);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Validation.Failed");
        }

        [Fact]
        public async Task Create_CategoryIsNotTheTrainersSpeciality_Returns400()
        {
            var trainer = await NewTrainerAsync();
            var otherCategoryId = 0;
            await factory.WithDbAsync(async db =>
            {
                var category = new Category { Name = TestData.UniqueName("Category") };
                db.Categories.Add(category);
                await db.SaveChangesAsync();
                otherCategoryId = category.Id;
            });

            var response = await _admin.PostAsJsonAsync("/api/sessions", NewRequest(trainer) with { CategoryId = otherCategoryId }, Json);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Session.TrainerCategoryMismatch");
        }

        [Fact]
        public async Task Create_UnknownTrainer_Returns400()
        {
            var trainer = await NewTrainerAsync();

            var response = await _admin.PostAsJsonAsync("/api/sessions", NewRequest(trainer) with { TrainerId = 999_999 }, Json);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Session.TrainerNotFound");
        }

        [Fact]
        public async Task Create_TrainerAlreadyBusy_Returns409_ButBackToBackIsFine()
        {
            // H13: the old code let a trainer have two sessions at the same time.
            var trainer = await NewTrainerAsync();
            var start = InTwoDays();
            await CreateSessionAsync(NewRequest(trainer, start, 60));

            var overlapping = await _admin.PostAsJsonAsync("/api/sessions", NewRequest(trainer, start.AddMinutes(30), 60), Json);
            await AssertProblemAsync(overlapping, HttpStatusCode.Conflict, "Session.TrainerBusy");

            var backToBack = await _admin.PostAsJsonAsync("/api/sessions", NewRequest(trainer, start.AddMinutes(60), 60), Json);
            Assert.Equal(HttpStatusCode.Created, backToBack.StatusCode);
        }

        [Fact]
        public async Task Create_WithoutToken_Returns401_AndAsMember_Returns403()
        {
            var request = NewRequest(await NewTrainerAsync());
            var member = await factory.CreateClientForRoleAsync(AppRoles.Member);

            await AssertProblemAsync(await _anonymous.PostAsJsonAsync("/api/sessions", request, Json), HttpStatusCode.Unauthorized, "Auth.Unauthenticated");
            await AssertProblemAsync(await member.PostAsJsonAsync("/api/sessions", request, Json), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        #endregion

        #region List

        [Fact]
        public async Task GetAll_IsPublic_FiltersByTrainerAndState_AndCountsBookings()
        {
            var trainer = await NewTrainerAsync();
            var upcoming = await AddSessionInDbAsync(trainer.Id, DateTime.UtcNow.AddDays(1), capacity: 5);
            var ongoing = await AddSessionInDbAsync(trainer.Id, DateTime.UtcNow.AddMinutes(-15));
            var completed = await AddSessionInDbAsync(trainer.Id, DateTime.UtcNow.AddDays(-2));
            var memberId = await NewMemberWithMembershipAsync();
            await factory.WithDbAsync(db => TestData.AddBookingAsync(db, upcoming.Id, memberId));

            var all = await _anonymous.GetFromJsonAsync<PagedResult<SessionResponse>>($"/api/sessions?trainerId={trainer.Id}", Json);
            Assert.Equal(3, all!.TotalCount);
            Assert.Equal([completed.Id, ongoing.Id, upcoming.Id], all.Items.Select(s => s.Id)); // ordered by start time

            var booked = all.Items.Single(s => s.Id == upcoming.Id);
            Assert.Equal(1, booked.BookedCount);
            Assert.Equal(4, booked.AvailableSlots);

            var running = await _anonymous.GetFromJsonAsync<PagedResult<SessionResponse>>($"/api/sessions?trainerId={trainer.Id}&state=Ongoing", Json);
            Assert.Equal(ongoing.Id, Assert.Single(running!.Items).Id);
            Assert.Equal(SessionState.Ongoing, running.Items[0].State);
        }

        #endregion

        #region Update / Cancel / Delete

        [Fact]
        public async Task Update_Valid_Returns200()
        {
            var trainer = await NewTrainerAsync();
            var session = await CreateSessionAsync(NewRequest(trainer));

            var response = await _admin.PutAsJsonAsync($"/api/sessions/{session.Id}",
                NewRequest(trainer, InTwoDays().AddHours(3), 90, 20) with { Description = "Evening class" }, Json);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await response.ReadAsAsync<SessionResponse>();
            Assert.Equal("Evening class", updated.Description);
            Assert.Equal(20, updated.Capacity);
        }

        [Fact]
        public async Task Update_CapacityBelowBookings_Returns409()
        {
            var trainer = await NewTrainerAsync();
            var session = await AddSessionInDbAsync(trainer.Id, InTwoDays());
            foreach (var _ in Enumerable.Range(0, 2))
            {
                var memberId = await NewMemberWithMembershipAsync();
                await factory.WithDbAsync(db => TestData.AddBookingAsync(db, session.Id, memberId));
            }

            var response = await _admin.PutAsJsonAsync($"/api/sessions/{session.Id}", NewRequest(trainer, session.StartDate, 60, capacity: 1), Json);

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Session.CapacityBelowBookings");
        }

        [Fact]
        public async Task Update_PastSession_Returns409()
        {
            var trainer = await NewTrainerAsync();
            var past = await AddSessionInDbAsync(trainer.Id, DateTime.UtcNow.AddDays(-1));

            var response = await _admin.PutAsJsonAsync($"/api/sessions/{past.Id}", NewRequest(trainer), Json);

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Session.NotUpcoming");
        }

        [Fact]
        public async Task Cancel_CancelsTheSessionAndItsBookings()
        {
            var trainer = await NewTrainerAsync();
            var session = await AddSessionInDbAsync(trainer.Id, InTwoDays());
            var memberId = await NewMemberWithMembershipAsync();
            await factory.WithDbAsync(db => TestData.AddBookingAsync(db, session.Id, memberId));

            var response = await _admin.PostAsync($"/api/sessions/{session.Id}/cancel", null);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            var reloaded = await _anonymous.GetFromJsonAsync<SessionResponse>($"/api/sessions/{session.Id}", Json);
            Assert.Equal(SessionState.Cancelled, reloaded!.State);

            var bookings = await _admin.GetFromJsonAsync<List<SessionBookingItem>>($"/api/sessions/{session.Id}/bookings", Json);
            Assert.Equal(BookingStatus.Cancelled, Assert.Single(bookings!).Status);

            await AssertProblemAsync(await _admin.PostAsync($"/api/sessions/{session.Id}/cancel", null), HttpStatusCode.Conflict, "Session.NotUpcoming");
        }

        [Fact]
        public async Task Delete_UpcomingWithoutBookings_Returns204_ThenNotFound()
        {
            var session = await CreateSessionAsync(NewRequest(await NewTrainerAsync()));

            var response = await _admin.DeleteAsync($"/api/sessions/{session.Id}");

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            await AssertProblemAsync(await _anonymous.GetAsync($"/api/sessions/{session.Id}"), HttpStatusCode.NotFound, "Session.NotFound");
        }

        [Fact]
        public async Task Delete_WithBookings_Returns409()
        {
            var trainer = await NewTrainerAsync();
            var session = await AddSessionInDbAsync(trainer.Id, InTwoDays());
            var memberId = await NewMemberWithMembershipAsync();
            await factory.WithDbAsync(db => TestData.AddBookingAsync(db, session.Id, memberId));

            var response = await _admin.DeleteAsync($"/api/sessions/{session.Id}");

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Session.HasBookings");
        }

        [Fact]
        public async Task Delete_PastSession_Returns409()
        {
            // H8: the old rule was reversed and deleted past sessions (= history).
            var trainer = await NewTrainerAsync();
            var past = await AddSessionInDbAsync(trainer.Id, DateTime.UtcNow.AddDays(-3));

            var response = await _admin.DeleteAsync($"/api/sessions/{past.Id}");

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Session.NotUpcoming");
        }

        #endregion

        #region Bookings list / available members

        [Fact]
        public async Task GetBookings_OwnTrainerAllowed_OtherTrainerForbidden()
        {
            var trainer = await NewTrainerAsync();
            var otherTrainer = await NewTrainerAsync();
            var session = await AddSessionInDbAsync(trainer.Id, InTwoDays());
            var memberId = await NewMemberWithMembershipAsync();
            await factory.WithDbAsync(db => TestData.AddBookingAsync(db, session.Id, memberId));

            var own = await factory.CreateClientForTrainerAsync(trainer.Id);
            var other = await factory.CreateClientForTrainerAsync(otherTrainer.Id);
            var member = await factory.CreateClientForRoleAsync(AppRoles.Member);

            var list = await own.GetFromJsonAsync<List<SessionBookingItem>>($"/api/sessions/{session.Id}/bookings", Json);
            Assert.Equal(memberId, Assert.Single(list!).MemberId);

            await AssertProblemAsync(await other.GetAsync($"/api/sessions/{session.Id}/bookings"), HttpStatusCode.Forbidden, "Session.NotYours");
            await AssertProblemAsync(await member.GetAsync($"/api/sessions/{session.Id}/bookings"), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        [Fact]
        public async Task AvailableMembers_OnlyValidMembership_AndNotAlreadyBooked()
        {
            // C7: members who had already booked used to stay in this list.
            var trainer = await NewTrainerAsync();
            var session = await AddSessionInDbAsync(trainer.Id, InTwoDays());
            var tag = TestData.UniquePersonName("Avail");

            int valid = 0, booked = 0, expired = 0, none = 0;
            await factory.WithDbAsync(async db =>
            {
                valid = (await TestData.AddMemberAsync(db, $"{tag} Valid")).Id;
                booked = (await TestData.AddMemberAsync(db, $"{tag} Booked")).Id;
                expired = (await TestData.AddMemberAsync(db, $"{tag} Expired")).Id;
                none = (await TestData.AddMemberAsync(db, $"{tag} None")).Id;

                await TestData.AddMembershipToMemberAsync(db, valid, DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(30));
                await TestData.AddMembershipToMemberAsync(db, booked, DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(30));
                await TestData.AddMembershipToMemberAsync(db, expired, DateTime.UtcNow.AddDays(-30), DateTime.UtcNow.AddDays(1)); // ends before the session
                await TestData.AddBookingAsync(db, session.Id, booked);
            });

            var list = await _admin.GetFromJsonAsync<List<AvailableMemberItem>>(
                $"/api/sessions/{session.Id}/available-members?search={Uri.EscapeDataString(tag)}", Json);

            Assert.Equal(valid, Assert.Single(list!).Id);
        }

        #endregion
    }
}
