using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Auth;
using GymManagementBLL.Errors;
using GymManagementBLL.Options;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Identity;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ITokenService _tokenService;
        private readonly IAppEmailService _emails;
        private readonly JwtOptions _jwt;
        private readonly IClock _clock;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            IUnitOfWork unitOfWork,
            ITokenService tokenService,
            IAppEmailService emails,
            IOptions<JwtOptions> jwtOptions,
            IClock clock)
        {
            _userManager = userManager;
            _unitOfWork = unitOfWork;
            _tokenService = tokenService;
            _emails = emails;
            _jwt = jwtOptions.Value;
            _clock = clock;
        }

        public async Task<Result<AuthResult>> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
        {
            var email = NormalizeEmail(request.Email);
            var phone = request.Phone.Trim();
            var members = _unitOfWork.GetRepository<Member>();

            if (await _userManager.FindByEmailAsync(email) is not null)
                return AuthErrors.EmailTaken;

            // The person is already a member (added by reception) but has no account yet.
            // Linking must be done by the gym (B7: invite email), so nobody can take over a member's data.
            if (await members.AnyAsync(m => m.Email == email, ct))
                return AuthErrors.MemberAlreadyExists;

            if (await members.AnyAsync(m => m.Phone == phone, ct))
                return AuthErrors.PhoneTaken;

            // Two tables must be saved together (AspNetUsers + Members): if the second insert fails,
            // the transaction is not committed and the first one is rolled back automatically.
            await using var transaction = await _unitOfWork.BeginTransactionAsync(ct);

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = request.Name.Trim(),
                CreatedAt = _clock.UtcNow,
            };

            var created = await _userManager.CreateAsync(user, request.Password);
            if (!created.Succeeded)
                return AuthErrors.IdentityFailed(created.Errors);

            await _userManager.AddToRoleAsync(user, AppRoles.Member);

            members.Add(new Member
            {
                Name = user.FullName,
                Email = email,
                Phone = phone,
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender,
                UserId = user.Id,
            });
            await _unitOfWork.SaveChangesAsync(ct);

            var result = await IssueTokensAsync(user, ct);

            await transaction.CommitAsync(ct);
            return result;
        }

        public async Task<Result<AuthResult>> LoginAsync(LoginRequest request, CancellationToken ct = default)
        {
            var user = await _userManager.FindByEmailAsync(NormalizeEmail(request.Email));
            if (user is null)
                return AuthErrors.InvalidCredentials;

            if (await _userManager.IsLockedOutAsync(user))
                return AuthErrors.LockedOut;

            if (!await _userManager.CheckPasswordAsync(user, request.Password))
            {
                // Counts the failure; after 5 failures Identity locks the account for 15 minutes.
                await _userManager.AccessFailedAsync(user);

                return await _userManager.IsLockedOutAsync(user)
                    ? AuthErrors.LockedOut
                    : AuthErrors.InvalidCredentials;
            }

            // Checked after the password, so a wrong password never reveals that an account is disabled.
            if (!user.IsActive)
                return AuthErrors.AccountDisabled;

            await _userManager.ResetAccessFailedCountAsync(user);

            return await IssueTokensAsync(user, ct);
        }

        public async Task<Result<AuthResult>> RefreshAsync(string? refreshToken, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                return AuthErrors.InvalidRefreshToken;

            var hash = _tokenService.HashRefreshToken(refreshToken);
            var stored = await _unitOfWork.GetRepository<RefreshToken>()
                .Query(asTracking: true)
                .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

            if (stored is null)
                return AuthErrors.InvalidRefreshToken;

            // Reuse detection: a refresh token works only once. If an already-used token comes back,
            // someone may have stolen it, so we sign out every session of this user.
            if (stored.RevokedAt is not null)
            {
                await RevokeAllSessionsAsync(stored.UserId, ct);
                return AuthErrors.RefreshTokenReused;
            }

            var now = _clock.UtcNow;
            if (stored.ExpiresAt <= now)
                return AuthErrors.InvalidRefreshToken;

            var user = await _userManager.FindByIdAsync(stored.UserId.ToString());
            if (user is null || !user.IsActive)
            {
                stored.RevokedAt = now;
                await _unitOfWork.SaveChangesAsync(ct);
                return AuthErrors.InvalidRefreshToken;
            }

            // Rotation: the old token is used up, and a brand-new one is issued (saved in the same SaveChanges).
            stored.RevokedAt = now;
            return await IssueTokensAsync(user, ct);
        }

        public async Task LogoutAsync(string? refreshToken, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                return;

            var hash = _tokenService.HashRefreshToken(refreshToken);
            var stored = await _unitOfWork.GetRepository<RefreshToken>()
                .Query(asTracking: true)
                .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

            if (stored is { RevokedAt: null })
            {
                stored.RevokedAt = _clock.UtcNow;
                await _unitOfWork.SaveChangesAsync(ct);
            }
        }

        public async Task<Result<CurrentUserResponse>> GetCurrentUserAsync(int userId, CancellationToken ct = default)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user is null)
                return AuthErrors.UserNotFound;

            return await BuildCurrentUserAsync(user, ct);
        }

        public async Task<Result<AuthResult>> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user is null)
                return AuthErrors.UserNotFound;

            if (!user.IsActive)
                return AuthErrors.AccountDisabled;

            var changed = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!changed.Succeeded)
            {
                return changed.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.PasswordMismatch))
                    ? AuthErrors.WrongCurrentPassword
                    : AuthErrors.IdentityFailed(changed.Errors);
            }

            if (user.MustChangePassword)
            {
                user.MustChangePassword = false;
                await _userManager.UpdateAsync(user);
            }

            // A new password should end every old session (e.g. a stolen phone stays logged out).
            await RevokeAllSessionsAsync(user.Id, ct);

            return await IssueTokensAsync(user, ct);
        }

        public async Task RevokeAllSessionsAsync(int userId, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;
            var activeTokens = await _unitOfWork.GetRepository<RefreshToken>()
                .Query(asTracking: true)
                .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > now)
                .ToListAsync(ct);

            foreach (var token in activeTokens)
                token.RevokedAt = now;

            await _unitOfWork.SaveChangesAsync(ct);
        }

        public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
        {
            // The controller always answers the same way, whatever happens here, so nobody can use
            // this endpoint to find out which emails have accounts (no "email not found" message).
            var user = await _userManager.FindByEmailAsync(NormalizeEmail(request.Email));
            if (user is null || !user.IsActive)
                return;

            // Someone who never accepted their invite has no password to reset: send the invite again.
            if (await _userManager.HasPasswordAsync(user))
            {
                await _emails.SendPasswordResetAsync(user, ct);
            }
            else
            {
                var roles = await _userManager.GetRolesAsync(user);
                await _emails.SendInviteAsync(user, roles.FirstOrDefault() ?? "", ct);
            }
        }

        public async Task<Result> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
        {
            var user = await _userManager.FindByEmailAsync(NormalizeEmail(request.Email));
            var token = AccountTokens.Decode(request.Token);

            if (user is null || token is null)
                return AuthErrors.InvalidResetToken;

            // Check the token first (signature, purpose, expiry, security stamp) without changing anything.
            var valid = await _userManager.VerifyUserTokenAsync(user, _userManager.Options.Tokens.PasswordResetTokenProvider,
                UserManager<ApplicationUser>.ResetPasswordTokenPurpose, token);
            if (!valid)
                return AuthErrors.InvalidResetToken;

            if (!user.IsActive)
                return AuthErrors.AccountDisabled;

            var reset = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);
            if (!reset.Succeeded)
            {
                return reset.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.InvalidToken))
                    ? AuthErrors.InvalidResetToken
                    : AuthErrors.IdentityFailed(reset.Errors);
            }

            // They proved they own the inbox, and the lockout from old failed attempts is lifted.
            user.EmailConfirmed = true;
            user.MustChangePassword = false;
            user.AccessFailedCount = 0;
            user.LockoutEnd = null;
            await _userManager.UpdateAsync(user);

            // Whoever knew the old password (or holds an old session) is signed out.
            await RevokeAllSessionsAsync(user.Id, ct);

            return Result.Success();
        }

        public async Task<Result> AcceptInviteAsync(AcceptInviteRequest request, CancellationToken ct = default)
        {
            var user = await _userManager.FindByEmailAsync(NormalizeEmail(request.Email));
            var token = AccountTokens.Decode(request.Token);

            if (user is null || token is null)
                return AuthErrors.InvalidInviteToken;

            // Our own "Invite" token provider: a token made for a password reset can't be used here.
            var valid = await _userManager.VerifyUserTokenAsync(user, AccountTokens.InviteProvider, AccountTokens.InvitePurpose, token);
            if (!valid || await _userManager.HasPasswordAsync(user))
                return AuthErrors.InvalidInviteToken;

            if (!user.IsActive)
                return AuthErrors.AccountDisabled;

            // Setting the password changes the security stamp, so this same link stops working (one-time use).
            var added = await _userManager.AddPasswordAsync(user, request.Password);
            if (!added.Succeeded)
                return AuthErrors.IdentityFailed(added.Errors);

            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);

            return Result.Success();
        }

        #region Helper Methods

        private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

        /// <summary>Creates an access token + a new refresh token (saved as a hash) for the user.</summary>
        private async Task<AuthResult> IssueTokensAsync(ApplicationUser user, CancellationToken ct)
        {
            var currentUser = await BuildCurrentUserAsync(user, ct);
            var accessToken = _tokenService.CreateAccessToken(user, currentUser.Roles, currentUser.MemberId, currentUser.TrainerId);

            var refreshToken = _tokenService.GenerateRefreshToken();
            var refreshExpiresAt = _clock.UtcNow.AddDays(_jwt.RefreshTokenDays);

            _unitOfWork.GetRepository<RefreshToken>().Add(new RefreshToken
            {
                UserId = user.Id,
                TokenHash = _tokenService.HashRefreshToken(refreshToken),
                ExpiresAt = refreshExpiresAt,
            });
            await _unitOfWork.SaveChangesAsync(ct);

            var response = new AuthResponse(accessToken.Token, accessToken.ExpiresAt, currentUser);
            return new AuthResult(response, refreshToken, refreshExpiresAt);
        }

        private async Task<CurrentUserResponse> BuildCurrentUserAsync(ApplicationUser user, CancellationToken ct)
        {
            var roles = await _userManager.GetRolesAsync(user);

            var memberId = await _unitOfWork.GetRepository<Member>().Query()
                .Where(m => m.UserId == user.Id)
                .Select(m => (int?)m.Id)
                .FirstOrDefaultAsync(ct);

            var trainerId = await _unitOfWork.GetRepository<Trainer>().Query()
                .Where(t => t.UserId == user.Id)
                .Select(t => (int?)t.Id)
                .FirstOrDefaultAsync(ct);

            return new CurrentUserResponse(
                user.Id,
                user.Email!,
                user.FullName,
                roles.ToList(),
                memberId,
                trainerId,
                user.MustChangePassword);
        }

        #endregion
    }
}
