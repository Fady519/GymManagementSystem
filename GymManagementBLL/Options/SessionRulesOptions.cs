using System.ComponentModel.DataAnnotations;

namespace GymManagementBLL.Options
{
    /// <summary>
    /// Session and booking rules that the gym may want to change without a code change,
    /// read from the "SessionRules" config section. The app refuses to start with invalid values.
    /// </summary>
    public sealed class SessionRulesOptions
    {
        public const string SectionName = "SessionRules";

        /// <summary>Max people in one session. The database also allows at most 25.</summary>
        [Range(1, 25)]
        public int MaxCapacity { get; set; } = 25;

        [Range(5, 240)]
        public int MinDurationMinutes { get; set; } = 30;

        [Range(30, 720)]
        public int MaxDurationMinutes { get; set; } = 240;

        /// <summary>A member can cancel a booking until this many hours before the session starts.</summary>
        [Range(0, 72)]
        public int CancellationDeadlineHours { get; set; } = 2;
    }
}
