using Serilog.Context;

namespace GymManagementAPI.Infrastructure
{
    /// <summary>
    /// Reads the X-Correlation-Id header (or generates one), echoes it back on the
    /// response and adds it to every log entry written while handling the request.
    /// This lets you find all logs of a single request, even across services.
    /// </summary>
    internal sealed class CorrelationIdMiddleware(RequestDelegate next)
    {
        public const string HeaderName = "X-Correlation-Id";
        private const int MaxLength = 64;

        public async Task InvokeAsync(HttpContext context)
        {
            var correlationId = context.Request.Headers[HeaderName].FirstOrDefault();

            if (string.IsNullOrWhiteSpace(correlationId) || correlationId.Length > MaxLength)
                correlationId = Guid.NewGuid().ToString("N");

            context.Response.OnStarting(() =>
            {
                context.Response.Headers[HeaderName] = correlationId;
                return Task.CompletedTask;
            });

            using (LogContext.PushProperty("CorrelationId", correlationId))
            {
                await next(context);
            }
        }
    }
}
