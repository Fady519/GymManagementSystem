using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Users;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    /// <summary>Account management for the SuperAdmin.</summary>
    public interface IUserService
    {
        Task<Result<PagedResult<UserResponse>>> GetAllAsync(string? search, string? role, int page, int pageSize, CancellationToken ct = default);

        Task<Result<UserResponse>> GetByIdAsync(int id, CancellationToken ct = default);

        Task<Result<CreatedUserResponse>> CreateAdminAsync(CreateAdminRequest request, CancellationToken ct = default);

        Task<Result<UserResponse>> SetStatusAsync(int id, bool isActive, CancellationToken ct = default);
    }
}
