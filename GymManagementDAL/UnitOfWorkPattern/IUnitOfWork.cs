using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementDAL.UnitOfWorkPattern
{
    public interface IUnitOfWork
    {

        ISessionRepository SessionRepository { get; }
        IMembershipRepository MembershipRepository { get; }
        IBookingRepository BookingRepository { get; }

        IGenericRepository<TEntity> GetRepository<TEntity>()
            where TEntity : BaseEntity, new();

        int SaveChanges();
    }
}
