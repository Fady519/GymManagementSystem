using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Common;
using GymManagementBLL.DTOs.Members;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IMemberService
    {
        Task<PagedResult<MemberListItem>> GetAllAsync(MemberQuery query, CancellationToken ct = default);

        /// <summary>Same filters and order as the list, all rows (for Excel/CSV), or Export.TooManyRows. Paging is ignored.</summary>
        Task<Result<IReadOnlyList<MemberListItem>>> GetForExportAsync(MemberQuery query, int maxRows, CancellationToken ct = default);
        Task<Result<MemberResponse>> GetByIdAsync(int id, CancellationToken ct = default);
        Task<Result<MemberResponse>> CreateAsync(CreateMemberRequest request, CancellationToken ct = default);
        Task<Result<MemberResponse>> UpdateAsync(int id, UpdateMemberRequest request, CancellationToken ct = default);
        Task<Result> DeleteAsync(int id, CancellationToken ct = default);

        /// <summary>Adds or replaces the member's health record.</summary>
        Task<Result<HealthRecordDto>> SaveHealthRecordAsync(int id, HealthRecordDto request, CancellationToken ct = default);

        /// <summary>Validates the image (size + real type from its bytes), saves it and deletes the old one.</summary>
        Task<Result<MemberResponse>> SetPhotoAsync(int id, Stream content, long length, CancellationToken ct = default);

        Task<Result> DeletePhotoAsync(int id, CancellationToken ct = default);

        /// <summary>
        /// Gives an existing member an online account and emails them an invite to choose a password.
        /// If the account exists but the invite is still pending, it just resends the email.
        /// </summary>
        Task<Result<MemberWithAccountResponse>> CreateAccountAsync(int id, CancellationToken ct = default);

        /// <summary>The member edits their own contact data (phone + address only).</summary>
        Task<Result<MemberResponse>> UpdateMyProfileAsync(int memberId, UpdateMyProfileRequest request, CancellationToken ct = default);
    }
}
