using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace GymManagement.Tests.Infrastructure
{
    /// <summary>Small helpers for reading cookies, tokens and ProblemDetails in tests.</summary>
    public static class HttpTestHelpers
    {
        public const string RefreshCookieName = "gym_refresh";

        /// <summary>Returns "gym_refresh=value" from the Set-Cookie header, or null.</summary>
        public static string? GetRefreshCookie(HttpResponseMessage response)
        {
            if (!response.Headers.TryGetValues("Set-Cookie", out var cookies))
                return null;

            var header = cookies.FirstOrDefault(c => c.StartsWith(RefreshCookieName + "=", StringComparison.Ordinal));
            var nameValue = header?.Split(';')[0];

            // An emptied cookie (logout / failed refresh) is not a usable token.
            return nameValue is null || nameValue == RefreshCookieName + "=" ? null : nameValue;
        }

        public static string GetRefreshSetCookieHeader(HttpResponseMessage response)
            => response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith(RefreshCookieName + "=", StringComparison.Ordinal));

        /// <summary>POST with only the given cookie (or no cookie).</summary>
        public static Task<HttpResponseMessage> PostWithCookieAsync(this HttpClient client, string url, string? cookie)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, url);
            if (cookie is not null)
                request.Headers.Add("Cookie", cookie);
            return client.SendAsync(request);
        }

        /// <summary>Reads the middle part (payload) of a JWT. No validation: tests only inspect it.</summary>
        public static JsonElement ReadJwtPayload(string token)
        {
            var payload = token.Split('.')[1].Replace('-', '+').Replace('_', '/');
            payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
            return JsonDocument.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(payload))).RootElement;
        }

        public static async Task AssertProblemAsync(HttpResponseMessage response, HttpStatusCode status, string code)
        {
            Assert.Equal(status, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
            var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(code, problem.GetProperty("code").GetString());
        }
    }
}
