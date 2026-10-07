using GymManagement.Tests.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using System.Text;

namespace GymManagement.Tests.Security
{
    /// <summary>
    /// Security review as code: reads every endpoint of the running API with its
    /// [Authorize]/[AllowAnonymous] metadata. If someone adds an endpoint and forgets
    /// the policy, these tests fail instead of the endpoint silently being open.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class EndpointSecurityTests(ApiFactory factory)
    {
        private const string Anonymous = "Anonymous";
        private const string AnyLoggedInUser = "Any logged-in user";

        /// <summary>The only endpoints anyone on the internet may call without a token.</summary>
        private static readonly string[] ExpectedAnonymous =
        [
            // Public website: plans, categories and the class schedule.
            "GET /api/categories",
            "GET /api/categories/{id:int}",
            "GET /api/plans",
            "GET /api/plans/{id:int}",
            "GET /api/sessions",
            "GET /api/sessions/{id:int}",

            // Getting in: all rate limited except logout, which only reads the refresh cookie
            // (so a user with an expired access token can still log out).
            "POST /api/auth/accept-invite",
            "POST /api/auth/forgot-password",
            "POST /api/auth/login",
            "POST /api/auth/logout",
            "POST /api/auth/refresh",
            "POST /api/auth/register",
            "POST /api/auth/reset-password",

            // Hosting/monitoring probe; returns only "Healthy"/"Unhealthy".
            "ANY /health",
        ];

        /// <summary>Endpoints every logged-in role may call (they only touch the caller's own account).</summary>
        private static readonly string[] ExpectedAnyLoggedInUser =
        [
            "GET /api/auth/me",
            "POST /api/auth/change-password",
        ];

        [Fact]
        public async Task OnlyTheExpectedEndpoints_AreAnonymous()
        {
            var rows = await ReadEndpointsAsync();

            var anonymous = rows.Where(r => r.Access == Anonymous).Select(r => r.Key).Order();

            Assert.Equal(ExpectedAnonymous.Order(), anonymous);
        }

        [Fact]
        public async Task EveryOtherEndpoint_IsLimitedToRoles()
        {
            // The fallback policy only requires *a* login, so an endpoint without a policy would be
            // open to members too. Only the "my own account" endpoints may be like that.
            var rows = await ReadEndpointsAsync();

            var anyUser = rows.Where(r => r.Access == AnyLoggedInUser).Select(r => r.Key).Order();

            Assert.Equal(ExpectedAnyLoggedInUser.Order(), anyUser);
        }

        [Fact]
        public async Task AuthEndpointsThatTakeAPassword_AreRateLimited()
        {
            var rows = await ReadEndpointsAsync();

            foreach (var key in new[] { "POST /api/auth/login", "POST /api/auth/register", "POST /api/auth/forgot-password", "POST /api/auth/reset-password", "POST /api/auth/accept-invite" })
                Assert.False(string.IsNullOrEmpty(rows.Single(r => r.Key == key).RateLimit), $"{key} has no rate limit.");
        }

        [Fact]
        public async Task EndpointsTable_IsUpToDate()
        {
            var rows = await ReadEndpointsAsync();

            var sb = new StringBuilder();
            sb.AppendLine("# API Endpoints and Access");
            sb.AppendLine();
            sb.AppendLine("Generated from the running API by `EndpointSecurityTests`. Do not edit by hand.");
            sb.AppendLine("The tests fail if an endpoint is anonymous or open to every role by mistake.");
            sb.AppendLine();
            sb.AppendLine($"Total: {rows.Count} endpoints.");
            sb.AppendLine();
            sb.AppendLine("| Method | Route | Access | Roles | Rate limit |");
            sb.AppendLine("|---|---|---|---|---|");
            foreach (var r in rows)
                sb.AppendLine($"| {r.Method} | `{r.Route}` | {r.Access} | {r.Roles} | {r.RateLimit} |");

            Snapshot.AssertMatches("docs/ENDPOINTS.md", sb.ToString());
        }

        private sealed record EndpointRow(string Method, string Route, string Access, string Roles, string RateLimit)
        {
            public string Key => $"{Method} {Route}";
        }

        private async Task<List<EndpointRow>> ReadEndpointsAsync()
        {
            var policyProvider = factory.Services.GetRequiredService<IAuthorizationPolicyProvider>();
            var endpoints = factory.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>();

            var rows = new List<EndpointRow>();
            foreach (var endpoint in endpoints)
            {
                var metadata = endpoint.Metadata;
                var methods = metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods ?? ["ANY"];
                var route = "/" + endpoint.RoutePattern.RawText!.TrimStart('/');
                var rateLimit = metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName ?? "";

                string access, roles = "";
                if (metadata.GetMetadata<IAllowAnonymous>() is not null)
                {
                    // [AllowAnonymous] wins over any [Authorize], exactly like the real middleware.
                    access = Anonymous;
                }
                else
                {
                    var policies = metadata.GetOrderedMetadata<IAuthorizeData>()
                        .Select(a => a.Policy).OfType<string>().Distinct().ToList();

                    access = policies.Count == 0 ? AnyLoggedInUser : string.Join(" + ", policies);

                    var roleNames = new List<string>();
                    foreach (var name in policies)
                    {
                        var policy = await policyProvider.GetPolicyAsync(name);
                        roleNames.AddRange(policy!.Requirements.OfType<RolesAuthorizationRequirement>().SelectMany(r => r.AllowedRoles));
                    }
                    roles = string.Join(", ", roleNames.Distinct());
                }

                rows.AddRange(methods.Select(m => new EndpointRow(m, route, access, roles, rateLimit)));
            }

            return rows.OrderBy(r => r.Route, StringComparer.Ordinal).ThenBy(r => r.Method, StringComparer.Ordinal).ToList();
        }
    }
}
