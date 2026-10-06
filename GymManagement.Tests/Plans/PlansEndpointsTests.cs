using GymManagement.Tests.Infrastructure;
using GymManagementBLL.DTOs.Plans;
using GymManagementDAL.Entities.Enums;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace GymManagement.Tests.Plans
{
    [Collection(ApiCollection.Name)]
    public sealed class PlansEndpointsTests(ApiFactory factory)
    {
        private readonly HttpClient _client = factory.CreateClient();

        #region Helpers

        private async Task<PlanResponse> CreatePlanAsync(string? name = null, decimal price = 450m)
        {
            var response = await _client.PostAsJsonAsync("/api/plans",
                new CreatePlanRequest(name ?? TestData.UniqueName(), "A plan created by a test", 30, price));

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return (await response.Content.ReadFromJsonAsync<PlanResponse>())!;
        }

        private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
        {
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }

        private static async Task AssertProblemCodeAsync(HttpResponseMessage response, HttpStatusCode status, string code)
        {
            Assert.Equal(status, response.StatusCode);
            var problem = await ReadProblemAsync(response);
            Assert.Equal(code, problem.GetProperty("code").GetString());
            Assert.True(problem.TryGetProperty("traceId", out _));
        }

        #endregion

        [Fact]
        public async Task GetAll_ReturnsSeededPlans()
        {
            var plans = await _client.GetFromJsonAsync<List<PlanResponse>>("/api/plans");

            Assert.NotNull(plans);
            Assert.Contains(plans, p => p.Name == "Basic Plan");
            Assert.Contains(plans, p => p.Name == "Annual Plan");
        }

        [Fact]
        public async Task Create_ValidRequest_Returns201WithLocationAndActivePlan()
        {
            var name = TestData.UniqueName();

            var response = await _client.PostAsJsonAsync("/api/plans",
                new CreatePlanRequest($"  {name}  ", "Gym access and 1 class", 30, 350.50m));

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(response.Headers.Location);

            var plan = await response.Content.ReadFromJsonAsync<PlanResponse>();
            Assert.NotNull(plan);
            Assert.Equal(name, plan.Name); // trimmed
            Assert.True(plan.IsActive);
            Assert.Equal(350.50m, plan.Price);
            Assert.True(plan.CreatedAt > DateTime.UtcNow.AddMinutes(-5));

            var fetched = await _client.GetFromJsonAsync<PlanResponse>(response.Headers.Location);
            Assert.Equal(plan.Id, fetched!.Id);
        }

        [Fact]
        public async Task Create_DuplicateName_Returns409()
        {
            var existing = await CreatePlanAsync();

            var response = await _client.PostAsJsonAsync("/api/plans",
                new CreatePlanRequest(existing.Name, "Another description", 60, 500m));

            await AssertProblemCodeAsync(response, HttpStatusCode.Conflict, "Plan.NameTaken");
        }

        [Fact]
        public async Task Create_InvalidRequest_Returns400WithFieldErrors()
        {
            var response = await _client.PostAsJsonAsync("/api/plans",
                new CreatePlanRequest("x", "", 0, -10m));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var problem = await ReadProblemAsync(response);
            Assert.Equal("Validation.Failed", problem.GetProperty("code").GetString());

            var errors = problem.GetProperty("errors");
            Assert.True(errors.TryGetProperty("name", out _));
            Assert.True(errors.TryGetProperty("description", out _));
            Assert.True(errors.TryGetProperty("durationDays", out _));
            Assert.True(errors.TryGetProperty("price", out _));
        }

        [Fact]
        public async Task Create_MissingBody_Returns400()
        {
            var response = await _client.PostAsync("/api/plans",
                new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task GetById_Missing_Returns404()
        {
            var response = await _client.GetAsync("/api/plans/987654");

            await AssertProblemCodeAsync(response, HttpStatusCode.NotFound, "Plan.NotFound");
        }

        [Fact]
        public async Task Update_ValidRequest_Returns200AndPersists()
        {
            var plan = await CreatePlanAsync();
            var newName = TestData.UniqueName("Updated");

            var response = await _client.PutAsJsonAsync($"/api/plans/{plan.Id}",
                new UpdatePlanRequest(newName, "Updated description", 90, 999m));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await response.Content.ReadFromJsonAsync<PlanResponse>();
            Assert.Equal(newName, updated!.Name);
            Assert.Equal(90, updated.DurationDays);
            Assert.Equal(999m, updated.Price);
            Assert.NotNull(updated.UpdatedAt);
        }

        [Fact]
        public async Task Update_NameOfAnotherPlan_Returns409()
        {
            var first = await CreatePlanAsync();
            var second = await CreatePlanAsync();

            var response = await _client.PutAsJsonAsync($"/api/plans/{second.Id}",
                new UpdatePlanRequest(first.Name, "Some description", 30, 300m));

            await AssertProblemCodeAsync(response, HttpStatusCode.Conflict, "Plan.NameTaken");
        }

        [Fact]
        public async Task Update_WithActiveMembership_Returns200_AndMembershipKeepsItsSnapshot()
        {
            var plan = await CreatePlanAsync(price: 450m);
            var membershipId = 0;
            await factory.WithDbAsync(async db =>
                membershipId = (await TestData.AddMembershipAsync(db, plan.Id, DateTime.UtcNow.AddDays(10))).Id);

            var response = await _client.PutAsJsonAsync($"/api/plans/{plan.Id}",
                new UpdatePlanRequest(plan.Name, "Changed description", 60, 1000m));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // The member keeps the price and duration they paid for.
            await factory.WithDbAsync(async db =>
            {
                var membership = await db.Memberships.FindAsync(membershipId);
                Assert.Equal(450m, membership!.PricePaid);
                Assert.Equal(30, membership.DurationDays);
            });
        }

        [Fact]
        public async Task SetStatus_Deactivate_HidesPlanFromActiveList()
        {
            var plan = await CreatePlanAsync();

            var response = await _client.PatchAsJsonAsync($"/api/plans/{plan.Id}/status", new SetPlanStatusRequest(false));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.False((await response.Content.ReadFromJsonAsync<PlanResponse>())!.IsActive);

            var active = await _client.GetFromJsonAsync<List<PlanResponse>>("/api/plans?isActive=true");
            var inactive = await _client.GetFromJsonAsync<List<PlanResponse>>("/api/plans?isActive=false");
            Assert.DoesNotContain(active!, p => p.Id == plan.Id);
            Assert.Contains(inactive!, p => p.Id == plan.Id);
        }

        [Fact]
        public async Task SetStatus_WithActiveMembership_IsStillAllowed()
        {
            var plan = await CreatePlanAsync();
            await factory.WithDbAsync(db => TestData.AddMembershipAsync(db, plan.Id, DateTime.UtcNow.AddDays(10)));

            var response = await _client.PatchAsJsonAsync($"/api/plans/{plan.Id}/status", new SetPlanStatusRequest(false));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Delete_UnusedPlan_SoftDeletes_AndNameCanBeReused()
        {
            var plan = await CreatePlanAsync();

            var response = await _client.DeleteAsync($"/api/plans/{plan.Id}");
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            var after = await _client.GetAsync($"/api/plans/{plan.Id}");
            Assert.Equal(HttpStatusCode.NotFound, after.StatusCode);

            // The row is still in the database, only marked as deleted.
            await factory.WithDbAsync(async db =>
            {
                var row = await db.Plans.IgnoreQueryFilters().SingleAsync(p => p.Id == plan.Id);
                Assert.True(row.IsDeleted);
                Assert.NotNull(row.DeletedAt);
            });

            // The unique name index ignores deleted rows.
            await CreatePlanAsync(plan.Name);
        }

        [Fact]
        public async Task Delete_PlanWithOnlyExpiredMemberships_Returns204()
        {
            var plan = await CreatePlanAsync();
            await factory.WithDbAsync(db => TestData.AddMembershipAsync(db, plan.Id, DateTime.UtcNow.AddDays(-30)));

            var response = await _client.DeleteAsync($"/api/plans/{plan.Id}");

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task Delete_PlanWithActiveMembership_Returns409()
        {
            var plan = await CreatePlanAsync();
            await factory.WithDbAsync(db => TestData.AddMembershipAsync(db, plan.Id, DateTime.UtcNow.AddDays(30)));

            var response = await _client.DeleteAsync($"/api/plans/{plan.Id}");

            await AssertProblemCodeAsync(response, HttpStatusCode.Conflict, "Plan.HasActiveMemberships");
        }

        [Fact]
        public async Task Delete_PlanWithCancelledMembership_Returns204()
        {
            var plan = await CreatePlanAsync();
            await factory.WithDbAsync(db =>
                TestData.AddMembershipAsync(db, plan.Id, DateTime.UtcNow.AddDays(30), MembershipStatus.Cancelled));

            var response = await _client.DeleteAsync($"/api/plans/{plan.Id}");

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task Create_ArabicName_IsStoredCorrectly()
        {
            var name = $"باقة الطلبة {Guid.NewGuid().ToString("N")[..4]}";

            var created = await CreatePlanAsync(name);
            var fetched = await _client.GetFromJsonAsync<PlanResponse>($"/api/plans/{created.Id}");

            Assert.Equal(name, fetched!.Name);
        }
    }
}
