using GymManagementBLL.Common;
using GymManagementBLL.DTOs.CheckIns;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface ICheckInService
    {
        /// <summary>
        /// The reception scans a member's QR. Allowed or Denied are both a normal answer (and both are saved);
        /// only an unknown code is an error (CheckIn.UnknownCode, 404).
        /// </summary>
        Task<Result<CheckInResultResponse>> CheckInAsync(CheckInRequest request, int staffUserId, CancellationToken ct = default);

        /// <summary>The check-ins log, newest first.</summary>
        Task<PagedResult<CheckInResponse>> GetAllAsync(CheckInQuery query, CancellationToken ct = default);

        /// <summary>Same filters as the log, all rows (for Excel/CSV), or Export.TooManyRows.</summary>
        Task<Result<IReadOnlyList<CheckInResponse>>> GetForExportAsync(CheckInQuery query, int maxRows, CancellationToken ct = default);

        /// <summary>The member's current QR content.</summary>
        Task<Result<CheckInCodeResponse>> GetCodeAsync(int memberId, CancellationToken ct = default);

        /// <summary>Makes a new QR code; the old one stops working immediately (e.g. a screenshot was shared).</summary>
        Task<Result<CheckInCodeResponse>> RegenerateCodeAsync(int memberId, CancellationToken ct = default);
    }
}
