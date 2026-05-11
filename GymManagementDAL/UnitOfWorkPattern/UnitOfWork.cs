using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Implementation;
using GymManagementDAL.Repositories.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementDAL.UnitOfWorkPattern
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly Dictionary<Type, object> _repositories = new();
        private readonly GymDbContext _dbContext;
        public UnitOfWork(GymDbContext dbContext,ISessionRepository sessionRepository,
            IMembershipRepository membershipRepository, IBookingRepository bookingRepository)
        {
            _dbContext = dbContext;
            SessionRepository = sessionRepository;
            MembershipRepository = membershipRepository;
            BookingRepository = bookingRepository;
        }

        public ISessionRepository SessionRepository { get; }

        public IMembershipRepository MembershipRepository { get; }

        public IBookingRepository BookingRepository { get; }

        public IGenericRepository<TEntity> GetRepository<TEntity>() where TEntity : BaseEntity, new()
        {

            var entityType=typeof(TEntity);  // DAL.Entities.Member


            if (_repositories.TryGetValue(entityType, out var repository))
                return (IGenericRepository<TEntity>)repository;

            var newRepo = new GenericRepository<TEntity>(_dbContext);

            _repositories[entityType]= newRepo;

            return newRepo;

        }

        public int SaveChanges()
        {
            return _dbContext.SaveChanges();
        }
    }
}
