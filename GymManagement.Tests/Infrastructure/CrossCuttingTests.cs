using System.Net;

namespace GymManagement.Tests.Infrastructure
{
    [Collection(ApiCollection.Name)]
    public sealed class CrossCuttingTests(ApiFactory factory)
    {
        private readonly HttpClient _client = factory.CreateClient();

        [Fact]
        public async Task Health_ReturnsHealthy()
        {
            var response = await _client.GetAsync("/health");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
        }

        [Fact]
        public async Task CorrelationId_IsGeneratedWhenMissing()
        {
            var response = await _client.GetAsync("/health");

            Assert.True(response.Headers.TryGetValues("X-Correlation-Id", out var values));
            Assert.False(string.IsNullOrWhiteSpace(values.Single()));
        }

        [Fact]
        public async Task CorrelationId_IsEchoedWhenProvided()
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/plans/987654");
            request.Headers.Add("X-Correlation-Id", "test-correlation-123");

            var response = await _client.SendAsync(request);

            Assert.Equal("test-correlation-123", response.Headers.GetValues("X-Correlation-Id").Single());
        }
    }
}
