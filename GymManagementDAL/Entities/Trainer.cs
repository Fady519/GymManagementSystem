using GymManagementDAL.Entities.Enums;

namespace GymManagementDAL.Entities
{
    public class Trainer : GymUser
    {
        // B4: replaced by a link to Category.
        public Specialities Specialities { get; set; }

        public ICollection<Session> Sessions { get; set; } = new List<Session>();
    }
}
