namespace GymManagementDAL.Entities
{
    /// <summary>One freeze of a membership (history: when, how many days, why, ended early?).</summary>
    public class MembershipFreeze : BaseEntity
    {
        public int MembershipId { get; set; }
        public Membership Membership { get; set; } = null!;

        /// <summary>UTC.</summary>
        public DateTime StartDate { get; set; }

        /// <summary>UTC. The planned end (StartDate + Days).</summary>
        public DateTime EndDate { get; set; }

        public int Days { get; set; }

        public string? Reason { get; set; }

        /// <summary>UTC. Set when the freeze was stopped before EndDate.</summary>
        public DateTime? EndedEarlyAt { get; set; }
    }
}
