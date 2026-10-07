using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Payments;
using GymManagementBLL.Errors;
using GymManagementBLL.Mapping;
using GymManagementDAL.Entities;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.BusinessServices.Implementation
{
    /// <summary>
    /// Read-only: payments are created by MembershipService (buy / renew / refund) and are never edited.
    /// </summary>
    public class PaymentService : IPaymentService
    {
        private readonly IUnitOfWork _unitOfWork;

        public PaymentService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<PagedResult<PaymentResponse>> GetAllAsync(PaymentQuery query, CancellationToken ct = default)
        {
            // IgnoreQueryFilters: money received from a member who was deleted later is still revenue.
            var payments = _unitOfWork.GetRepository<Payment>().Query().IgnoreQueryFilters();

            if (query.From is not null)
                payments = payments.Where(p => p.PaidAt >= query.From);
            if (query.To is not null)
                payments = payments.Where(p => p.PaidAt < query.To);
            if (query.Method is not null)
                payments = payments.Where(p => p.Method == query.Method);
            if (query.Type is not null)
                payments = payments.Where(p => p.Type == query.Type);
            if (query.MemberId is not null)
                payments = payments.Where(p => p.Membership.MemberId == query.MemberId);

            return await payments
                .OrderByDescending(p => p.PaidAt).ThenByDescending(p => p.Id)
                .Select(MembershipMappings.PaymentToResponse)
                .ToPagedResultAsync(query.Page, query.PageSize, ct);
        }

        public async Task<Result<IReadOnlyList<PaymentResponse>>> GetByMemberAsync(int memberId, CancellationToken ct = default)
        {
            var memberExists = await _unitOfWork.GetRepository<Member>().Query().IgnoreQueryFilters()
                .AnyAsync(m => m.Id == memberId, ct);

            if (!memberExists)
                return MemberErrors.NotFound(memberId);

            var payments = await _unitOfWork.GetRepository<Payment>().Query().IgnoreQueryFilters()
                .Where(p => p.Membership.MemberId == memberId)
                .OrderByDescending(p => p.PaidAt).ThenByDescending(p => p.Id)
                .Select(MembershipMappings.PaymentToResponse)
                .ToListAsync(ct);

            return Result.Success<IReadOnlyList<PaymentResponse>>(payments);
        }
    }
}
