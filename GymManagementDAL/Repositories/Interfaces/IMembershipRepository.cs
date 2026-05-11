using GymManagementDAL.Entities;

namespace GymManagementDAL.Repositories.Interfaces
{
    public interface IMembershipRepository : IGenericRepository<Membership>
    {
        IEnumerable<Membership> GetAllMembershipsWithMembersAndPlans(Func<Membership, bool>? filter = null);
        Membership? GetFirstOrDefault(Func<Membership, bool>? filter = null);
    }
}
