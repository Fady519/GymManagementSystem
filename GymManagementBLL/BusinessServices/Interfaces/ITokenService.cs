using GymManagementDAL.Entities.Identity;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public sealed record AccessToken(string Token, DateTime ExpiresAt);

    /// <summary>Creates JWT access tokens and random refresh tokens. Pure logic, no database.</summary>
    public interface ITokenService
    {
        AccessToken CreateAccessToken(ApplicationUser user, IEnumerable<string> roles, int? memberId, int? trainerId);

        /// <summary>A random, unguessable string (64 bytes) sent to the browser in a cookie.</summary>
        string GenerateRefreshToken();

        /// <summary>SHA-256 hash (hex) of a refresh token. Only the hash is saved in the database.</summary>
        string HashRefreshToken(string refreshToken);
    }
}
