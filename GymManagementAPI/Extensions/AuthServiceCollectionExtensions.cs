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
                    // Keep in sync with CommonRules.StrongPassword (FluentValidation).
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
                .AddEntityFrameworkStores<GymDbContext>()
                // "Default" provider = the one Identity uses for password-reset tokens.
                .AddTokenProvider<DataProtectorTokenProvider<ApplicationUser>>(TokenOptions.DefaultProvider)
                // Our own provider for invite links ("set your first password").
                .AddTokenProvider<InviteTokenProvider>(AccountTokens.InviteProvider);

            // Tokens are encrypted with ASP.NET Core Data Protection keys.
            services.AddDataProtection();

            // Link lifetimes come from the "Email" settings (reset: minutes, invite: days).
            services.AddOptions<DataProtectionTokenProviderOptions>()
                .Configure<IOptions<EmailOptions>>((o, email) =>
                    o.TokenLifespan = TimeSpan.FromMinutes(email.Value.ResetPasswordLinkMinutes));

            services.AddOptions<InviteTokenProviderOptions>()
                .Configure<IOptions<EmailOptions>>((o, email) =>
                    o.TokenLifespan = TimeSpan.FromDays(email.Value.InviteLinkDays));

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
                .AddPolicy(AppPolicies.TrainerOnly, p => p.RequireRole(AppRoles.Trainer))
                .AddPolicy(AppPolicies.MemberAccess, p => p.RequireRole(AppRoles.Member))
                .AddPolicy(AppPolicies.BookingAccess, p => p.RequireRole(AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Member));

            // ---- Rate limiting: max N auth calls per minute per IP ----
            services.AddRateLimiter(options =>
            {
                // 429 with no body; UseStatusCodePages turns it into ProblemDetails (code "RateLimit.Exceeded").
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                // Login / register / password links: small limit, they are the targets of password guessing.
                options.AddPolicy(AppPolicies.AuthRateLimit, httpContext =>
                    PerIpPerMinute(httpContext, "auth", "RateLimiting:AuthPermitLimit", defaultLimit: 10));

                // Refresh: its own bucket with a higher limit. The web app calls it on every full page load,
                // so sharing the login bucket would sign people out after a few reloads.
                options.AddPolicy(AppPolicies.RefreshRateLimit, httpContext =>
                    PerIpPerMinute(httpContext, "refresh", "RateLimiting:RefreshPermitLimit", defaultLimit: 60));
            });

            return services;
        }

        /// <summary>
        /// A fixed window of 1 minute per client IP. The limit is read from config on each request,
        /// so tests can lower or raise it (e.g. "RateLimiting:AuthPermitLimit").
        /// </summary>
        private static RateLimitPartition<string> PerIpPerMinute(
            HttpContext httpContext, string policy, string configKey, int defaultLimit)
        {
            var config = httpContext.RequestServices.GetRequiredService<IConfiguration>();
            var permitLimit = config.GetValue(configKey, defaultLimit);
            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            return RateLimitPartition.GetFixedWindowLimiter($"{policy}:{ip}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            });
        }
    }
}
