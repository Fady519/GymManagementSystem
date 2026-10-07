using GymManagement.Tests.Infrastructure;
using System.Net;
using System.Text.Json;

namespace GymManagement.Tests.Security
{
    [Collection(ApiCollection.Name)]
    public sealed class SecurityHeadersTests(ApiFactory factory)
    {
        private readonly HttpClient _client = factory.CreateClient();

        [Theory]
        [InlineData("/health")]                 // success
        [InlineData("/api/plans/987654")]       // 404 problem details
        [InlineData("/api/members")]            // 401 (no token)
        public async Task EveryResponse_HasTheSecurityHeaders(string url)
        {
            var response = await _client.GetAsync(url);

            Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
            Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
            Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
            Assert.Equal("default-src 'none'; frame-ancestors 'none'", response.Headers.GetValues("Content-Security-Policy").Single());
        }

        [Fact]
        public async Task ApiResponses_AreNeverCached()
        {
            var response = await _client.GetAsync("/api/plans");

            Assert.True(response.Headers.CacheControl?.NoStore);
        }

        [Fact]
        public async Task SwaggerUi_Works_WithoutTheStrictCsp()
        {
            // Swagger UI is an HTML page with scripts; the strict CSP would break it.
            var response = await _client.GetAsync("/swagger/index.html");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.False(response.Headers.Contains("Content-Security-Policy"));
            Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        }
    }

    /// <summary>
    /// docs/openapi.json is the contract the Next.js frontend generates its TypeScript types from.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class OpenApiContractTests(ApiFactory factory)
    {
        private readonly HttpClient _client = factory.CreateClient();

        [Fact]
        public async Task OpenApiJson_InTheRepo_MatchesTheCode()
        {
            var json = await _client.GetStringAsync("/swagger/v1/swagger.json");

            Snapshot.AssertMatches("docs/openapi.json", json + Environment.NewLine);
        }

        [Fact]
        public async Task AnonymousEndpoints_HaveNoLock_ProtectedOnesDocument401And403()
        {
            using var doc = JsonDocument.Parse(await _client.GetStringAsync("/swagger/v1/swagger.json"));
            var paths = doc.RootElement.GetProperty("paths");

            var login = paths.GetProperty("/api/auth/login").GetProperty("post");
            Assert.False(login.TryGetProperty("security", out _));
            Assert.True(login.GetProperty("responses").TryGetProperty("429", out _));

            var members = paths.GetProperty("/api/members").GetProperty("get");
            Assert.True(members.TryGetProperty("security", out _));
            Assert.True(members.GetProperty("responses").TryGetProperty("401", out _));
            Assert.True(members.GetProperty("responses").TryGetProperty("403", out _));

            // "My account" endpoints need a login but no special role: 401 yes, 403 no.
            var me = paths.GetProperty("/api/auth/me").GetProperty("get");
            Assert.True(me.GetProperty("responses").TryGetProperty("401", out _));
            Assert.False(me.GetProperty("responses").TryGetProperty("403", out _));
        }
    }
}
