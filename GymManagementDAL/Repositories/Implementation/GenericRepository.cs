using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementDAL.Repositories.Implementation
{
    public class GenericRepository<TEntity> : IGenericRepository<TEntity> where TEntity:BaseEntity, new()
    {
        private readonly GymDbContext _dbContext;

        public GenericRepository(GymDbContext dbContext)
        {
           _dbContext = dbContext;
        }
        public void Add(TEntity entity)
        {
            _dbContext.Set<TEntity>().Add(entity);

            
        }

        public void Delete(TEntity entity)
        {
           _dbContext.Set<TEntity>().Remove(entity);
           
        }

        public IEnumerable<TEntity> GetAll(Func<TEntity, bool>? condition = null)
        {
            if(condition is null)
                return _dbContext.Set<TEntity>().AsNoTracking().ToList();
            else
                return _dbContext.Set<TEntity>().AsNoTracking().Where(condition).ToList();
        }

        public TEntity? GetById(int id)=>_dbContext.Set<TEntity>().Find(id);
       

        public void Update(TEntity entity)
        {
            _dbContext.Set<TEntity>().Update(entity);
            
        }

        #region Async API

        public async Task<TEntity?> GetByIdAsync(int id, CancellationToken ct = default)
            => await _dbContext.Set<TEntity>().FindAsync([id], ct);

        public async Task<IReadOnlyList<TEntity>> ListAsync(Expression<Func<TEntity, bool>>? predicate = null, CancellationToken ct = default)
        {
            IQueryable<TEntity> query = _dbContext.Set<TEntity>().AsNoTracking();

            if (predicate is not null)
                query = query.Where(predicate);

            return await query.ToListAsync(ct);
        }

        public Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default)
            => _dbContext.Set<TEntity>().AnyAsync(predicate, ct);

        #endregion
    }
}
