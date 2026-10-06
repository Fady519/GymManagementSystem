using GymManagementAPI.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.Options;
using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

namespace GymManagementAPI.Extensions
{
    public static class AuthServiceCollectionExtensions
    {
        /// <summary>Identity (users, passwords, roles), JWT authentication, role policies and rate limiting.</summary>
        public static IServiceCollection AddAuth(this IServiceCollection services)
        {
            // ---- Identity: password hashing, lockout, roles (no cookies, no UI) ----
            services
                .AddIdentityCore<ApplicationUser>(options =>
                {
                    // Keep in sync with AuthRules.StrongPassword (FluentValidation).
                    options.Password.RequiredLength = 8;
                    options.Password.RequireDigit = true;
                    options.Password.RequireLowercase = true;
                    options.Password.RequireUppercase = true;
                    options.Password.RequireNonAlphanumeric = false;

                    options.User.RequireUniqueEmail = true;

                    // 5 wrong passwords in a row => locked for 15 minutes.
                    options.Lockout.MaxFailedAccessAttempts = 5;
                    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                    options.Lockout.AllowedForNewUsers = true;
                })
                .AddRoles<IdentityRole<int>>()
                .AddEntityFrameworkStores<GymDbContext>();

            // ---- JWT settings (validated when the app starts) ----
            services.AddOptions<JwtOptions>()
                .BindConfiguration(JwtOptions.SectionName)
                .ValidateDataAnnotations()
                .ValidateOnStart();

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();

            // Configured through IOptions<JwtOptions> so tests can override the settings.
            services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
                .Configure<IOptions<JwtOptions>>((bearer, jwtOptions) =>
                {
                    var jwt = jwtOptions.Value;

                    // Keep claim names exactly as written in the token ("sub", "role"...).
                    bearer.MapInboundClaims = false;

                    bearer.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = jwt.Issuer,
                        ValidateAudience = true,
                        ValidAudience = jwt.Audience,
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.FromSeconds(30), // default is 5 minutes, too long for 15-minute tokens
                        NameClaimType = AppClaims.Name,
                        RoleClaimType = AppClaims.Role,
                    };
                });

            // ---- Authorization: who can call what ----
            services.AddAuthorizationBuilder()
                // Secure by default: every endpoint needs a logged-in user unless it says [AllowAnonymous].
                .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
                .AddPolicy(AppPolicies.SuperAdminOnly, p => p.RequireRole(AppRoles.SuperAdmin))
                .AddPolicy(AppPolicies.AdminAccess, p => p.RequireRole(AppRoles.SuperAdmin, AppRoles.Admin))
                .AddPolicy(AppPolicies.TrainerAccess, p => p.RequireRole(AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Trainer))
                .AddPolicy(AppPolicies.MemberAccess, p => p.RequireRole(AppRoles.Member));

            // ---- Rate limiting: max N login/register/refresh calls per minute per IP ----
            services.AddRateLimiter(options =>
            {
                // 429 with no body; UseStatusCodePages turns it into ProblemDetails (code "RateLimit.Exceeded").
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.AddPolicy(AppPolicies.AuthRateLimit, httpContext =>
                {
                    var config = httpContext.RequestServices.GetRequiredService<IConfiguration>();
                    var permitLimit = config.GetValue("RateLimiting:AuthPermitLimit", 10);
                    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                    return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = permitLimit,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                    });
                });
            });

            return services;
        }
    }
}
