namespace GymManagementAPI.Infrastructure
{
    /// <summary>
    /// Authorization policy names. A policy = a named rule ("who may call this?").
    /// Controllers use [Authorize(Policy = AppPolicies.AdminAccess)] instead of repeating role lists.
    /// </summary>
    public static class AppPolicies
    {
        /// <summary>SuperAdmin only (manage admin accounts).</summary>
        public const string SuperAdminOnly = nameof(SuperAdminOnly);

        /// <summary>SuperAdmin or Admin (reception / back office).</summary>
        public const string AdminAccess = nameof(AdminAccess);

        /// <summary>Staff: SuperAdmin, Admin or Trainer.</summary>
        public const string TrainerAccess = nameof(TrainerAccess);

        /// <summary>Trainers only (trainer portal: "my sessions").</summary>
        public const string TrainerOnly = nameof(TrainerOnly);

        /// <summary>Members (member portal).</summary>
        public const string MemberAccess = nameof(MemberAccess);

        /// <summary>SuperAdmin, Admin (book for any member) or Member (book for himself).</summary>
        public const string BookingAccess = nameof(BookingAccess);

        /// <summary>Rate limiting policy for login / register / password links (protects against password guessing).</summary>
        public const string AuthRateLimit = "auth";

        /// <summary>
        /// Rate limiting policy for token refresh. Separate from <see cref="AuthRateLimit"/> because the
        /// web app calls refresh on every full page load, so it needs a higher limit than login.
        /// </summary>
        public const string RefreshRateLimit = "refresh";
    }
}
