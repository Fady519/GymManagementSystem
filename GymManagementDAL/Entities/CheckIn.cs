using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;

namespace GymManagementDAL.Entities
{
    /// <summary>
    /// One scan of a member's QR code at the reception. Denied scans are saved too,
    /// so the gym can see who tried to enter without a valid membership.
    /// </summary>
    public class CheckIn : BaseEntity
    {
        public int MemberId { get; set; }
        public Member Member { get; set; } = null!;

        /// <summary>The membership that allowed the entry (null when denied).</summary>
        public int? MembershipId { get; set; }
        public Membership? Membership { get; set; }

        /// <summary>UTC.</summary>
        public DateTime CheckedInAt { get; set; }

        /// <summary>
        /// The gym's local date of the scan (Cairo time, not UTC). Stored so that
        /// "one check-in per day" can be a unique index and reports can group by day easily.
        /// </summary>
        public DateOnly Day { get; set; }

        public CheckInResult Result { get; set; }
        public CheckInDenyReason? DenyReason { get; set; }

        /// <summary>The staff account that scanned the code.</summary>
        public int? CheckedByUserId { get; set; }
        public ApplicationUser? CheckedByUser { get; set; }
    }
}
