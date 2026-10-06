using Microsoft.AspNetCore.Identity;

namespace GymManagementDAL.Entities.Identity
{
    /// <summary>
    /// A login account (ASP.NET Core Identity). Identity already gives us Email, PasswordHash,
    /// lockout fields, etc. We only add what the gym needs.
    /// The person's gym data (phone, birth date...) stays in Members / Trainers, linked by UserId.
    /// </summary>
    public class ApplicationUser : IdentityUser<int>
    {
        /// <summary>Name shown in the app header. Copied from the member/trainer, or typed for admins.</summary>
        public string FullName { get; set; } = null!;

        /// <summary>Disabled users can't log in or refresh their token.</summary>
        public bool IsActive { get; set; } = true;

        /// <summary>True for accounts created with a temporary password (admins, trainers).</summary>
        public bool MustChangePassword { get; set; }

        public DateTime CreatedAt { get; set; }

        /// <summary>The user's role links (AspNetUserRoles). Lets us load users + roles in one query.</summary>
        public ICollection<IdentityUserRole<int>> UserRoles { get; set; } = new List<IdentityUserRole<int>>();
    }
}
