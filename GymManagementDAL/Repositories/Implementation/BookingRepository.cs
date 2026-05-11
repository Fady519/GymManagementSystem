using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GymManagementDAL.Repositories.Implementation
{
    public class BookingRepository : GenericRepository<MemberSession>, IBookingRepository
    {
        private readonly GymDbContext _context;

        public BookingRepository(GymDbContext context) : base(context)
        {
            _context = context;
        }

        public IEnumerable<MemberSession> GetSessionById(int sessionId)
        {
            return _context.MemberSessions.Where(ms => ms.SessionId == sessionId)
                                          .Include(ms => ms.Member)
                                          .ToList();

        }
    }
}
