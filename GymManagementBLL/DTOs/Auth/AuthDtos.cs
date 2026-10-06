using GymManagementDAL.Entities.Enums;

namespace GymManagementBLL.DTOs.Auth
{
    /// <summary>Self sign-up for a new gym member.</summary>
    public sealed record RegisterRequest(
        string Name,
        string Email,
        string Phone,
        string Password,
        DateOnly DateOfBirth,
        Gender Gender);

    public sealed record LoginRequest(string Email, string Password);

    public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

    /// <summary>Who is logged in. The frontend uses this to choose the menu and the home page.</summary>
    public sealed record CurrentUserResponse(
        int Id,
        string Email,
        string FullName,
        IReadOnlyList<string> Roles,
        int? MemberId,
        int? TrainerId,
        bool MustChangePassword);

    /// <summary>Returned by register / login / refresh. The refresh token is NOT here: it is sent as an httpOnly cookie.</summary>
    public sealed record AuthResponse(
        string AccessToken,
        DateTime AccessTokenExpiresAt,
        CurrentUserResponse User);

    /// <summary>
    /// What the service gives the controller: the JSON response + the raw refresh token,
    /// which the controller puts in the cookie (it never goes into the JSON body).
    /// </summary>
    public sealed record AuthResult(
        AuthResponse Response,
        string RefreshToken,
        DateTime RefreshTokenExpiresAt);
}
