using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;

namespace GymManagementDAL.UnitOfWorkPattern
{
    /// <summary>
    /// Gives access to the repositories and saves all their changes together
    /// in one database transaction (SaveChangesAsync).
    /// </summary>
    public interface IUnitOfWork
    {
        IGenericRepository<TEntity> GetRepository<TEntity>() where TEntity : BaseEntity;

        Task<int> SaveChangesAsync(CancellationToken ct = default);
    }
}
