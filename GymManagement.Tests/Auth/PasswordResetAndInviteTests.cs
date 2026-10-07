using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Auth;
using GymManagementBLL.DTOs.Users;
using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Auth
{
    [Collection(ApiCollection.Name)]
    public sealed class PasswordResetAndInviteTests(ApiFactory factory)
    {
        private const string NewPassword = "Brand@New123";
        private readonly HttpClient _client = factory.CreateHttpsClient();

        #region Helpers

        private Task<HttpResponseMessage> ForgotAsync(string email)
            => _client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(email));

        private Task<HttpResponseMessage> ResetAsync(string email, string token, string password = NewPassword)
            => _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(email, token, password));

        private Task<HttpResponseMessage> AcceptInviteAsync(string email, string token, string password = NewPassword)
            => _client.PostAsJsonAsync("/api/auth/accept-invite", new AcceptInviteRequest(email, token, password));

        private Task<HttpResponseMessage> LoginAsync(string email, string password)
            => _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));

        /// <summary>Asks for a reset link and returns the token from the email.</summary>
        private async Task<string> RequestResetTokenAsync(string email)
        {
            Assert.Equal(HttpStatusCode.OK, (await ForgotAsync(email)).StatusCode);
            return FakeEmailSender.ExtractToken(factory.Emails.LastSentTo(email));
        }

        /// <summary>An Admin account created through the API: it has no password until the invite is accepted.</summary>
        private async Task<string> CreateInvitedAdminAsync()
        {
            var superAdmin = await factory.CreateClientForRoleAsync(AppRoles.SuperAdmin);
            var response = await superAdmin.PostAsJsonAsync("/api/users/admins", new CreateAdminRequest("Invited Admin", TestData.UniqueEmail()));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return (await response.ReadAsAsync<CreatedUserResponse>()).User.Email;
        }

        #endregion

        #region Forgot password

        [Fact]
        public async Task ForgotPassword_UnknownEmail_ReturnsExactlyTheSameResponse_AndSendsNothing()
        {
            var knownEmail = await factory.CreateUserAsync(AppRoles.Member);
            var unknownEmail = TestData.UniqueEmail();

            var known = await ForgotAsync(knownEmail);
            var unknown = await ForgotAsync(unknownEmail);

            Assert.Equal(HttpStatusCode.OK, known.StatusCode);
            Assert.Equal(HttpStatusCode.OK, unknown.StatusCode);
            Assert.Equal(await known.Content.ReadAsStringAsync(), await unknown.Content.ReadAsStringAsync());

            Assert.Single(factory.Emails.SentTo(knownEmail));
            Assert.Empty(factory.Emails.SentTo(unknownEmail));
        }

        [Fact]
        public async Task ForgotPassword_DisabledAccount_SendsNothing()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member, isActive: false);

            Assert.Equal(HttpStatusCode.OK, (await ForgotAsync(email)).StatusCode);

            Assert.Empty(factory.Emails.SentTo(email));
        }

        [Fact]
        public async Task ForgotPassword_AccountThatNeverAcceptedItsInvite_GetsTheInviteAgain()
        {
            var email = await CreateInvitedAdminAsync();

            await ForgotAsync(email);

            var emails = factory.Emails.SentTo(email);
            Assert.Equal(2, emails.Count);
            Assert.All(emails, e => Assert.Contains("invited", e.Subject, StringComparison.OrdinalIgnoreCase));
        }

        [Fact]
        public async Task ForgotPassword_InvalidEmail_Returns400()
        {
            await AssertProblemAsync(await ForgotAsync("not-an-email"), HttpStatusCode.BadRequest, "Validation.Failed");
        }

        #endregion

        #region Reset password

        [Fact]
        public async Task ResetPassword_ChangesThePassword_AndSignsOutEveryOldSession()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            var oldLogin = await LoginAsync(email, ApiFactory.DefaultPassword);
            var oldCookie = GetRefreshCookie(oldLogin);
            var token = await RequestResetTokenAsync(email);

            var reset = await ResetAsync(email, token);

            Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(email, ApiFactory.DefaultPassword)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await LoginAsync(email, NewPassword)).StatusCode);

            // The session from before the reset can't be refreshed anymore.
            Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PostWithCookieAsync("/api/auth/refresh", oldCookie)).StatusCode);
        }

        [Fact]
        public async Task ResetPassword_TheSameLinkWorksOnlyOnce()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            var token = await RequestResetTokenAsync(email);

            Assert.Equal(HttpStatusCode.NoContent, (await ResetAsync(email, token)).StatusCode);

            await AssertProblemAsync(await ResetAsync(email, token, "Another@Pass9"), HttpStatusCode.BadRequest, "Auth.InvalidResetToken");
        }

        [Fact]
        public async Task ResetPassword_BadToken_OrUnknownEmail_Returns400_WithTheSameCode()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            var realToken = await RequestResetTokenAsync(email);

            await AssertProblemAsync(await ResetAsync(email, "not-a-real-token"), HttpStatusCode.BadRequest, "Auth.InvalidResetToken");
            await AssertProblemAsync(await ResetAsync(TestData.UniqueEmail(), realToken), HttpStatusCode.BadRequest, "Auth.InvalidResetToken");
        }

        [Fact]
        public async Task ResetPassword_TokenOfAnotherUser_Returns400()
        {
            var victim = await factory.CreateUserAsync(AppRoles.Member);
            var attacker = await factory.CreateUserAsync(AppRoles.Member);
            var attackerToken = await RequestResetTokenAsync(attacker);

            await AssertProblemAsync(await ResetAsync(victim, attackerToken), HttpStatusCode.BadRequest, "Auth.InvalidResetToken");
        }

        [Fact]
        public async Task ResetPassword_UnlocksALockedAccount()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            for (var i = 0; i < 5; i++)
                await LoginAsync(email, "Wrong@Pass1");
            await AssertProblemAsync(await LoginAsync(email, ApiFactory.DefaultPassword), HttpStatusCode.Unauthorized, "Auth.LockedOut");

            var token = await RequestResetTokenAsync(email);
            Assert.Equal(HttpStatusCode.NoContent, (await ResetAsync(email, token)).StatusCode);

            Assert.Equal(HttpStatusCode.OK, (await LoginAsync(email, NewPassword)).StatusCode);
        }

        [Fact]
        public async Task ResetPassword_WeakPassword_Returns400()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            var token = await RequestResetTokenAsync(email);

            await AssertProblemAsync(await ResetAsync(email, token, "weak"), HttpStatusCode.BadRequest, "Validation.Failed");
        }

        #endregion

        #region Accept invite

        [Fact]
        public async Task AcceptInvite_TheSameLinkWorksOnlyOnce()
        {
            var email = await CreateInvitedAdminAsync();
            var token = FakeEmailSender.ExtractToken(factory.Emails.LastSentTo(email));

            Assert.Equal(HttpStatusCode.NoContent, (await AcceptInviteAsync(email, token)).StatusCode);

            await AssertProblemAsync(await AcceptInviteAsync(email, token, "Another@Pass9"), HttpStatusCode.BadRequest, "Auth.InvalidInviteToken");
            Assert.Equal(HttpStatusCode.OK, (await LoginAsync(email, NewPassword)).StatusCode);
        }

        [Fact]
        public async Task AcceptInvite_WithAPasswordResetToken_Returns400()
        {
            // Each kind of link has its own token provider: a reset token can't be used as an invite.
            var email = await CreateInvitedAdminAsync();

            string resetToken;
            await using (var scope = factory.Services.CreateAsyncScope())
            {
                var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
                var user = await userManager.FindByEmailAsync(email);
                resetToken = AccountTokens.Encode(await userManager.GeneratePasswordResetTokenAsync(user!));
            }

            await AssertProblemAsync(await AcceptInviteAsync(email, resetToken), HttpStatusCode.BadRequest, "Auth.InvalidInviteToken");
        }

        [Fact]
        public async Task AcceptInvite_BadToken_Returns400()
        {
            var email = await CreateInvitedAdminAsync();

            await AssertProblemAsync(await AcceptInviteAsync(email, "garbage"), HttpStatusCode.BadRequest, "Auth.InvalidInviteToken");
        }

        [Fact]
        public async Task AcceptInvite_WeakPassword_Returns400()
        {
            var email = await CreateInvitedAdminAsync();
            var token = FakeEmailSender.ExtractToken(factory.Emails.LastSentTo(email));

            await AssertProblemAsync(await AcceptInviteAsync(email, token, "12345678"), HttpStatusCode.BadRequest, "Validation.Failed");
        }

        #endregion
    }
}
