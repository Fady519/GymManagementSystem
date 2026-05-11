using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GymManagementDAL.Repositories.Implementation
{
    public class MembershipRepository : GenericRepository<Membership>, IMembershipRepository
    {
        private readonly GymDbContext _context;

        public MembershipRepository(GymDbContext context) : base(context)
        {
           _context = context;
        }

        public IEnumerable<Membership> GetAllMembershipsWithMembersAndPlans(Func<Membership, bool>? filter = null)
        {
           var memberships = _context.Memberships.Include(m => m.Member).Include(m => m.Plan)
                           .Where(filter ?? (_ => true));

             return memberships;

        }

        public Membership? GetFirstOrDefault(Func<Membership, bool>? filter = null)
        {
            var membership = _context.Memberships.Include(m => m.Member).Include(m => m.Plan)
                            .FirstOrDefault(filter ?? (_ => true));
            return membership;
        }
    }
}
