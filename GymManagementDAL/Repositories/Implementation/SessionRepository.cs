using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementDAL.Repositories.Implementation
{
    public class SessionRepository : GenericRepository<Session>, ISessionRepository
    {
        private readonly GymDbContext _dbContext;

        public SessionRepository(GymDbContext dbContext):base(dbContext)
        {
           _dbContext = dbContext;
        }
        public IEnumerable<Session> GetAllWithCategoryAndTrainer()
        {
            return _dbContext.Sessions
                 .Include(X => X.Category)
                 .Include(X => X.Trainer)
                 .ToList();
        }

        public Session? GetByIdWithTrainerAndCategory(int sessionId)
        {
            return _dbContext.Sessions
                .Include(X => X.Category)
                .Include(X => X.Trainer).FirstOrDefault(X=>X.Id== sessionId);
        }

        public int GetCountOfBookedSlots(int sessionId)
        {
          return _dbContext.MemberSessions.Count(X=>X.SessionId == sessionId);  
        }
    }
}
