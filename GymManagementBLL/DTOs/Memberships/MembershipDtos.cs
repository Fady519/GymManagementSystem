using GymManagementBLL.DTOs.Payments;
using GymManagementDAL.Entities.Enums;

namespace GymManagementBLL.DTOs.Memberships
{
    /// <summary>
    /// What the user sees. Calculated from the stored Status + the dates + the current time:
    /// Upcoming = early renewal waiting to start, Expired = EndDate passed, Frozen = frozen right now.
    /// </summary>
    public enum MembershipState
    {
        Upcoming = 0,
        Active = 1,
        Frozen = 2,
        Expired = 3,
        Cancelled = 4
    }

    public sealed record MembershipResponse(
        int Id,
        int MemberId,
        string MemberName,
        int PlanId,
        string PlanName,
        decimal PricePaid,
        int DurationDays,
        DateTime StartDate,
        DateTime EndDate,
        MembershipState State,
        DateTime? FrozenUntil,
        int TotalFrozenDays,
        DateTime? CancelledAt,
        string? CancellationReason,
        DateTime CreatedAt);

    public sealed record MembershipFreezeResponse(
        int Id, DateTime StartDate, DateTime EndDate, int Days, string? Reason, DateTime? EndedEarlyAt);

    /// <summary>One membership with its money history and freeze history.</summary>
    public sealed record MembershipDetailsResponse(
        MembershipResponse Membership,
        IReadOnlyList<PaymentResponse> Payments,
        IReadOnlyList<MembershipFreezeResponse> Freezes);

    /// <summary>A new membership starting now, paid at the reception.</summary>
    public sealed record CreateMembershipRequest(int MemberId, int PlanId, PaymentMethod PaymentMethod, string? Notes);

    /// <summary>PlanId is optional: empty = the same plan again, or another plan (upgrade).</summary>
    public sealed record RenewMembershipRequest(int? PlanId, PaymentMethod PaymentMethod, string? Notes);

    /// <summary>RefundAmount is optional (0 or empty = no refund). RefundMethod is required when there is a refund.</summary>
    public sealed record CancelMembershipRequest(decimal? RefundAmount, PaymentMethod? RefundMethod, string? Reason);

    /// <summary>The freeze starts now and lasts this many days.</summary>
    public sealed record FreezeMembershipRequest(int Days, string? Reason);

    public sealed class MembershipQuery
    {
        public MembershipState? State { get; set; }
        public int? MemberId { get; set; }

        /// <summary>Member name or phone.</summary>
        public string? Search { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>Days empty = the default from appsettings (MembershipRules:ExpiringSoonDays).</summary>
    public sealed class ExpiringSoonQuery
    {
        public int? Days { get; set; }
    }
}
