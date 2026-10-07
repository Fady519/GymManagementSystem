using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Payments;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IPaymentService
    {
        Task<PagedResult<PaymentResponse>> GetAllAsync(PaymentQuery query, CancellationToken ct = default);

        /// <summary>All payments of one member, newest first.</summary>
        Task<Result<IReadOnlyList<PaymentResponse>>> GetByMemberAsync(int memberId, CancellationToken ct = default);
    }
}
