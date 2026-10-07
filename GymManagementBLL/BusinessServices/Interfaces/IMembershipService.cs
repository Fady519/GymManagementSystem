using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Memberships;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IMembershipService
    {
        Task<PagedResult<MembershipResponse>> GetAllAsync(MembershipQuery query, CancellationToken ct = default);

        /// <summary>Same filters and order as the list, all rows (for Excel/CSV), or Export.TooManyRows. Paging is ignored.</summary>
        Task<Result<IReadOnlyList<MembershipResponse>>> GetForExportAsync(MembershipQuery query, int maxRows, CancellationToken ct = default);

        Task<Result<MembershipDetailsResponse>> GetByIdAsync(int id, CancellationToken ct = default);

        /// <summary>Running memberships that end soon and have no renewal waiting (for follow-up calls).</summary>
        Task<IReadOnlyList<MembershipResponse>> GetExpiringSoonAsync(ExpiringSoonQuery query, CancellationToken ct = default);

        /// <summary>How many memberships GetExpiringSoonAsync would return (default days), counted in SQL.</summary>
        Task<int> CountExpiringSoonAsync(CancellationToken ct = default);

        /// <param name="staffUserId">The logged-in staff account that receives the money.</param>
        Task<Result<MembershipResponse>> CreateAsync(CreateMembershipRequest request, int staffUserId, CancellationToken ct = default);

        Task<Result<MembershipResponse>> RenewAsync(int id, RenewMembershipRequest request, int staffUserId, CancellationToken ct = default);

        Task<Result<MembershipResponse>> CancelAsync(int id, CancelMembershipRequest request, int staffUserId, CancellationToken ct = default);

        Task<Result<MembershipResponse>> FreezeAsync(int id, FreezeMembershipRequest request, CancellationToken ct = default);

        Task<Result<MembershipResponse>> UnfreezeAsync(int id, CancellationToken ct = default);
    }
}
