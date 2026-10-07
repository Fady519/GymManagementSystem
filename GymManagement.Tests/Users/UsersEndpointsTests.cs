using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Auth;
using GymManagementBLL.DTOs.Plans;
using GymManagementBLL.DTOs.Users;
using GymManagementDAL.Entities.Identity;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Users
{
    [Collection(ApiCollection.Name)]
    public sealed class UsersEndpointsTests(ApiFactory factory) : IAsyncLifetime
    {
        private HttpClient _superAdmin = null!;

        public async Task InitializeAsync() => _superAdmin = await factory.CreateClientForRoleAsync(AppRoles.SuperAdmin);

        public Task DisposeAsync() => Task.CompletedTask;

        private async Task<CreatedUserResponse> CreateAdminAsync()
        {
            var response = await _superAdmin.PostAsJsonAsync("/api/users/admins",
                new CreateAdminRequest("Reception Admin", TestData.UniqueEmail()));

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return (await response.Content.ReadFromJsonAsync<CreatedUserResponse>())!;
        }

        [Fact]
        public async Task GetAll_AsAdmin_Returns403()
        {
            var admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);

            var response = await admin.GetAsync("/api/users");

            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        [Fact]
        public async Task GetAll_FilterByRole_ReturnsUsersWithTheirRoles()
        {
            var page = await _superAdmin.GetFromJsonAsync<PagedResult<UserResponse>>("/api/users?role=SuperAdmin");

            var superAdmin = Assert.Single(page!.Items, u => u.Email == ApiFactory.SuperAdminEmail);
            Assert.Equal([AppRoles.SuperAdmin], superAdmin.Roles);
            Assert.All(page.Items, u => Assert.Contains(AppRoles.SuperAdmin, u.Roles));
        }

        [Fact]
        public async Task GetAll_UnknownRole_Returns400()
        {
            var response = await _superAdmin.GetAsync("/api/users?role=Manager");

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "User.UnknownRole");
        }

        [Fact]
        public async Task CreateAdmin_EmailsAnInvite_AndTheAdminChoosesTheirOwnPassword()
        {
            var created = await CreateAdminAsync();

            Assert.True(created.InviteSent);
            Assert.Equal([AppRoles.Admin], created.User.Roles);
            Assert.True(created.User.InvitePending);
            Assert.False(created.User.MustChangePassword);

            // No password exists yet, so nobody can log in until the invite is accepted.
            await AssertProblemAsync(
                await factory.CreateHttpsClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(created.User.Email, ApiFactory.DefaultPassword)),
                HttpStatusCode.Unauthorized, "Auth.InvalidCredentials");

            var email = factory.Emails.LastSentTo(created.User.Email);
            Assert.Contains("invited", email.Subject, StringComparison.OrdinalIgnoreCase);

            await factory.AcceptInviteAsync(created.User.Email, "MyOwn@Pass1");

            var login = await factory.LoginAsync(created.User.Email, "MyOwn@Pass1");
            Assert.False(login.User.MustChangePassword);

            // The new admin can manage plans.
            var adminClient = ApiFactory.WithToken(factory.CreateHttpsClient(), login.AccessToken);
            var response = await adminClient.PostAsJsonAsync("/api/plans",
                new CreatePlanRequest(TestData.UniqueName(), "Created by the new admin", 30, 300m));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var user = await _superAdmin.GetFromJsonAsync<UserResponse>($"/api/users/{created.User.Id}", Json);
            Assert.False(user!.InvitePending);
        }

        [Fact]
        public async Task ResendInvite_WhilePending_SendsAnotherEmail_AfterActivation_Returns409()
        {
            var created = await CreateAdminAsync();

            var resend = await _superAdmin.PostAsync($"/api/users/{created.User.Id}/resend-invite", null);

            Assert.Equal(HttpStatusCode.OK, resend.StatusCode);
            Assert.True((await resend.ReadAsAsync<InviteResponse>()).InviteSent);
            Assert.Equal(2, factory.Emails.SentTo(created.User.Email).Count);

            await factory.AcceptInviteAsync(created.User.Email);

            await AssertProblemAsync(await _superAdmin.PostAsync($"/api/users/{created.User.Id}/resend-invite", null),
                HttpStatusCode.Conflict, "User.AlreadyActivated");
        }

        [Fact]
        public async Task CreateAdmin_WhenTheMailServerIsDown_StillCreatesTheAccount_WithInviteSentFalse()
        {
            factory.Emails.SimulateFailure = true;
            try
            {
                var created = await CreateAdminAsync();

                Assert.False(created.InviteSent);
                Assert.True(created.User.InvitePending);
            }
            finally
            {
                factory.Emails.SimulateFailure = false;
            }
        }

        [Fact]
        public async Task CreateAdmin_DuplicateEmail_Returns409()
        {
            var existing = await CreateAdminAsync();

            var response = await _superAdmin.PostAsJsonAsync("/api/users/admins",
                new CreateAdminRequest("Someone Else", existing.User.Email));

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "User.EmailTaken");
        }

        [Fact]
        public async Task CreateAdmin_InvalidEmail_Returns400()
        {
            var response = await _superAdmin.PostAsJsonAsync("/api/users/admins",
                new CreateAdminRequest("Someone", "not-an-email"));

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Validation.Failed");
        }

        [Fact]
        public async Task Disable_BlocksLoginAndRefresh_AndEnableRestoresLogin()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            var client = factory.CreateHttpsClient();
            var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, ApiFactory.DefaultPassword));
            var cookie = GetRefreshCookie(login);
            var userId = (await login.Content.ReadFromJsonAsync<AuthResponse>())!.User.Id;

            var disable = await _superAdmin.PatchAsJsonAsync($"/api/users/{userId}/status", new SetUserStatusRequest(false));

            Assert.Equal(HttpStatusCode.OK, disable.StatusCode);
            Assert.False((await disable.Content.ReadFromJsonAsync<UserResponse>())!.IsActive);
            await AssertProblemAsync(
                await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, ApiFactory.DefaultPassword)),
                HttpStatusCode.Forbidden, "Auth.AccountDisabled");
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostWithCookieAsync("/api/auth/refresh", cookie)).StatusCode);

            await _superAdmin.PatchAsJsonAsync($"/api/users/{userId}/status", new SetUserStatusRequest(true));
            Assert.Equal(HttpStatusCode.OK,
                (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, ApiFactory.DefaultPassword))).StatusCode);
        }

        [Fact]
        public async Task Disable_SuperAdmin_Returns403()
        {
            var me = await _superAdmin.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");

            var response = await _superAdmin.PatchAsJsonAsync($"/api/users/{me!.Id}/status", new SetUserStatusRequest(false));

            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "User.CannotDisableSuperAdmin");
        }

        [Fact]
        public async Task SetStatus_UnknownUser_Returns404()
        {
            var response = await _superAdmin.PatchAsJsonAsync("/api/users/987654/status", new SetUserStatusRequest(false));

            await AssertProblemAsync(response, HttpStatusCode.NotFound, "User.NotFound");
        }
    }
}
