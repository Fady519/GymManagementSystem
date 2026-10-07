using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Payments;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IPaymentService
    {
        Task<PagedResult<PaymentResponse>> GetAllAsync(PaymentQuery query, CancellationToken ct = default);

        /// <summary>Same filters and order as the list, all rows (for Excel/CSV), or Export.TooManyRows. Paging is ignored.</summary>
        Task<Result<IReadOnlyList<PaymentResponse>>> GetForExportAsync(PaymentQuery query, int maxRows, CancellationToken ct = default);

        /// <summary>All payments of one member, newest first.</summary>
        Task<Result<IReadOnlyList<PaymentResponse>>> GetByMemberAsync(int memberId, CancellationToken ct = default);
    }
}
