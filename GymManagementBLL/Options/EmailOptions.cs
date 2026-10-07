using System.ComponentModel.DataAnnotations;

namespace GymManagementBLL.Options
{
    /// <summary>
    /// What the app's emails contain: links to the frontend and how long links work.
    /// Read from the "Email" config section. (Times in emails use the gym time zone: see GymOptions.)
    /// </summary>
    public sealed class EmailOptions
    {
        public const string SectionName = "Email";

        /// <summary>The Next.js site. Links look like {FrontendBaseUrl}/reset-password?email=...&amp;token=...</summary>
        [Required, Url]
        public string FrontendBaseUrl { get; set; } = "http://localhost:3000";

        [Required]
        public string GymName { get; set; } = "Gym Management";

        /// <summary>A password reset link works for this many minutes (and only once).</summary>
        [Range(5, 1440)]
        public int ResetPasswordLinkMinutes { get; set; } = 60;

        /// <summary>An invite link (set your first password) works for this many days.</summary>
        [Range(1, 30)]
        public int InviteLinkDays { get; set; } = 3;
    }
}
