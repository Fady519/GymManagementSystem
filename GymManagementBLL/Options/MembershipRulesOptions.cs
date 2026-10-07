using System.ComponentModel.DataAnnotations;

namespace GymManagementBLL.Options
{
    /// <summary>
    /// Membership rules that the gym may want to change without a code change,
    /// read from the "MembershipRules" config section. The app refuses to start with invalid values.
    /// </summary>
    public sealed class MembershipRulesOptions
    {
        public const string SectionName = "MembershipRules";

        /// <summary>The shortest freeze the admin can ask for.</summary>
        [Range(1, 30)]
        public int MinFreezeDays { get; set; } = 3;

        /// <summary>The longest single freeze.</summary>
        [Range(1, 90)]
        public int MaxFreezeDays { get; set; } = 30;

        /// <summary>All freezes of one membership together can't be longer than this.</summary>
        [Range(1, 180)]
        public int MaxTotalFreezeDays { get; set; } = 30;

        /// <summary>"Expiring soon" = ends within this many days (default of GET /api/memberships/expiring-soon).</summary>
        [Range(1, 60)]
        public int ExpiringSoonDays { get; set; } = 7;
    }
}
