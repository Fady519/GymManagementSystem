using GymManagementAPI.Extensions;
using GymManagementAPI.Infrastructure;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Don't tell attackers which web server we run ("Server: Kestrel").
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

// Logging: Serilog reads its sinks/levels from the "Serilog" section of appsettings.
builder.Services.AddSerilog((services, logger) => logger
    .ReadFrom.Configuration(builder.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

builder.Services
    .AddPersistence()
    .AddBusinessServices()
    .AddAuth()
    .AddApiServices();

var app = builder.Build();

// One-off command (doesn't start the web server): dotnet run --project GymManagementAPI -- --seed-demo
if (args.Contains("--seed-demo"))
{
    await app.SeedDemoDataAsync();
    return;
}

// ---- HTTP pipeline (order matters) ----

// In production the browser talks to the Next.js server (Vercel), and Next.js forwards /api to us.
// So every request arrives from Vercel's IP, and the per-IP login rate limit would be shared by ALL
// visitors. The proxy sends the real client IP in X-Forwarded-For (and "https" in X-Forwarded-Proto);
// reading them must be FIRST, so the rate limiter, the logs and HTTPS redirection see the real values.
// It is off by default: without a proxy in front, anybody could fake these headers.
if (app.Configuration.GetValue<bool>("ReverseProxy:TrustForwardedHeaders"))
{
    var forwarded = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
        ForwardLimit = 1,   // only the last hop (the address the proxy added)
    };
    // By default only localhost proxies are trusted; Vercel's IPs are not fixed, so trust any.
    forwarded.KnownIPNetworks.Clear();
    forwarded.KnownProxies.Clear();
    app.UseForwardedHeaders(forwarded);
}

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseSerilogRequestLogging();

// "Hosting:HttpsRedirection" = false is for a host that has no HTTPS certificate yet:
// redirecting to https there would break every request.
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    if (app.Configuration.GetValue("Hosting:HttpsRedirection", defaultValue: true))
        app.UseHttpsRedirection();
}

// Swagger is on in every environment: the API documentation is part of the portfolio.
// It only describes the endpoints; calling them still needs a valid token.
app.UseSwagger();
app.UseSwaggerUI(options => options.DocumentTitle = "Gym Management API");

// Uploaded photos: /uploads/members/{guid}.jpg is read straight from the uploads folder.
// (SecurityHeadersMiddleware already adds "nosniff", so the browser trusts our image Content-Type.)
var uploadsPath = LocalFileStorage.ResolveRootPath(app.Configuration, app.Environment);
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = LocalFileStorage.RequestPath,
});

app.UseAuthentication();   // who are you? (reads the JWT)
app.UseAuthorization();    // are you allowed? (roles / policies)
app.UseRateLimiter();

app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();

if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
    await app.MigrateAndSeedAsync();

await app.RunAsync();

/// <summary>Exposed so integration tests can use WebApplicationFactory&lt;Program&gt;.</summary>
public partial class Program;
