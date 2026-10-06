using GymManagementDAL.Entities.Enums;

namespace GymManagementDAL.Entities
{
    /// <summary>A member's subscription to a plan for a period of time.</summary>
    public class Membership : BaseEntity
    {
        public int MemberId { get; set; }
        public Member Member { get; set; } = null!;

        public int PlanId { get; set; }
        public Plan Plan { get; set; } = null!;

        /// <summary>UTC.</summary>
        public DateTime StartDate { get; set; }

        /// <summary>UTC. The membership is expired when EndDate &lt;= now.</summary>
        public DateTime EndDate { get; set; }

        public MembershipStatus Status { get; set; } = MembershipStatus.Active;

        #region Snapshot of the plan at purchase time
        // Like an invoice: if the plan's price or duration changes later,
        // existing memberships keep what the member actually paid for.

        public string PlanName { get; set; } = null!;
        public decimal PricePaid { get; set; }
        public int DurationDays { get; set; }

        #endregion
    }
}
