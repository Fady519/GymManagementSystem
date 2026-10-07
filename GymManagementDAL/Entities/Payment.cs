using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;

namespace GymManagementDAL.Entities
{
    /// <summary>
    /// One money movement of a membership (purchase, renewal or refund).
    /// Payments are never edited or deleted: a mistake is fixed with a refund, like a real cash book.
    /// </summary>
    public class Payment : BaseEntity
    {
        public int MembershipId { get; set; }
        public Membership Membership { get; set; } = null!;

        /// <summary>Always positive. For a refund it is the amount given back.</summary>
        public decimal Amount { get; set; }

        public PaymentMethod Method { get; set; }
        public PaymentType Type { get; set; }

        /// <summary>UTC.</summary>
        public DateTime PaidAt { get; set; }

        /// <summary>The staff account that received (or gave back) the money.</summary>
        public int? ReceivedByUserId { get; set; }
        public ApplicationUser? ReceivedByUser { get; set; }

        public string? Notes { get; set; }
    }
}
