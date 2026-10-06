using GymManagementDAL.Entities;
using System.Linq.Expressions;

namespace GymManagementDAL.Repositories.Interfaces
{
    /// <summary>
    /// Simple data access for one entity type. Every filter is an Expression, so EF Core
    /// translates it to SQL (the filtering happens in the database, not in memory).
    /// For complex queries (Include, paging, projection to DTOs) use <see cref="Query"/>.
    /// </summary>
    public interface IGenericRepository<TEntity> where TEntity : BaseEntity
    {
        /// <summary>Returns a tracked entity (changes are saved by SaveChangesAsync), or null.</summary>
        Task<TEntity?> GetByIdAsync(int id, CancellationToken ct = default);

        /// <summary>Read-only list (no tracking).</summary>
        Task<IReadOnlyList<TEntity>> ListAsync(Expression<Func<TEntity, bool>>? predicate = null, CancellationToken ct = default);

        Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default);

        Task<int> CountAsync(Expression<Func<TEntity, bool>>? predicate = null, CancellationToken ct = default);

        /// <summary>A query you can extend with Where/Include/OrderBy/Select. Read-only (no tracking) by default.</summary>
        IQueryable<TEntity> Query(bool asTracking = false);

        void Add(TEntity entity);

        /// <summary>Deletes the entity. For soft-deletable entities this only sets IsDeleted = true.</summary>
        void Remove(TEntity entity);
    }
}
