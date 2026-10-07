using GymManagementBLL.DTOs.Memberships;
using GymManagementBLL.DTOs.Payments;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using System.Linq.Expressions;

namespace GymManagementBLL.Mapping
{
    /// <summary>
    /// Projections used inside EF queries (.Select(...)). Because they are Expressions,
    /// EF turns them into SQL and only reads the needed columns (no Include, no extra queries).
    /// </summary>
    public static class MembershipMappings
    {
        /// <summary>
        /// The state is calculated in SQL (a CASE expression) from the stored Status, the dates and "now".
        /// The order matters: Cancelled wins, then Expired, then Upcoming, then Frozen.
        /// </summary>
        public static Expression<Func<Membership, MembershipResponse>> ToResponse(DateTime now) => m =>
            new MembershipResponse(
                m.Id,
                m.MemberId,
                m.Member.Name,
                m.PlanId,
                m.PlanName,
                m.PricePaid,
                m.DurationDays,
                m.StartDate,
                m.EndDate,
                m.Status == MembershipStatus.Cancelled ? MembershipState.Cancelled
                    : m.EndDate <= now ? MembershipState.Expired
                    : m.StartDate > now ? MembershipState.Upcoming
                    : m.Status == MembershipStatus.Frozen && m.FrozenUntil > now ? MembershipState.Frozen
                    : MembershipState.Active,
                m.Status == MembershipStatus.Frozen && m.FrozenUntil > now ? m.FrozenUntil : null,
                m.TotalFrozenDays,
                m.CancelledAt,
                m.CancellationReason,
                m.CreatedAt);

        public static readonly Expression<Func<Payment, PaymentResponse>> PaymentToResponse = p =>
            new PaymentResponse(
                p.Id,
                p.MembershipId,
                p.Membership.MemberId,
                p.Membership.Member.Name,
                p.Membership.PlanName,
                p.Amount,
                p.Method,
                p.Type,
                p.PaidAt,
                p.ReceivedByUser != null ? p.ReceivedByUser.FullName : null,
                p.Notes);

        public static readonly Expression<Func<MembershipFreeze, MembershipFreezeResponse>> FreezeToResponse = f =>
            new MembershipFreezeResponse(f.Id, f.StartDate, f.EndDate, f.Days, f.Reason, f.EndedEarlyAt);
    }
}
