using FluentValidation;
using GymManagementAPI.Infrastructure;
using GymManagementAPI.Infrastructure.Exports;
using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Implementation;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.Options;
using GymManagementBLL.Validators.Plans;
using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Data.SeedData;
using GymManagementDAL.Entities.Identity;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using System.Diagnostics;
using System.Reflection;
using System.Text.Json.Serialization;

namespace GymManagementAPI.Extensions
{
    public static class ServiceCollectionExtensions
    {
        /// <summary>DbContext, repositories and unit of work.</summary>
        public static IServiceCollection AddPersistence(this IServiceCollection services)
        {
            // The connection string is resolved lazily from IConfiguration so that
            // integration tests can override it.
            services.AddDbContext<GymDbContext>((sp, options) =>
            {
                var connectionString = sp.GetRequiredService<IConfiguration>().GetConnectionString("DefaultConnection")
                    ?? throw new InvalidOperationException(
                        "Connection string 'DefaultConnection' is not configured. " +
                        "Set it with: dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"<value>\"");

                options.UseSqlServer(connectionString);
            });
            services.AddScoped<IUnitOfWork, UnitOfWork>();

            return services;
        }

        /// <summary>Business services and their validators.</summary>
        public static IServiceCollection AddBusinessServices(this IServiceCollection services)
        {
            services.AddSingleton<IClock, SystemClock>();

            services.AddScoped<IPlanService, PlanService>();
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<ICategoryService, CategoryService>();
            services.AddScoped<ITrainerService, TrainerService>();
            services.AddScoped<IMemberService, MemberService>();
            services.AddScoped<ISessionService, SessionService>();
            services.AddScoped<IBookingService, BookingService>();
            services.AddScoped<IMembershipService, MembershipService>();
            services.AddScoped<IPaymentService, PaymentService>();
            services.AddScoped<IAppEmailService, AppEmailService>();
            services.AddScoped<ICheckInService, CheckInService>();
            services.AddScoped<IAnalyticsService, AnalyticsService>();
            services.AddScoped<ExportService>();

            // The gym's time zone ("Gym" section): what "today" means for check-ins, reports and emails.
            // An unknown time zone id stops the app at startup instead of giving wrong reports later.
            services.AddOptions<GymOptions>()
                .BindConfiguration(GymOptions.SectionName)
                .ValidateDataAnnotations()
                .Validate(o => GymTimeZone.Find(o.TimeZoneId) is not null, "Gym:TimeZoneId is not a known time zone.")
                .ValidateOnStart();
            services.AddSingleton<GymTimeZone>();

            // Excel / CSV limits ("Exports").
            services.AddOptions<ExportOptions>()
                .BindConfiguration(ExportOptions.SectionName)
                .ValidateDataAnnotations()
                .ValidateOnStart();

            // Emails: the "post office" (SMTP via MailKit) + link settings for the email content.
            services.AddSingleton<IEmailSender, SmtpEmailSender>();

            services.AddOptions<SmtpOptions>()
                .BindConfiguration(SmtpOptions.SectionName)
                .ValidateDataAnnotations()
                .ValidateOnStart();

            services.AddOptions<EmailOptions>()
                .BindConfiguration(EmailOptions.SectionName)
                .ValidateDataAnnotations()
                .ValidateOnStart();

            // Session / booking rules from appsettings ("SessionRules"); invalid values stop the app at startup.
            services.AddOptions<SessionRulesOptions>()
                .BindConfiguration(SessionRulesOptions.SectionName)
                .ValidateDataAnnotations()
                .ValidateOnStart();

            // Freeze limits and the "expiring soon" window ("MembershipRules").
            services.AddOptions<MembershipRulesOptions>()
                .BindConfiguration(MembershipRulesOptions.SectionName)
                .ValidateDataAnnotations()
                .Validate(o => o.MinFreezeDays <= o.MaxFreezeDays && o.MaxFreezeDays <= o.MaxTotalFreezeDays,
                    "MembershipRules: MinFreezeDays <= MaxFreezeDays <= MaxTotalFreezeDays.")
                .ValidateOnStart();

            // Uploaded files go to a local folder; the path is read lazily so tests can change it.
            services.AddSingleton<IFileStorage>(sp => new LocalFileStorage(LocalFileStorage.ResolveRootPath(
                sp.GetRequiredService<IConfiguration>(), sp.GetRequiredService<IWebHostEnvironment>())));

            services.AddValidatorsFromAssemblyContaining<CreatePlanRequestValidator>();

            return services;
        }

        /// <summary>Controllers, error handling, Swagger and health checks.</summary>
        public static IServiceCollection AddApiServices(this IServiceCollection services)
        {
            services
                .AddControllers(options =>
                {
                    // FluentValidation is the single source of validation rules.
                    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
                    options.Filters.Add<ValidationFilter>();
                })
                .AddJsonOptions(options =>
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

            services.AddProblemDetails(options =>
                options.CustomizeProblemDetails = context =>
                {
                    context.ProblemDetails.Instance ??= $"{context.HttpContext.Request.Method} {context.HttpContext.Request.Path}";
                    context.ProblemDetails.Extensions.TryAdd("traceId", Activity.Current?.Id ?? context.HttpContext.TraceIdentifier);

                    // Empty 401/403/429 responses (from the JWT handler, [Authorize] or the rate limiter)
                    // also get a machine-readable code, like every other error of this API.
                    var code = context.ProblemDetails.Status switch
                    {
                        StatusCodes.Status401Unauthorized => "Auth.Unauthenticated",
                        StatusCodes.Status403Forbidden => "Auth.Forbidden",
                        StatusCodes.Status429TooManyRequests => "RateLimit.Exceeded",
                        _ => null
                    };
                    if (code is not null)
                        context.ProblemDetails.Extensions.TryAdd("code", code);
                });

            services.AddExceptionHandler<GlobalExceptionHandler>();

            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "Gym Management API",
                    Version = "v1",
                    Description = "REST API for managing a gym: plans, members, trainers, sessions, bookings, memberships and payments, "
                        + "QR check-in, analytics and Excel/CSV exports, plus member and trainer portals. "
                        + "Errors use RFC 9457 Problem Details with a machine-readable \"code\"."
                });

                var xmlFile = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
                if (File.Exists(xmlFile))
                    options.IncludeXmlComments(xmlFile);

                // Adds the "Authorize" button: paste the accessToken from /api/auth/login.
                options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "Paste the accessToken returned by POST /api/auth/login (without the word Bearer).",
                });

                // The lock icon and the 401/403/429 responses are added per endpoint (not globally),
                // so anonymous endpoints like login don't look protected.
                options.OperationFilter<AuthResponsesOperationFilter>();
            });

            services.AddHealthChecks()
                .AddDbContextCheck<GymDbContext>("database");

            return services;
        }

        /// <summary>Applies pending EF Core migrations and seeds reference data, roles and the first SuperAdmin.</summary>
        public static async Task MigrateAndSeedAsync(this WebApplication app)
        {
            await using var scope = app.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();

            await db.Database.MigrateAsync();
            await GymDbContextSeeding.SeedAsync(db);

            var config = app.Configuration;
            var message = await IdentitySeeding.SeedAsync(
                scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>(),
                scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>(),
                config["SuperAdmin:Email"],
                config["SuperAdmin:Password"],
                config["SuperAdmin:FullName"] ?? "Super Admin");

            app.Logger.LogInformation("Identity seeding: {Result}", message);
        }

        /// <summary>
        /// One-off command: dotnet run --project GymManagementAPI -- --seed-demo
        /// Brings the database up to date, then adds ~3 months of demo data (see DemoDataSeeding).
        /// </summary>
        public static async Task SeedDemoDataAsync(this WebApplication app)
        {
            await app.MigrateAndSeedAsync();

            await using var scope = app.Services.CreateAsyncScope();
            var services = scope.ServiceProvider;

            var message = await DemoDataSeeding.SeedAsync(
                services.GetRequiredService<GymDbContext>(),
                services.GetRequiredService<UserManager<ApplicationUser>>(),
                app.Configuration["DemoData:Password"],
                services.GetRequiredService<GymTimeZone>().Zone,
                services.GetRequiredService<IClock>().UtcNow);

            app.Logger.LogInformation("Demo data: {Result}", message);
        }
    }
}
