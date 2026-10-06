namespace GymManagementDAL.Entities
{
    public class Plan : BaseEntity, ISoftDeletable
    {
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; }

        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }

        public ICollection<Membership> Memberships { get; set; } = new List<Membership>();
    }
}
