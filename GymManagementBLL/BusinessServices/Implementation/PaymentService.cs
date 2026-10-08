using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Payments;
using GymManagementBLL.Errors;
using GymManagementBLL.Mapping;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
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
            => await ListQuery(query).ToPagedResultAsync(query.Page, query.PageSize, ct);

        public async Task<Result<IReadOnlyList<PaymentResponse>>> GetForExportAsync(PaymentQuery query, int maxRows, CancellationToken ct = default)
            => await ListQuery(query).ToExportListAsync(maxRows, ct);

        public async Task<PaymentSummaryResponse> GetSummaryAsync(PaymentQuery query, CancellationToken ct = default)
        {
            // One SQL query: GroupBy a constant puts every filtered payment in a single group,
            // so COUNT and both SUMs run in the database (no rows are loaded into memory).
            // Refunds are stored as positive amounts with Type = Refund.
            var totals = await Filtered(query)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Count = g.Count(),
                    Income = g.Sum(p => p.Type == PaymentType.Refund ? 0m : p.Amount),
                    Refunds = g.Sum(p => p.Type == PaymentType.Refund ? p.Amount : 0m)
                })
                .FirstOrDefaultAsync(ct);

            // No payments match the filters: no group at all, so everything is 0.
            return totals is null
                ? new PaymentSummaryResponse(0, 0m, 0m, 0m)
                : new PaymentSummaryResponse(totals.Count, totals.Income, totals.Refunds, totals.Income - totals.Refunds);
        }

        /// <summary>The payments list as one SQL query (shared by the page and the export).</summary>
        private IQueryable<PaymentResponse> ListQuery(PaymentQuery query)
            => Filtered(query)
                .OrderByDescending(p => p.PaidAt).ThenByDescending(p => p.Id)
                .Select(MembershipMappings.PaymentToResponse);

        /// <summary>The filters of the payments page (shared by the list, the export and the totals).</summary>
        private IQueryable<Payment> Filtered(PaymentQuery query)
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

            return payments;
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
