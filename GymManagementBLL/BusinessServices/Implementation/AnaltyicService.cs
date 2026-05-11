using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models;
using GymManagementDAL.Entities;
using GymManagementDAL.UnitOfWorkPattern;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class AnaltyicService : IAnaltyicService
    {
        private readonly IUnitOfWork _unitOfWork;

        public AnaltyicService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }
        public HomeAnalyticsViewModel GetHomeAnalyticsService()
        {
            var sessions = _unitOfWork.GetRepository<Session>().GetAll();
            return new HomeAnalyticsViewModel()
            {
                TotalMembers = _unitOfWork.GetRepository<Member>().GetAll().Count(),
                TotalTrainers = _unitOfWork.GetRepository<Trainer>().GetAll().Count(),
                ActiveMembers = _unitOfWork.GetRepository<Membership>().GetAll(X => X.Status == "Active").Count(),
                UpcomingSessions = sessions.Count(X => X.StartDate > DateTime.Now),
                OngoingSessions = sessions.Count(x => x.StartDate <= DateTime.Now && x.EndDate >= x.EndDate),
                CompletedSessions = sessions.Count(X => X.EndDate < DateTime.Now)

            };
        }
    }
}
