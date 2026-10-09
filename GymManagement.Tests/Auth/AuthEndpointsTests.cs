using GymManagement.Tests.Infrastructure;
using GymManagementBLL.DTOs.Auth;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Auth
{
    [Collection(ApiCollection.Name)]
    public sealed class AuthEndpointsTests(ApiFactory factory)
    {
        private const string Password = ApiFactory.DefaultPassword;
        private readonly HttpClient _client = factory.CreateHttpsClient();

        #region Helpers

        private static RegisterRequest NewRegisterRequest(string? email = null) => new(
            Name: "New Member",
            Email: email ?? TestData.UniqueEmail(),
            Phone: TestData.UniquePhone(),
            Password: Password,
            DateOfBirth: new DateOnly(2000, 5, 20),
            Gender: Gender.Male);

        private async Task<HttpResponseMessage> LoginAsync(string email, string password = Password)
            => await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));

        /// <summary>Logs in and returns the refresh cookie ("gym_refresh=...").</summary>
        private async Task<string> LoginForCookieAsync(string email, string password = Password)
        {
            var response = await LoginAsync(email, password);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return GetRefreshCookie(response)!;
        }

        #endregion

        #region Register

        [Fact]
        public async Task Register_NewMember_Returns201_SetsSecureCookie_AndLinksMemberProfile()
        {
            var request = NewRegisterRequest();

            var response = await _client.PostAsJsonAsync("/api/auth/register", request);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
            Assert.False(string.IsNullOrWhiteSpace(body.AccessToken));
            Assert.Equal([AppRoles.Member], body.User.Roles);
            Assert.NotNull(body.User.MemberId);
            Assert.False(body.User.MustChangePassword);

            // The refresh token is only in an httpOnly cookie, never in the JSON.
            var setCookie = GetRefreshSetCookieHeader(response).ToLowerInvariant();
            Assert.Contains("httponly", setCookie);
            Assert.Contains("secure", setCookie);
            Assert.Contains("samesite=lax", setCookie);
            Assert.Contains("path=/api/auth", setCookie);
            Assert.DoesNotContain("refresh", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

            await factory.WithDbAsync(async db =>
            {
                var member = await db.Members.SingleAsync(m => m.Id == body.User.MemberId);
                Assert.Equal(body.User.Id, member.UserId);
                Assert.Equal(request.Email.ToLowerInvariant(), member.Email);
            });
        }

        [Fact]
        public async Task Register_EmailOfExistingGymMember_Returns409_AndCreatesNoAccount()
        {
            var email = "";
            await factory.WithDbAsync(async db => email = (await TestData.AddMemberAsync(db)).Email);

            var response = await _client.PostAsJsonAsync("/api/auth/register", NewRegisterRequest(email));

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Auth.MemberAlreadyExists");
            await factory.WithDbAsync(async db =>
                Assert.False(await db.Users.AnyAsync(u => u.Email == email)));
        }

        [Fact]
        public async Task Register_EmailThatAlreadyHasAccount_Returns409()
        {
            var email = TestData.UniqueEmail();
            await _client.PostAsJsonAsync("/api/auth/register", NewRegisterRequest(email));

            var response = await _client.PostAsJsonAsync("/api/auth/register", NewRegisterRequest(email.ToUpperInvariant()));

            await AssertProblemAsync(response, HttpStatusCode.Conflict, "Auth.EmailTaken");
        }

        [Fact]
        public async Task Register_InvalidData_Returns400WithFieldErrors()
        {
            var request = NewRegisterRequest() with { Email = "not-an-email", Phone = "123", Password = "weak" };

            var response = await _client.PostAsJsonAsync("/api/auth/register", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
            Assert.True(errors.TryGetProperty("email", out _));
            Assert.True(errors.TryGetProperty("phone", out _));
            Assert.True(errors.TryGetProperty("password", out _));
        }

        #endregion

        #region Login

        [Fact]
        public async Task Login_ValidCredentials_ReturnsJwtWithRoleAndMemberId()
        {
            var request = NewRegisterRequest();
            await _client.PostAsJsonAsync("/api/auth/register", request);

            var response = await LoginAsync(request.Email);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
            var payload = ReadJwtPayload(body.AccessToken);

            Assert.Equal(body.User.Id.ToString(), payload.GetProperty("sub").GetString());
            Assert.Equal(AppRoles.Member, payload.GetProperty("role").GetString());
            Assert.Equal(body.User.MemberId, payload.GetProperty("memberId").GetInt32());
            Assert.Equal("GymManagementAPI", payload.GetProperty("iss").GetString());

            // 15 minutes (+/- a little for test timing).
            var minutes = (body.AccessTokenExpiresAt - DateTime.UtcNow).TotalMinutes;
            Assert.InRange(minutes, 14, 15.1);
            Assert.NotNull(GetRefreshCookie(response));
        }

        [Fact]
        public async Task Login_WrongPassword_And_UnknownEmail_ReturnTheSame401()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);

            var wrongPassword = await LoginAsync(email, "Wrong@12345");
            var unknownEmail = await LoginAsync("nobody@test.com");

            await AssertProblemAsync(wrongPassword, HttpStatusCode.Unauthorized, "Auth.InvalidCredentials");
            await AssertProblemAsync(unknownEmail, HttpStatusCode.Unauthorized, "Auth.InvalidCredentials");
        }

        [Fact]
        public async Task Login_FiveWrongPasswords_LocksTheAccount()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);

            for (var i = 0; i < 4; i++)
                await AssertProblemAsync(await LoginAsync(email, "Wrong@12345"), HttpStatusCode.Unauthorized, "Auth.InvalidCredentials");

            await AssertProblemAsync(await LoginAsync(email, "Wrong@12345"), HttpStatusCode.Unauthorized, "Auth.LockedOut");

            // Even the correct password is refused while locked.
            await AssertProblemAsync(await LoginAsync(email), HttpStatusCode.Unauthorized, "Auth.LockedOut");
        }

        [Fact]
        public async Task Login_DisabledAccount_Returns403()
        {
            var email = await factory.CreateUserAsync(AppRoles.Admin, isActive: false);

            await AssertProblemAsync(await LoginAsync(email), HttpStatusCode.Forbidden, "Auth.AccountDisabled");
        }

        #endregion

        #region Me

        [Fact]
        public async Task Me_WithoutToken_Returns401()
        {
            var response = await _client.GetAsync("/api/auth/me");

            await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "Auth.Unauthenticated");
        }

        [Fact]
        public async Task Me_WithTamperedToken_Returns401()
        {
            var email = await factory.CreateUserAsync(AppRoles.Admin);
            var token = (await factory.LoginAsync(email)).AccessToken;

            // Change the last character of the signature.
            var tampered = token[..^1] + (token[^1] == 'A' ? 'B' : 'A');
            var response = await ApiFactory.WithToken(factory.CreateHttpsClient(), tampered).GetAsync("/api/auth/me");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task Me_WithToken_ReturnsCurrentUser()
        {
            var client = await factory.CreateClientForRoleAsync(AppRoles.SuperAdmin);

            var me = await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");

            Assert.Equal(ApiFactory.SuperAdminEmail, me!.Email);
            Assert.Equal([AppRoles.SuperAdmin], me.Roles);
            Assert.Null(me.MemberId);
        }

        #endregion

        #region Refresh / Logout

        [Fact]
        public async Task Refresh_ValidCookie_ReturnsNewAccessToken_AndRotatesTheCookie()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            var first = await LoginForCookieAsync(email);

            var response = await _client.PostWithCookieAsync("/api/auth/refresh", first);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
            Assert.False(string.IsNullOrWhiteSpace(body.AccessToken));

            var second = GetRefreshCookie(response);
            Assert.NotNull(second);
            Assert.NotEqual(first, second);

            // The new cookie works too.
            Assert.Equal(HttpStatusCode.OK, (await _client.PostWithCookieAsync("/api/auth/refresh", second)).StatusCode);
        }

        [Fact]
        public async Task Refresh_ReusedCookie_SignsOutAllSessions()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            var first = await LoginForCookieAsync(email);
            var otherDevice = await LoginForCookieAsync(email);

            var rotated = GetRefreshCookie(await _client.PostWithCookieAsync("/api/auth/refresh", first));

            // Someone replays the old (already used) cookie => treated as theft.
            var replay = await _client.PostWithCookieAsync("/api/auth/refresh", first);
            await AssertProblemAsync(replay, HttpStatusCode.Unauthorized, "Auth.RefreshTokenReused");

            // Every session of that user is now revoked.
            Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PostWithCookieAsync("/api/auth/refresh", rotated)).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PostWithCookieAsync("/api/auth/refresh", otherDevice)).StatusCode);
        }

        [Fact]
        public async Task Refresh_WithoutCookie_Returns401()
        {
            var response = await _client.PostWithCookieAsync("/api/auth/refresh", null);

            await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "Auth.InvalidRefreshToken");
        }

        [Fact]
        public async Task Logout_RevokesTheRefreshToken_AndDeletesTheCookie()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            var cookie = await LoginForCookieAsync(email);

            var logout = await _client.PostWithCookieAsync("/api/auth/logout", cookie);

            Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
            Assert.Contains("expires=thu, 01 jan 1970", GetRefreshSetCookieHeader(logout).ToLowerInvariant());
            Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PostWithCookieAsync("/api/auth/refresh", cookie)).StatusCode);
        }

        #endregion

        #region Change password

        [Fact]
        public async Task ChangePassword_ClearsMustChangePassword_AndSignsOutOtherSessions()
        {
            var email = await factory.CreateUserAsync(AppRoles.Admin, mustChangePassword: true);
            var login = await LoginAsync(email);
            var oldSession = GetRefreshCookie(login);
            var body = (await login.Content.ReadFromJsonAsync<AuthResponse>())!;
            Assert.True(body.User.MustChangePassword);

            var client = ApiFactory.WithToken(factory.CreateHttpsClient(), body.AccessToken);
            var response = await client.PostAsJsonAsync("/api/auth/change-password",
                new ChangePasswordRequest(Password, "NewPass@2026"));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var changed = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
            Assert.False(changed.User.MustChangePassword);
            Assert.NotNull(GetRefreshCookie(response));

            Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PostWithCookieAsync("/api/auth/refresh", oldSession)).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(email)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await LoginAsync(email, "NewPass@2026")).StatusCode);
        }

        [Fact]
        public async Task ChangePassword_WrongCurrentPassword_Returns400()
        {
            var email = await factory.CreateUserAsync(AppRoles.Member);
            var client = ApiFactory.WithToken(factory.CreateHttpsClient(), (await factory.LoginAsync(email)).AccessToken);

            var response = await client.PostAsJsonAsync("/api/auth/change-password",
                new ChangePasswordRequest("Wrong@12345", "NewPass@2026"));

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Auth.WrongCurrentPassword");
        }

        #endregion

        [Fact]
        public async Task Login_TooManyRequests_Returns429()
        {
            // A separate app instance with a tiny limit (3 per minute).
            await using var limitedApp = factory.WithWebHostBuilder(builder =>
                builder.ConfigureAppConfiguration((_, config) =>
                    config.AddInMemoryCollection(new Dictionary<string, string?> { ["RateLimiting:AuthPermitLimit"] = "3" })));

            var client = limitedApp.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
            var request = new LoginRequest("nobody@test.com", "Wrong@12345");

            for (var i = 0; i < 3; i++)
                Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", request)).StatusCode);

            var blocked = await client.PostAsJsonAsync("/api/auth/login", request);
            await AssertProblemAsync(blocked, HttpStatusCode.TooManyRequests, "RateLimit.Exceeded");
        }

        [Fact]
        public async Task Refresh_DoesNotUseTheLoginLimit()
        {
            // Login limit used up (2 of 2) must not block refresh: page reloads call refresh a lot.
            await using var limitedApp = factory.WithWebHostBuilder(builder =>
                builder.ConfigureAppConfiguration((_, config) =>
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["RateLimiting:AuthPermitLimit"] = "2",
                        ["RateLimiting:RefreshPermitLimit"] = "100",
                    })));

            var client = limitedApp.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
            var request = new LoginRequest("nobody@test.com", "Wrong@12345");
            for (var i = 0; i < 2; i++)
                await client.PostAsJsonAsync("/api/auth/login", request);
            Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostAsJsonAsync("/api/auth/login", request)).StatusCode);

            // No cookie -> 401 (not 429): refresh has its own bucket.
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/api/auth/refresh", null)).StatusCode);
        }

        [Fact]
        public async Task Refresh_TooManyRequests_Returns429()
        {
            await using var limitedApp = factory.WithWebHostBuilder(builder =>
                builder.ConfigureAppConfiguration((_, config) =>
                    config.AddInMemoryCollection(new Dictionary<string, string?> { ["RateLimiting:RefreshPermitLimit"] = "3" })));

            var client = limitedApp.CreateClient(new() { BaseAddress = new Uri("https://localhost") });

            for (var i = 0; i < 3; i++)
                Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/api/auth/refresh", null)).StatusCode);

            var blocked = await client.PostAsync("/api/auth/refresh", null);
            await AssertProblemAsync(blocked, HttpStatusCode.TooManyRequests, "RateLimit.Exceeded");
        }

        [Fact]
        public async Task BehindProxy_EachClientIpHasItsOwnLoginLimit()
        {
            // Production: every request comes from the Next.js server, the real visitor IP is in X-Forwarded-For.
            await using var proxiedApp = LimitedApp(trustForwardedHeaders: true);
            var request = new LoginRequest("nobody@test.com", "Wrong@12345");

            var visitorA = ClientFrom(proxiedApp, "203.0.113.10");
            for (var i = 0; i < 2; i++)
                await visitorA.PostAsJsonAsync("/api/auth/login", request);
            Assert.Equal(HttpStatusCode.TooManyRequests, (await visitorA.PostAsJsonAsync("/api/auth/login", request)).StatusCode);

            // Visitor A used up THEIR limit; visitor B (another IP, same proxy) can still log in.
            var visitorB = ClientFrom(proxiedApp, "198.51.100.20");
            Assert.Equal(HttpStatusCode.Unauthorized, (await visitorB.PostAsJsonAsync("/api/auth/login", request)).StatusCode);
        }

        [Fact]
        public async Task WithoutProxySetting_ForwardedForIsIgnored()
        {
            // Off by default: otherwise anybody could send a new fake IP on every request and never be limited.
            await using var app = LimitedApp(trustForwardedHeaders: false);
            var request = new LoginRequest("nobody@test.com", "Wrong@12345");

            for (var i = 0; i < 2; i++)
                await ClientFrom(app, $"203.0.113.{i + 1}").PostAsJsonAsync("/api/auth/login", request);

            var faked = await ClientFrom(app, "203.0.113.99").PostAsJsonAsync("/api/auth/login", request);
            Assert.Equal(HttpStatusCode.TooManyRequests, faked.StatusCode);
        }

        /// <summary>An app instance with a login limit of 2 per minute.</summary>
        private WebApplicationFactory<Program> LimitedApp(bool trustForwardedHeaders) =>
            factory.WithWebHostBuilder(builder =>
                builder.ConfigureAppConfiguration((_, config) =>
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["RateLimiting:AuthPermitLimit"] = "2",
                        ["ReverseProxy:TrustForwardedHeaders"] = trustForwardedHeaders.ToString(),
                    })));

        private static HttpClient ClientFrom(WebApplicationFactory<Program> app, string clientIp)
        {
            var client = app.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
            client.DefaultRequestHeaders.Add("X-Forwarded-For", clientIp);
            return client;
        }
    }
}
