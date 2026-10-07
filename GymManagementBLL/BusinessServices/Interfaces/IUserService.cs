using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Users;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    /// <summary>Account management for the SuperAdmin + small helpers other services reuse.</summary>
    public interface IUserService
    {
        Task<Result<PagedResult<UserResponse>>> GetAllAsync(string? search, string? role, int page, int pageSize, CancellationToken ct = default);

        Task<Result<UserResponse>> GetByIdAsync(int id, CancellationToken ct = default);

        Task<Result<CreatedUserResponse>> CreateAdminAsync(CreateAdminRequest request, CancellationToken ct = default);

        Task<Result<UserResponse>> SetStatusAsync(int id, bool isActive, CancellationToken ct = default);

        /// <summary>
        /// Creates a login account with a temporary password and the given role.
        /// Does NOT start a transaction: the caller does (e.g. "create trainer + account" together).
        /// </summary>
        Task<Result<CreatedAccount>> CreateAccountAsync(string email, string fullName, string role, CancellationToken ct = default);

        /// <summary>Keeps the account's email/name in sync when a member/trainer profile is edited.</summary>
        Task<Result> UpdateAccountProfileAsync(int userId, string email, string fullName, CancellationToken ct = default);

        /// <summary>Disables the account and signs it out everywhere (used when a member/trainer is deleted).</summary>
        Task DeactivateAccountAsync(int userId, CancellationToken ct = default);
    }
}
