namespace GymManagementDAL.Entities
{
    /// <summary>
    /// The gym's own details shown on the public website (name, contact, address, opening hours).
    /// There is always exactly ONE row (Id = 1): it is created by the AddGymSettings migration
    /// and admins can only edit it, never add or delete rows.
    /// </summary>
    public class GymSettings : BaseEntity
    {
        /// <summary>The Id of the only row.</summary>
        public const int SingletonId = 1;

        public string GymName { get; set; } = null!;

        public string Phone { get; set; } = null!;
        public string? WhatsApp { get; set; }
        public string Email { get; set; } = null!;

        // Stored once, exactly as the admin typed it (any language). Switching the website
        // language only changes the UI labels, never this value.
        public string Address { get; set; } = null!;

        public string? MapUrl { get; set; }
        public string? FacebookUrl { get; set; }
        public string? InstagramUrl { get; set; }

        /// <summary>Opening hours from Saturday to Thursday (gym local time).</summary>
        public TimeOnly WeekdayOpensAt { get; set; }
        public TimeOnly WeekdayClosesAt { get; set; }

        /// <summary>Friday hours (gym local time). Both null = closed on Friday.</summary>
        public TimeOnly? FridayOpensAt { get; set; }
        public TimeOnly? FridayClosesAt { get; set; }
    }
}
