using GymManagementAPI.Extensions;
using GymManagementAPI.Infrastructure;
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
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseSerilogRequestLogging();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
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
