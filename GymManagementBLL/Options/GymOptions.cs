using System.ComponentModel.DataAnnotations;

namespace GymManagementBLL.Options
{
    /// <summary>
    /// General gym settings ("Gym" config section). The database keeps every time in UTC;
    /// the gym's time zone decides what "today" and "this month" mean for reports,
    /// check-ins and the times written in emails.
    /// </summary>
    public sealed class GymOptions
    {
        public const string SectionName = "Gym";

        /// <summary>IANA id, e.g. "Africa/Cairo" (Windows ids like "Egypt Standard Time" also work).</summary>
        [Required]
        public string TimeZoneId { get; set; } = "Africa/Cairo";
    }
}
