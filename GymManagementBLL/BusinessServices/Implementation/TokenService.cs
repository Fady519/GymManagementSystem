using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.Options;
using GymManagementDAL.Entities.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Buffers.Text;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class TokenService : ITokenService
    {
        private readonly JwtOptions _jwt;
        private readonly IClock _clock;

        public TokenService(IOptions<JwtOptions> jwtOptions, IClock clock)
        {
            _jwt = jwtOptions.Value;
            _clock = clock;
        }

        public AccessToken CreateAccessToken(ApplicationUser user, IEnumerable<string> roles, int? memberId, int? trainerId)
        {
            var now = _clock.UtcNow;
            var expiresAt = now.AddMinutes(_jwt.AccessTokenMinutes);

            // Claims = the facts written inside the token. The API trusts them without a database
            // call because the token is signed: changing any letter breaks the signature.
            var claims = new List<Claim>
            {
                new(AppClaims.UserId, user.Id.ToString()),
                new(AppClaims.Email, user.Email!),
                new(AppClaims.Name, user.FullName),
                new(AppClaims.TokenId, Guid.NewGuid().ToString()),
            };

            claims.AddRange(roles.Select(role => new Claim(AppClaims.Role, role)));

            if (memberId is not null)
                claims.Add(new Claim(AppClaims.MemberId, memberId.Value.ToString(), ClaimValueTypes.Integer32));

            if (trainerId is not null)
                claims.Add(new Claim(AppClaims.TrainerId, trainerId.Value.ToString(), ClaimValueTypes.Integer32));

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));

            var descriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Issuer = _jwt.Issuer,
                Audience = _jwt.Audience,
                IssuedAt = now,
                NotBefore = now,
                Expires = expiresAt,
                SigningCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256),
            };

            var token = new JsonWebTokenHandler().CreateToken(descriptor);
            return new AccessToken(token, expiresAt);
        }

        public string GenerateRefreshToken()
            => Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(64));

        public string HashRefreshToken(string refreshToken)
            => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));
    }
}
