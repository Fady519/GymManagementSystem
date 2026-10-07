using GymManagementAPI.Extensions;
using GymManagementAPI.Infrastructure;
using Microsoft.Extensions.FileProviders;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

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

// ---- HTTP pipeline (order matters) ----
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.DocumentTitle = "Gym Management API");
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

// Uploaded photos: /uploads/members/{guid}.jpg is read straight from the uploads folder.
var uploadsPath = LocalFileStorage.ResolveRootPath(app.Configuration, app.Environment);
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = LocalFileStorage.RequestPath,
    // The browser must trust our Content-Type (image/jpeg...), never guess it from the bytes.
    OnPrepareResponse = context => context.Context.Response.Headers.XContentTypeOptions = "nosniff",
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
