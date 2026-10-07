using GymManagementDAL.Entities.Enums;

namespace GymManagementBLL.DTOs.Payments
{
    public sealed record PaymentResponse(
        int Id,
        int MembershipId,
        int MemberId,
        string MemberName,
        string PlanName,
        decimal Amount,
        PaymentMethod Method,
        PaymentType Type,
        DateTime PaidAt,
        string? ReceivedBy,
        string? Notes);

    /// <summary>Filters for the payments page. From/To are UTC; To is exclusive.</summary>
    public sealed class PaymentQuery
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public PaymentMethod? Method { get; set; }
        public PaymentType? Type { get; set; }
        public int? MemberId { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
