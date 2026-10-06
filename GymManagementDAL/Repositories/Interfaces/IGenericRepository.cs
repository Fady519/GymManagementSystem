using GymManagementDAL.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementDAL.Repositories.Interfaces
{
    public interface IGenericRepository<TEntity> where TEntity:BaseEntity,new()
    {
        TEntity? GetById(int id);

        IEnumerable<TEntity> GetAll(Func<TEntity,bool>? condition=null);

        void Add(TEntity entity);

        void Update(TEntity entity);

        void Delete(TEntity entity);

        #region Async API (Expression-based, translated to SQL)

        Task<TEntity?> GetByIdAsync(int id, CancellationToken ct = default);

        Task<IReadOnlyList<TEntity>> ListAsync(Expression<Func<TEntity, bool>>? predicate = null, CancellationToken ct = default);

        Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default);

        #endregion

    }
}
