using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace GymManagementDAL.Repositories.Implementation
{
    public class GenericRepository<TEntity> : IGenericRepository<TEntity> where TEntity : BaseEntity
    {
        private readonly DbSet<TEntity> _set;

        public GenericRepository(GymDbContext dbContext)
        {
            _set = dbContext.Set<TEntity>();
        }

        public async Task<TEntity?> GetByIdAsync(int id, CancellationToken ct = default)
            => await _set.FirstOrDefaultAsync(e => e.Id == id, ct);

        public async Task<IReadOnlyList<TEntity>> ListAsync(Expression<Func<TEntity, bool>>? predicate = null, CancellationToken ct = default)
        {
            var query = _set.AsNoTracking();

            if (predicate is not null)
                query = query.Where(predicate);

            return await query.ToListAsync(ct);
        }

        public Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default)
            => _set.AnyAsync(predicate, ct);

        public Task<int> CountAsync(Expression<Func<TEntity, bool>>? predicate = null, CancellationToken ct = default)
            => predicate is null ? _set.CountAsync(ct) : _set.CountAsync(predicate, ct);

        public IQueryable<TEntity> Query(bool asTracking = false)
            => asTracking ? _set : _set.AsNoTracking();

        public void Add(TEntity entity) => _set.Add(entity);

        public void Remove(TEntity entity) => _set.Remove(entity);
    }
}
