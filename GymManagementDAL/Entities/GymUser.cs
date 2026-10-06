using GymManagementDAL.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace GymManagementDAL.Entities
{
    /// <summary>Shared personal data for members and trainers.</summary>
    public abstract class GymUser : BaseEntity, ISoftDeletable
    {
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public DateOnly DateOfBirth { get; set; }
        public Gender Gender { get; set; }

        /// <summary>Optional. Stored as columns of the same table (owned type).</summary>
        public Address? Address { get; set; }

        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
    }

    [Owned]
    public class Address
    {
        public int BuildingNumber { get; set; }
        public string Street { get; set; } = null!;
        public string City { get; set; } = null!;
    }
}
