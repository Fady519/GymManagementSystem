using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore.Storage;

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

        /// <summary>
        /// Starts a database transaction for work that needs more than one SaveChanges
        /// (e.g. register = create the login account + create the member). Use it with
        /// <c>await using</c> and call CommitAsync at the end; if anything fails before that, all of it is rolled back.
        /// </summary>
        Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default);

        /// <summary>
        /// Forgets every loaded / pending entity. Used before retrying after a concurrency
        /// conflict, so the retry reads fresh data from the database.
        /// </summary>
        void DiscardChanges();
    }
}
