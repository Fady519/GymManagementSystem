using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Auth;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IAuthService
    {
        /// <summary>Creates a login account + a Member profile, then logs the new member in.</summary>
        Task<Result<AuthResult>> RegisterAsync(RegisterRequest request, CancellationToken ct = default);

        Task<Result<AuthResult>> LoginAsync(LoginRequest request, CancellationToken ct = default);

        /// <summary>Exchanges a valid refresh token for a new access token + a NEW refresh token (rotation).</summary>
        Task<Result<AuthResult>> RefreshAsync(string? refreshToken, CancellationToken ct = default);

        /// <summary>Revokes the given refresh token (if it exists). Always succeeds.</summary>
        Task LogoutAsync(string? refreshToken, CancellationToken ct = default);

        Task<Result<CurrentUserResponse>> GetCurrentUserAsync(int userId, CancellationToken ct = default);

        /// <summary>Changes the password, signs out all other sessions and returns fresh tokens.</summary>
        Task<Result<AuthResult>> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default);

        /// <summary>Revokes every active refresh token of the user ("log out from all devices").</summary>
        Task RevokeAllSessionsAsync(int userId, CancellationToken ct = default);

        /// <summary>
        /// Emails a reset link (or the invite again, if the person never set a password).
        /// Returns nothing on purpose: the answer must be the same whether the email exists or not.
        /// </summary>
        Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default);

        /// <summary>Sets a new password from the emailed link, then signs out every session.</summary>
        Task<Result> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);

        /// <summary>The invited person chooses their first password (the link works once).</summary>
        Task<Result> AcceptInviteAsync(AcceptInviteRequest request, CancellationToken ct = default);
    }
}
