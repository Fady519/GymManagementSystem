namespace GymManagementDAL.Entities
{
    public class Category : BaseEntity, ISoftDeletable
    {
        public string Name { get; set; } = null!;

        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }

        public ICollection<Session> Sessions { get; set; } = new List<Session>();

        /// <summary>Trainers whose speciality is this category.</summary>
        public ICollection<Trainer> Trainers { get; set; } = new List<Trainer>();
    }
}
