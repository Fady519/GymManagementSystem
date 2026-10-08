using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Common;
using GymManagementBLL.DTOs.Members;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Members
{
    [Collection(ApiCollection.Name)]
    public sealed class MembersEndpointsTests(ApiFactory factory) : IAsyncLifetime
    {
        // The first bytes of real files ("magic bytes"): the API checks these, not the file name.
        private static readonly byte[] JpegHeader = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];
        private static readonly byte[] ExeHeader = [0x4D, 0x5A, 0x90, 0x00]; // "MZ"

        private HttpClient _admin = null!;

        public async Task InitializeAsync() => _admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);

        public Task DisposeAsync() => Task.CompletedTask;

        #region Helpers

        private static CreateMemberRequest NewRequest(string? name = null, string? email = null, string? phone = null,
            HealthRecordDto? healthRecord = null)
            => new(
                name ?? TestData.UniquePersonName("Member"),
                email ?? TestData.UniqueEmail(),
                phone ?? TestData.UniquePhone(),
                new DateOnly(2000, 3, 15),
                Gender.Male,
                new AddressDto(5, "Abbas El Akkad", "Nasr City"),
                healthRecord);

        private static UpdateMemberRequest ToUpdate(MemberResponse m)
            => new(m.Name, m.Email, m.Phone, m.DateOfBirth, m.Gender, m.Address);

        private async Task<MemberResponse> CreateMemberAsync(CreateMemberRequest? request = null)
        {
            var response = await _admin.PostAsJsonAsync("/api/members", request ?? NewRequest());
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return await response.ReadAsAsync<MemberResponse>();
        }

        private async Task<PagedResult<MemberListItem>> GetPageAsync(string queryString)
            => (await _admin.GetFromJsonAsync<PagedResult<MemberListItem>>($"/api/members?{queryString}", Json))!;

        private Task<HttpResponseMessage> UploadPhotoAsync(int memberId, byte[] content, string fileName = "photo.jpg")
        {
            var file = new ByteArrayContent(content);
            file.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg"); // the client can lie; the API ignores it

            var form = new MultipartFormDataContent { { file, "photo", fileName } };
            return _admin.PutAsync($"/api/members/{memberId}/photo", form);
        }

        private static byte[] FakeJpeg(int size)
        {
            var bytes = new byte[size];
            JpegHeader.CopyTo(bytes, 0);
            return bytes;
        }

        private async Task<int> FirstPlanIdAsync()
        {
            var id = 0;
            await factory.WithDbAsync(async db => id = await db.Plans.Select(p => p.Id).FirstAsync());
            return id;
        }

        #endregion

        #region Create / Update

        [Fact]
        public async Task Create_WithArabicNameAndHealthRecord_Returns201()
        {
            var request = NewRequest(
                name: "فادي " + TestData.UniquePersonName("Kaiser"),
                healthRecord: new HealthRecordDto(178, 82.5m, "A+", "No injuries"));

            var response = await _admin.PostAsJsonAsync("/api/members", request);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(response.Headers.Location);

            var member = await response.ReadAsAsync<MemberResponse>();
            Assert.Equal(request.Name, member.Name);
            Assert.Equal(MemberMembershipState.None, member.MembershipState);
            Assert.False(member.HasAccount);
            Assert.Null(member.PhotoUrl);
            Assert.Equal("A+", member.HealthRecord!.BloodType);
            Assert.Equal("Nasr City", member.Address!.City);
        }

        [Fact]
        public async Task Create_DuplicateEmailOrPhone_Returns409()
        {
            var existing = await CreateMemberAsync();

            await AssertProblemAsync(await _admin.PostAsJsonAsync("/api/members", NewRequest(email: existing.Email.ToUpperInvariant())),
                HttpStatusCode.Conflict, "Member.EmailTaken");
            await AssertProblemAsync(await _admin.PostAsJsonAsync("/api/members", NewRequest(phone: existing.Phone)),
                HttpStatusCode.Conflict, "Member.PhoneTaken");
        }

        [Fact]
        public async Task Create_InvalidHealthRecord_Returns400()
        {
            var request = NewRequest(healthRecord: new HealthRecordDto(178, 80, "Z+", null));

            var response = await _admin.PostAsJsonAsync("/api/members", request);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Validation.Failed");
        }

        [Fact]
        public async Task Update_ValidData_Returns200()
        {
            var member = await CreateMemberAsync();
            var request = ToUpdate(member) with { Name = TestData.UniquePersonName("Updated"), Address = null };

            var response = await _admin.PutAsJsonAsync($"/api/members/{member.Id}", request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await response.ReadAsAsync<MemberResponse>();
            Assert.Equal(request.Name, updated.Name);
            Assert.Null(updated.Address);
            Assert.NotNull(updated.UpdatedAt);
        }

        [Fact]
        public async Task Update_ToAnotherMembersEmail_Returns409()
        {
            // H6: the old MVC app silently failed here; the API returns a clear 409.
            var first = await CreateMemberAsync();
            var second = await CreateMemberAsync();

            var response = await _admin.PutAsJsonAsync($"/api/members/{second.Id}", ToUpdate(second) with { Email = first.Email });

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Member.EmailTaken");
        }

        [Fact]
        public async Task Update_KeepingOwnEmailAndPhone_IsNotADuplicate()
        {
            var member = await CreateMemberAsync();

            var response = await _admin.PutAsJsonAsync($"/api/members/{member.Id}", ToUpdate(member));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        #endregion

        #region List: search, filter, sort, paging

        [Fact]
        public async Task GetAll_SearchAndMembershipStateFilter()
        {
            var tag = TestData.UniquePersonName("State");
            var planId = await FirstPlanIdAsync();

            await factory.WithDbAsync(async db =>
            {
                await TestData.AddMembershipAsync(db, planId, DateTime.UtcNow.AddDays(10), memberName: $"{tag} Active");
                await TestData.AddMembershipAsync(db, planId, DateTime.UtcNow.AddDays(-1), memberName: $"{tag} Expired");
                await TestData.AddMembershipAsync(db, planId, DateTime.UtcNow.AddDays(10), MembershipStatus.Frozen, $"{tag} Frozen");
                await TestData.AddMemberAsync(db, $"{tag} None");
            });

            var all = await GetPageAsync($"search={Uri.EscapeDataString(tag)}");
            Assert.Equal(4, all.TotalCount);

            foreach (var state in new[] { MemberMembershipState.Active, MemberMembershipState.Expired, MemberMembershipState.Frozen, MemberMembershipState.None })
            {
                var page = await GetPageAsync($"search={Uri.EscapeDataString(tag)}&membershipState={state}");

                var only = Assert.Single(page.Items);
                Assert.Equal($"{tag} {state}", only.Name);
                Assert.Equal(state, only.MembershipState);
            }
        }

        [Fact]
        public async Task GetAll_SortByNameWithPaging()
        {
            var tag = TestData.UniquePersonName("Sort");
            await factory.WithDbAsync(async db =>
            {
                await TestData.AddMemberAsync(db, $"{tag} Charlie");
                await TestData.AddMemberAsync(db, $"{tag} Alpha");
                await TestData.AddMemberAsync(db, $"{tag} Bravo");
            });
            var search = $"search={Uri.EscapeDataString(tag)}&sortBy=Name&descending=false&pageSize=2";

            var page1 = await GetPageAsync(search + "&page=1");
            var page2 = await GetPageAsync(search + "&page=2");

            Assert.Equal([$"{tag} Alpha", $"{tag} Bravo"], page1.Items.Select(m => m.Name));
            Assert.Equal(3, page1.TotalCount);
            Assert.Equal(2, page1.TotalPages);
            Assert.True(page1.HasNextPage);

            Assert.Equal($"{tag} Charlie", Assert.Single(page2.Items).Name);
            Assert.False(page2.HasNextPage);
        }

        [Fact]
        public async Task GetAll_FiltersByGender()
        {
            var tag = TestData.UniquePersonName("Gender");
            var member = await CreateMemberAsync(NewRequest(name: $"{tag} Sara") with { Gender = Gender.Female });
            await CreateMemberAsync(NewRequest(name: $"{tag} Omar"));

            var page = await GetPageAsync($"search={Uri.EscapeDataString(tag)}&gender=Female");

            Assert.Equal(member.Id, Assert.Single(page.Items).Id);
        }

        [Fact]
        public async Task Gender_RoundTrips_AndIsStoredAsText()
        {
            var created = await CreateMemberAsync(NewRequest() with { Gender = Gender.Female });

            // The API sends the enum NAME ("Female"), never a number: the frontend translates it.
            var json = await _admin.GetFromJsonAsync<System.Text.Json.JsonElement>($"/api/members/{created.Id}", Json);
            Assert.Equal("Female", json.GetProperty("gender").GetString());

            // The column is nvarchar since StoreGenderAsString, so SQL shows the readable value too.
            await factory.WithDbAsync(async db =>
            {
                var stored = await db.Database
                    .SqlQuery<string>($"SELECT Gender AS [Value] FROM Members WHERE Id = {created.Id}")
                    .SingleAsync();
                Assert.Equal("Female", stored);
            });
        }

        [Fact]
        public async Task GetAll_PageSizeTooBig_Returns400()
        {
            var response = await _admin.GetAsync("/api/members?pageSize=1000");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var problem = await response.ReadAsAsync<System.Text.Json.JsonElement>();
            Assert.Equal("Validation.Failed", problem.GetProperty("code").GetString());
            Assert.True(problem.GetProperty("errors").TryGetProperty("pageSize", out _)); // camelCase, like the query string
        }

        #endregion

        #region Delete

        [Fact]
        public async Task Delete_WithActiveMembership_Returns409()
        {
            var planId = await FirstPlanIdAsync();
            var memberId = 0;
            await factory.WithDbAsync(async db =>
                memberId = (await TestData.AddMembershipAsync(db, planId, DateTime.UtcNow.AddDays(10))).MemberId);

            var response = await _admin.DeleteAsync($"/api/members/{memberId}");

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Member.HasActiveMembership");
        }

        [Fact]
        public async Task Delete_WithUpcomingBooking_Returns409()
        {
            var member = await CreateMemberAsync();
            await factory.WithDbAsync(db => TestData.AddUpcomingBookingAsync(db, member.Id));

            var response = await _admin.DeleteAsync($"/api/members/{member.Id}");

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Member.HasUpcomingBookings");
        }

        [Fact]
        public async Task Delete_WithExpiredMembershipOnly_Returns204_ThenNotFound()
        {
            var planId = await FirstPlanIdAsync();
            var memberId = 0;
            await factory.WithDbAsync(async db =>
                memberId = (await TestData.AddMembershipAsync(db, planId, DateTime.UtcNow.AddDays(-5))).MemberId);

            var response = await _admin.DeleteAsync($"/api/members/{memberId}");

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            await AssertProblemAsync(await _admin.GetAsync($"/api/members/{memberId}"), HttpStatusCode.NotFound, "Member.NotFound");
        }

        #endregion

        #region Health record

        [Fact]
        public async Task SaveHealthRecord_AddsThenReplaces()
        {
            var member = await CreateMemberAsync();
            Assert.Null(member.HealthRecord);

            var added = await _admin.PutAsJsonAsync($"/api/members/{member.Id}/health-record", new HealthRecordDto(170, 90, "O-", null));
            Assert.Equal(HttpStatusCode.OK, added.StatusCode);

            var replaced = await _admin.PutAsJsonAsync($"/api/members/{member.Id}/health-record", new HealthRecordDto(170, 85, "O-", "Lost 5 kg"));
            Assert.Equal(HttpStatusCode.OK, replaced.StatusCode);

            var reloaded = await _admin.GetFromJsonAsync<MemberResponse>($"/api/members/{member.Id}", Json);
            Assert.Equal(85, reloaded!.HealthRecord!.Weight);
            Assert.Equal("Lost 5 kg", reloaded.HealthRecord.Note);
        }

        [Fact]
        public async Task SaveHealthRecord_UnknownMember_Returns404()
        {
            var response = await _admin.PutAsJsonAsync("/api/members/999999/health-record", new HealthRecordDto(170, 90, "O-", null));

            await AssertProblemAsync(response, HttpStatusCode.NotFound, "Member.NotFound");
        }

        #endregion

        #region Photo

        [Fact]
        public async Task UploadPhoto_Jpeg_Returns200_AndTheFileIsServed()
        {
            var member = await CreateMemberAsync();

            var response = await UploadPhotoAsync(member.Id, FakeJpeg(1024));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await response.ReadAsAsync<MemberResponse>();
            Assert.StartsWith("/uploads/members/", updated.PhotoUrl);
            Assert.EndsWith(".jpg", updated.PhotoUrl);

            // Photos are public files (no token needed) and the browser must not "guess" another type.
            var file = await factory.CreateHttpsClient().GetAsync(updated.PhotoUrl);
            Assert.Equal(HttpStatusCode.OK, file.StatusCode);
            Assert.Equal("image/jpeg", file.Content.Headers.ContentType?.MediaType);
            Assert.Equal("nosniff", file.Headers.GetValues("X-Content-Type-Options").Single());
        }

        [Fact]
        public async Task UploadPhoto_Again_ReplacesAndDeletesTheOldFile()
        {
            var member = await CreateMemberAsync();
            var first = await (await UploadPhotoAsync(member.Id, FakeJpeg(512))).ReadAsAsync<MemberResponse>();

            var second = await (await UploadPhotoAsync(member.Id, FakeJpeg(512))).ReadAsAsync<MemberResponse>();

            Assert.NotEqual(first.PhotoUrl, second.PhotoUrl);
            Assert.False(File.Exists(Path.Combine(ApiFactory.UploadsPath, "members", Path.GetFileName(first.PhotoUrl!))));
            Assert.True(File.Exists(Path.Combine(ApiFactory.UploadsPath, "members", Path.GetFileName(second.PhotoUrl!))));
        }

        [Fact]
        public async Task UploadPhoto_ExeRenamedToJpg_Returns400()
        {
            var member = await CreateMemberAsync();

            var response = await UploadPhotoAsync(member.Id, ExeHeader, "photo.jpg");

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "File.NotAnImage");
        }

        [Fact]
        public async Task UploadPhoto_LargerThan2Mb_Returns400()
        {
            var member = await CreateMemberAsync();

            var response = await UploadPhotoAsync(member.Id, FakeJpeg(2 * 1024 * 1024 + 1));

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "File.TooLarge");
        }

        [Fact]
        public async Task UploadPhoto_WithoutTheFileField_Returns400_Not500()
        {
            // Found by the Postman Runner in B9: a form without the "photo" field crashed with a 500.
            var member = await CreateMemberAsync();
            var form = new MultipartFormDataContent { { new StringContent("hello"), "note" } };

            var response = await _admin.PutAsync($"/api/members/{member.Id}/photo", form);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "File.Empty");
        }

        [Fact]
        public async Task DeletePhoto_RemovesIt()
        {
            var member = await CreateMemberAsync();
            await UploadPhotoAsync(member.Id, FakeJpeg(256));

            var response = await _admin.DeleteAsync($"/api/members/{member.Id}/photo");

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            var reloaded = await _admin.GetFromJsonAsync<MemberResponse>($"/api/members/{member.Id}", Json);
            Assert.Null(reloaded!.PhotoUrl);
        }

        #endregion

        [Theory]
        [InlineData(AppRoles.Member)]
        [InlineData(AppRoles.Trainer)]
        public async Task Endpoints_AsNonAdmin_Return403(string role)
        {
            var client = await factory.CreateClientForRoleAsync(role);

            await AssertProblemAsync(await client.GetAsync("/api/members"), HttpStatusCode.Forbidden, "Auth.Forbidden");
            await AssertProblemAsync(await client.PostAsJsonAsync("/api/members", NewRequest()), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }
    }
}
