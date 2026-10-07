namespace GymManagementDAL.Entities
{
    public class Trainer : GymUser
    {
        /// <summary>The trainer's speciality (was a fixed enum before; now admins can add categories).</summary>
        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;

        /// <summary>The login account of this trainer (AspNetUsers.Id). Null until an admin creates one.</summary>
        public int? UserId { get; set; }

        public ICollection<Session> Sessions { get; set; } = new List<Session>();
    }
}
