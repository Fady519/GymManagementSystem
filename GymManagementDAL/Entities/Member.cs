namespace GymManagementDAL.Entities
{
    public class Member : GymUser
    {
        /// <summary>File name of the profile photo (optional).</summary>
        public string? Photo { get; set; }

        /// <summary>The login account of this member (AspNetUsers.Id). Null until the member has an account.</summary>
        public int? UserId { get; set; }

        /// <summary>
        /// The secret code inside the member's QR (32 random hex characters). The database fills it
        /// for every new member; the member can ask for a new one if the old one was shared.
        /// </summary>
        public string CheckInToken { get; set; } = null!;

        /// <summary>Optional health data (separate table, one-to-one).</summary>
        public HealthRecord? HealthRecord { get; set; }

        public ICollection<Membership> Memberships { get; set; } = new List<Membership>();
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}
