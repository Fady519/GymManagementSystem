namespace GymManagementAPI.Infrastructure
{
    /// <summary>
    /// Adds browser security headers to every response. This API only returns JSON, files
    /// and photos (never HTML pages), so the rules can be very strict:
    /// - nosniff: the browser must trust our Content-Type and never guess it from the bytes.
    /// - DENY / frame-ancestors 'none': no website may show our responses inside an iframe (clickjacking).
    /// - CSP default-src 'none': even if a response is opened as a page, it can't load or run anything.
    /// - no-referrer: our URLs (which can contain ids) are never sent to other sites.
    /// - no-store on /api: personal data (members, payments) is never kept in a browser or proxy cache.
    /// Swagger UI is a real HTML page with scripts, so it doesn't get the strict CSP.
    /// </summary>
    internal sealed class SecurityHeadersMiddleware(RequestDelegate next)
    {
        public async Task InvokeAsync(HttpContext context)
        {
            // OnStarting: the exception handler clears the headers of a failed request,
            // so the headers are added at the last moment, right before the response is sent.
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;
                var path = context.Request.Path;

                headers.XContentTypeOptions = "nosniff";
                headers.XFrameOptions = "DENY";
                headers["Referrer-Policy"] = "no-referrer";

                if (!path.StartsWithSegments("/swagger"))
                    headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";

                if (path.StartsWithSegments("/api") && !headers.ContainsKey("Cache-Control"))
                    headers.CacheControl = "no-store";

                return Task.CompletedTask;
            });

            await next(context);
        }
    }
}
