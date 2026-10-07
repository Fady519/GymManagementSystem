using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Auth;
using GymManagementBLL.DTOs.Categories;
using GymManagementBLL.DTOs.Common;
using GymManagementBLL.DTOs.Trainers;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Trainers
{
    [Collection(ApiCollection.Name)]
    public sealed class TrainersEndpointsTests(ApiFactory factory) : IAsyncLifetime
    {
        private HttpClient _admin = null!;
        private int _categoryId;

        public async Task InitializeAsync()
        {
            _admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);
            var categories = await factory.CreateHttpsClient().GetFromJsonAsync<List<CategoryResponse>>("/api/categories", Json);
            _categoryId = categories![0].Id;
        }

        public Task DisposeAsync() => Task.CompletedTask;

        #region Helpers

        private SaveTrainerRequest NewRequest(string? name = null, string? email = null, string? phone = null, int? categoryId = null)
            => new(
                name ?? TestData.UniquePersonName("Coach"),
                email ?? TestData.UniqueEmail(),
                phone ?? TestData.UniquePhone(),
                new DateOnly(1992, 5, 10),
                Gender.Male,
                categoryId ?? _categoryId,
                new AddressDto(12, "Tahrir Street", "Cairo"));

        private async Task<TrainerWithAccountResponse> CreateTrainerAsync(SaveTrainerRequest? request = null)
        {
            var response = await _admin.PostAsJsonAsync("/api/trainers", request ?? NewRequest());
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return await response.ReadAsAsync<TrainerWithAccountResponse>();
        }

        private Task<HttpResponseMessage> LoginAsync(string email, string password)
            => factory.CreateHttpsClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));

        #endregion

        #region Create

        [Fact]
        public async Task Create_ReturnsTrainerAndTemporaryPassword_ThatCanLogIn()
        {
            var request = NewRequest(name: "كابتن " + TestData.UniquePersonName("Ali")); // Arabic names are allowed

            var response = await _admin.PostAsJsonAsync("/api/trainers", request);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(response.Headers.Location);

            var created = await response.ReadAsAsync<TrainerWithAccountResponse>();
            Assert.Equal(request.Name, created.Trainer.Name);
            Assert.Equal(request.Email, created.Trainer.Email);
            Assert.Equal(_categoryId, created.Trainer.CategoryId);
            Assert.False(string.IsNullOrEmpty(created.Trainer.CategoryName));
            Assert.True(created.Trainer.HasAccount);
            Assert.False(string.IsNullOrEmpty(created.TemporaryPassword));

            // The trainer logs in with the temporary password and must change it.
            var login = await LoginAsync(request.Email, created.TemporaryPassword);
            Assert.Equal(HttpStatusCode.OK, login.StatusCode);

            var user = (await login.ReadAsAsync<AuthResponse>()).User;
            Assert.True(user.MustChangePassword);
            Assert.Contains(AppRoles.Trainer, user.Roles);
            Assert.Equal(created.Trainer.Id, user.TrainerId);
        }

        [Fact]
        public async Task Create_DuplicateEmail_Returns409()
        {
            var existing = await CreateTrainerAsync();

            var response = await _admin.PostAsJsonAsync("/api/trainers", NewRequest(email: existing.Trainer.Email));

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Trainer.EmailTaken");
        }

        [Fact]
        public async Task Create_DuplicatePhone_Returns409()
        {
            var existing = await CreateTrainerAsync();

            var response = await _admin.PostAsJsonAsync("/api/trainers", NewRequest(phone: existing.Trainer.Phone));

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Trainer.PhoneTaken");
        }

        [Fact]
        public async Task Create_EmailOfAnotherLoginAccount_Returns409_AndSavesNothing()
        {
            var adminEmail = await factory.CreateUserAsync(AppRoles.Admin);
            var request = NewRequest(email: adminEmail);

            var response = await _admin.PostAsJsonAsync("/api/trainers", request);

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Trainer.EmailTaken");

            var search = await _admin.GetFromJsonAsync<PagedResult<TrainerResponse>>($"/api/trainers?search={request.Phone}", Json);
            Assert.Equal(0, search!.TotalCount);
        }

        [Fact]
        public async Task Create_UnknownCategory_Returns400()
        {
            var response = await _admin.PostAsJsonAsync("/api/trainers", NewRequest(categoryId: 999_999));

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Trainer.CategoryNotFound");
        }

        [Theory]
        [InlineData("Coach 007", "01012345678")]   // digits in the name
        [InlineData("Coach Sami", "12345")]        // not an Egyptian mobile
        public async Task Create_InvalidData_Returns400(string name, string phone)
        {
            var response = await _admin.PostAsJsonAsync("/api/trainers", NewRequest(name: name, phone: phone));

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Validation.Failed");
        }

        [Fact]
        public async Task Create_UnderEighteen_Returns400()
        {
            var request = NewRequest() with { DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-16) };

            var response = await _admin.PostAsJsonAsync("/api/trainers", request);

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Validation.Failed");
        }

        #endregion

        #region List / Update

        [Fact]
        public async Task GetAll_FiltersByCategory()
        {
            var categoryResponse = await _admin.PostAsJsonAsync("/api/categories", new SaveCategoryRequest(TestData.UniqueName("Category")));
            var category = await categoryResponse.ReadAsAsync<CategoryResponse>();
            var trainer = await CreateTrainerAsync(NewRequest(categoryId: category.Id));
            await CreateTrainerAsync(); // another category

            var page = await _admin.GetFromJsonAsync<PagedResult<TrainerResponse>>($"/api/trainers?categoryId={category.Id}", Json);

            var only = Assert.Single(page!.Items);
            Assert.Equal(trainer.Trainer.Id, only.Id);
            Assert.Equal(category.Name, only.CategoryName);
        }

        [Fact]
        public async Task Update_ChangesData_AndSyncsTheLoginEmail()
        {
            var created = await CreateTrainerAsync();
            var newEmail = TestData.UniqueEmail();
            var request = NewRequest(email: newEmail, phone: created.Trainer.Phone) with { Gender = Gender.Female };

            var response = await _admin.PutAsJsonAsync($"/api/trainers/{created.Trainer.Id}", request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await response.ReadAsAsync<TrainerResponse>();
            Assert.Equal(newEmail, updated.Email);
            Assert.Equal(Gender.Female, updated.Gender);

            // The account follows the profile: the new email works, the old one doesn't.
            Assert.Equal(HttpStatusCode.OK, (await LoginAsync(newEmail, created.TemporaryPassword)).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(created.Trainer.Email, created.TemporaryPassword)).StatusCode);
        }

        [Fact]
        public async Task Update_UnknownTrainer_Returns404()
        {
            var response = await _admin.PutAsJsonAsync("/api/trainers/999999", NewRequest());

            await AssertProblemAsync(response, HttpStatusCode.NotFound, "Trainer.NotFound");
        }

        #endregion

        #region Delete

        [Fact]
        public async Task Delete_WithUpcomingSession_Returns409()
        {
            var trainerId = 0;
            await factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                await TestData.AddSessionAsync(db, trainer.Id);
                trainerId = trainer.Id;
            });

            var response = await _admin.DeleteAsync($"/api/trainers/{trainerId}");

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Trainer.HasUpcomingSessions");
        }

        [Fact]
        public async Task Delete_SoftDeletes_AndDisablesTheAccount()
        {
            var created = await CreateTrainerAsync();

            var response = await _admin.DeleteAsync($"/api/trainers/{created.Trainer.Id}");

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            await AssertProblemAsync(await _admin.GetAsync($"/api/trainers/{created.Trainer.Id}"), HttpStatusCode.NotFound, "Trainer.NotFound");
            await AssertProblemAsync(await LoginAsync(created.Trainer.Email, created.TemporaryPassword), HttpStatusCode.Forbidden, "Auth.AccountDisabled");
        }

        #endregion

        #region Account

        [Fact]
        public async Task CreateAccount_ForOldTrainerWithoutAccount_Works_OnlyOnce()
        {
            var trainerId = 0;
            await factory.WithDbAsync(async db => trainerId = (await TestData.AddTrainerAsync(db)).Id);

            var first = await _admin.PostAsync($"/api/trainers/{trainerId}/account", null);

            Assert.Equal(HttpStatusCode.Created, first.StatusCode);
            var result = await first.ReadAsAsync<TrainerWithAccountResponse>();
            Assert.True(result.Trainer.HasAccount);
            Assert.Equal(HttpStatusCode.OK, (await LoginAsync(result.Trainer.Email, result.TemporaryPassword)).StatusCode);

            var second = await _admin.PostAsync($"/api/trainers/{trainerId}/account", null);
            await AssertProblemAsync(second, HttpStatusCode.Conflict, "Trainer.AlreadyHasAccount");
        }

        #endregion

        [Theory]
        [InlineData(AppRoles.Member)]
        [InlineData(AppRoles.Trainer)]
        public async Task Endpoints_AsNonAdmin_Return403(string role)
        {
            var client = await factory.CreateClientForRoleAsync(role);

            await AssertProblemAsync(await client.GetAsync("/api/trainers"), HttpStatusCode.Forbidden, "Auth.Forbidden");
            await AssertProblemAsync(await client.PostAsJsonAsync("/api/trainers", NewRequest()), HttpStatusCode.Forbidden, "Auth.Forbidden");
        }
    }
}
