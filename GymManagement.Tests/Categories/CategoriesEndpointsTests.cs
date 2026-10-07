using GymManagement.Tests.Infrastructure;
using GymManagementBLL.DTOs.Categories;
using GymManagementDAL.Entities.Identity;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Categories
{
    [Collection(ApiCollection.Name)]
    public sealed class CategoriesEndpointsTests(ApiFactory factory) : IAsyncLifetime
    {
        // Reading categories is public (website); changing them needs an Admin token.
        private readonly HttpClient _anonymous = factory.CreateHttpsClient();
        private HttpClient _admin = null!;

        public async Task InitializeAsync() => _admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);

        public Task DisposeAsync() => Task.CompletedTask;

        private async Task<CategoryResponse> CreateCategoryAsync(string? name = null)
        {
            var response = await _admin.PostAsJsonAsync("/api/categories", new SaveCategoryRequest(name ?? TestData.UniqueName("Category")));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return await response.ReadAsAsync<CategoryResponse>();
        }

        [Fact]
        public async Task GetAll_IsPublic_AndReturnsSeededCategories()
        {
            var response = await _anonymous.GetAsync("/api/categories");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var categories = await response.ReadAsAsync<List<CategoryResponse>>();
            Assert.NotEmpty(categories);
        }

        [Fact]
        public async Task Create_ValidName_Returns201WithZeroTrainers()
        {
            var name = TestData.UniqueName("Category");

            var category = await CreateCategoryAsync($"  {name}  ");

            Assert.Equal(name, category.Name); // trimmed
            Assert.Equal(0, category.TrainersCount);
        }

        [Fact]
        public async Task Create_DuplicateName_Returns409()
        {
            var existing = await CreateCategoryAsync();

            var response = await _admin.PostAsJsonAsync("/api/categories", new SaveCategoryRequest(existing.Name));

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Category.NameTaken");
        }

        [Fact]
        public async Task Create_EmptyName_Returns400()
        {
            var response = await _admin.PostAsJsonAsync("/api/categories", new SaveCategoryRequest(""));

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Validation.Failed");
        }

        [Fact]
        public async Task Create_WithoutToken_Returns401()
        {
            var response = await _anonymous.PostAsJsonAsync("/api/categories", new SaveCategoryRequest(TestData.UniqueName("Category")));

            await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "Auth.Unauthenticated");
        }

        [Theory]
        [InlineData(AppRoles.Member)]
        [InlineData(AppRoles.Trainer)]
        public async Task Create_AsNonAdmin_Returns403(string role)
        {
            var client = await factory.CreateClientForRoleAsync(role);

            var response = await client.PostAsJsonAsync("/api/categories", new SaveCategoryRequest(TestData.UniqueName("Category")));

            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        [Fact]
        public async Task Update_ChangesName()
        {
            var category = await CreateCategoryAsync();
            var newName = TestData.UniqueName("Renamed");

            var response = await _admin.PutAsJsonAsync($"/api/categories/{category.Id}", new SaveCategoryRequest(newName));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(newName, (await response.ReadAsAsync<CategoryResponse>()).Name);
        }

        [Fact]
        public async Task Delete_EmptyCategory_Returns204_ThenNotFound()
        {
            var category = await CreateCategoryAsync();

            var response = await _admin.DeleteAsync($"/api/categories/{category.Id}");

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            await AssertProblemAsync(await _anonymous.GetAsync($"/api/categories/{category.Id}"), HttpStatusCode.NotFound, "Category.NotFound");
        }

        [Fact]
        public async Task Delete_WhenTrainersUseIt_Returns409()
        {
            var category = await CreateCategoryAsync();
            await factory.WithDbAsync(db => TestData.AddTrainerAsync(db, category.Id));

            var listed = await _anonymous.GetFromJsonAsync<CategoryResponse>($"/api/categories/{category.Id}", Json);
            Assert.Equal(1, listed!.TrainersCount);

            var response = await _admin.DeleteAsync($"/api/categories/{category.Id}");

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Category.HasTrainers");
        }

        [Fact]
        public async Task Delete_WhenItHasUpcomingSessions_Returns409()
        {
            var category = await CreateCategoryAsync();
            await factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db); // the trainer is in another category
                await TestData.AddSessionAsync(db, trainer.Id, category.Id);
            });

            var response = await _admin.DeleteAsync($"/api/categories/{category.Id}");

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Category.HasUpcomingSessions");
        }
    }
}
