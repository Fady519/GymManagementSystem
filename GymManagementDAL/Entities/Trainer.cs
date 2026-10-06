using GymManagementDAL.Entities.Enums;

namespace GymManagementDAL.Entities
{
    public class Trainer : GymUser
    {
        // B4: replaced by a link to Category.
        public Specialities Specialities { get; set; }

        /// <summary>The login account of this trainer (AspNetUsers.Id). Null until an admin creates one.</summary>
        public int? UserId { get; set; }

        public ICollection<Session> Sessions { get; set; } = new List<Session>();
    }
}
