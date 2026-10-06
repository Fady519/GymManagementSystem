using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GymManagementAPI.Controllers
{
    /// <summary>
    /// Register, login, refresh, logout. The access token (15 min) is returned in the JSON body;
    /// the refresh token (7 days) is stored in an httpOnly cookie that JavaScript can't read.
    /// </summary>
    [Route("api/auth")]
    public sealed class AuthController(IAuthService authService) : ApiControllerBase
    {
        private const string RefreshCookieName = "gym_refresh";

        /// <summary>Member self sign-up. Creates the account + member profile and logs in.</summary>
        [HttpPost("register")]
        [AllowAnonymous]
        [EnableRateLimiting(AppPolicies.AuthRateLimit)]
        [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
        {
            var result = await authService.RegisterAsync(request, ct);
            if (result.IsFailure)
                return Problem(result.Error);

            SetRefreshCookie(result.Value);
            return Created("/api/auth/me", result.Value.Response);
        }

        /// <summary>Logs in with email + password. 5 wrong attempts lock the account for 15 minutes.</summary>
        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting(AppPolicies.AuthRateLimit)]
        [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
        {
            var result = await authService.LoginAsync(request, ct);
            if (result.IsFailure)
                return Problem(result.Error);

            SetRefreshCookie(result.Value);
            return Ok(result.Value.Response);
        }

        /// <summary>Gets a new access token using the refresh cookie. The cookie is replaced (rotation).</summary>
        [HttpPost("refresh")]
        [AllowAnonymous]
        [EnableRateLimiting(AppPolicies.AuthRateLimit)]
        [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized, "application/problem+json")]
        public async Task<ActionResult<AuthResponse>> Refresh(CancellationToken ct)
        {
            var result = await authService.RefreshAsync(Request.Cookies[RefreshCookieName], ct);
            if (result.IsFailure)
            {
                DeleteRefreshCookie();
                return Problem(result.Error);
            }

            SetRefreshCookie(result.Value);
            return Ok(result.Value.Response);
        }

        /// <summary>Logs out: revokes the refresh token and deletes the cookie. Works even if the access token expired.</summary>
        [HttpPost("logout")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Logout(CancellationToken ct)
        {
            await authService.LogoutAsync(Request.Cookies[RefreshCookieName], ct);
            DeleteRefreshCookie();
            return NoContent();
        }

        /// <summary>The logged-in user (roles, memberId/trainerId, mustChangePassword).</summary>
        [HttpGet("me")]
        [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized, "application/problem+json")]
        public async Task<ActionResult<CurrentUserResponse>> Me(CancellationToken ct)
        {
            var result = await authService.GetCurrentUserAsync(CurrentUserId, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Changes the password. Other sessions are signed out; this one gets new tokens.</summary>
        [HttpPost("change-password")]
        [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized, "application/problem+json")]
        public async Task<ActionResult<AuthResponse>> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
        {
            var result = await authService.ChangePasswordAsync(CurrentUserId, request, ct);
            if (result.IsFailure)
                return Problem(result.Error);

            SetRefreshCookie(result.Value);
            return Ok(result.Value.Response);
        }

        #region Cookie Helpers

        // HttpOnly: JavaScript can't read it (safe from XSS).
        // Secure: only sent over HTTPS.
        // SameSite=Lax: not sent with cross-site POSTs (protects against CSRF).
        // Path=/api/auth: only sent to the auth endpoints, not with every request.
        private static CookieOptions RefreshCookieOptions(DateTime? expiresAt = null) => new()
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Expires = expiresAt,
        };

        private void SetRefreshCookie(AuthResult result)
            => Response.Cookies.Append(RefreshCookieName, result.RefreshToken, RefreshCookieOptions(result.RefreshTokenExpiresAt));

        private void DeleteRefreshCookie()
            => Response.Cookies.Delete(RefreshCookieName, RefreshCookieOptions());

        #endregion
    }
}
