using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Users;
using GymManagementBLL.Errors;
using GymManagementDAL.Entities.Identity;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class UserService : IUserService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole<int>> _roleManager;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuthService _authService;
        private readonly IClock _clock;

        public UserService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole<int>> roleManager,
            IUnitOfWork unitOfWork,
            IAuthService authService,
            IClock clock)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _unitOfWork = unitOfWork;
            _authService = authService;
            _clock = clock;
        }

        public async Task<Result<PagedResult<UserResponse>>> GetAllAsync(
            string? search, string? role, int page, int pageSize, CancellationToken ct = default)
        {
            // Only 4 roles: load them once and translate RoleId -> name in memory.
            var roleNames = await _roleManager.Roles.AsNoTracking().ToDictionaryAsync(r => r.Id, r => r.Name!, ct);

            var query = _userManager.Users.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(role))
            {
                var roleId = roleNames.FirstOrDefault(r => string.Equals(r.Value, role.Trim(), StringComparison.OrdinalIgnoreCase)).Key;
                if (roleId == 0)
                    return UserErrors.UnknownRole(role);

                query = query.Where(u => u.UserRoles.Any(ur => ur.RoleId == roleId));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(u => u.Email!.Contains(term) || u.FullName.Contains(term));
            }

            // One query for the page (users + their role ids), instead of one extra query per user (N+1).
            var rows = await query
                .OrderBy(u => u.Email)
                .Select(u => new UserRow(u.Id, u.Email!, u.FullName, u.IsActive, u.MustChangePassword,
                    u.LockoutEnd, u.CreatedAt, u.UserRoles.Select(ur => ur.RoleId).ToList()))
                .ToPagedResultAsync(page, pageSize, ct);

            var items = rows.Items
                .Select(r => new UserResponse(r.Id, r.Email, r.FullName,
                    r.RoleIds.Select(id => roleNames[id]).ToList(),
                    r.IsActive, r.MustChangePassword, IsLockedOut(r.LockoutEnd), r.CreatedAt))
                .ToList();

            return new PagedResult<UserResponse>(items, rows.Page, rows.PageSize, rows.TotalCount);
        }

        public async Task<Result<UserResponse>> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user is null)
                return UserErrors.NotFound(id);

            return ToResponse(user, await _userManager.GetRolesAsync(user));
        }

        public async Task<Result<CreatedUserResponse>> CreateAdminAsync(CreateAdminRequest request, CancellationToken ct = default)
        {
            var email = request.Email.Trim().ToLowerInvariant();

            if (await _userManager.FindByEmailAsync(email) is not null)
                return UserErrors.EmailTaken;

            var temporaryPassword = TemporaryPassword.Generate();

            // Create the user + give the role together: never leave an account without a role.
            await using var transaction = await _unitOfWork.BeginTransactionAsync(ct);

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = request.FullName.Trim(),
                MustChangePassword = true,
                CreatedAt = _clock.UtcNow,
            };

            var created = await _userManager.CreateAsync(user, temporaryPassword);
            if (!created.Succeeded)
                return AuthErrors.IdentityFailed(created.Errors);

            await _userManager.AddToRoleAsync(user, AppRoles.Admin);
            await transaction.CommitAsync(ct);

            return new CreatedUserResponse(ToResponse(user, [AppRoles.Admin]), temporaryPassword);
        }

        public async Task<Result<UserResponse>> SetStatusAsync(int id, bool isActive, CancellationToken ct = default)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user is null)
                return UserErrors.NotFound(id);

            var roles = await _userManager.GetRolesAsync(user);

            // Protects against locking everyone out of the system.
            if (!isActive && roles.Contains(AppRoles.SuperAdmin))
                return UserErrors.CannotDisableSuperAdmin;

            if (user.IsActive != isActive)
            {
                user.IsActive = isActive;
                await _userManager.UpdateAsync(user);
            }

            // Disabled = can't refresh anymore. Their current access token still works
            // until it expires (max 15 minutes); that is the trade-off of short-lived JWTs.
            if (!isActive)
                await _authService.RevokeAllSessionsAsync(user.Id, ct);

            return ToResponse(user, roles);
        }

        #region Helper Methods

        private sealed record UserRow(int Id, string Email, string FullName, bool IsActive, bool MustChangePassword,
            DateTimeOffset? LockoutEnd, DateTime CreatedAt, List<int> RoleIds);

        private bool IsLockedOut(DateTimeOffset? lockoutEnd)
            => lockoutEnd is not null && lockoutEnd > new DateTimeOffset(_clock.UtcNow);

        private UserResponse ToResponse(ApplicationUser user, IEnumerable<string> roles)
            => new(user.Id, user.Email!, user.FullName, roles.ToList(), user.IsActive,
                user.MustChangePassword, IsLockedOut(user.LockoutEnd), user.CreatedAt);

        #endregion
    }
}
