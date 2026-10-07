using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Categories;
using GymManagementBLL.Errors;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class CategoryService : ICategoryService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IClock _clock;

        public CategoryService(IUnitOfWork unitOfWork, IClock clock)
        {
            _unitOfWork = unitOfWork;
            _clock = clock;
        }

        public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync(CancellationToken ct = default)
        {
            // Projection: SQL returns only these columns, and COUNT runs in the database.
            return await _unitOfWork.GetRepository<Category>().Query()
                .OrderBy(c => c.Name)
                .Select(c => new CategoryResponse(c.Id, c.Name, c.Trainers.Count(), c.CreatedAt))
                .ToListAsync(ct);
        }

        public async Task<Result<CategoryResponse>> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var category = await _unitOfWork.GetRepository<Category>().Query()
                .Where(c => c.Id == id)
                .Select(c => new CategoryResponse(c.Id, c.Name, c.Trainers.Count(), c.CreatedAt))
                .FirstOrDefaultAsync(ct);

            return category is null ? CategoryErrors.NotFound(id) : category;
        }

        public async Task<Result<CategoryResponse>> CreateAsync(SaveCategoryRequest request, CancellationToken ct = default)
        {
            var repo = _unitOfWork.GetRepository<Category>();
            var name = request.Name.Trim();

            if (await repo.AnyAsync(c => c.Name == name, ct))
                return CategoryErrors.NameTaken(name);

            var category = new Category { Name = name };
            repo.Add(category);
            await _unitOfWork.SaveChangesAsync(ct);

            return new CategoryResponse(category.Id, category.Name, 0, category.CreatedAt);
        }

        public async Task<Result<CategoryResponse>> UpdateAsync(int id, SaveCategoryRequest request, CancellationToken ct = default)
        {
            var repo = _unitOfWork.GetRepository<Category>();
            var category = await repo.GetByIdAsync(id, ct);

            if (category is null)
                return CategoryErrors.NotFound(id);

            var name = request.Name.Trim();
            if (await repo.AnyAsync(c => c.Id != id && c.Name == name, ct))
                return CategoryErrors.NameTaken(name);

            category.Name = name;
            await _unitOfWork.SaveChangesAsync(ct);

            return await GetByIdAsync(id, ct);
        }

        public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
        {
            var repo = _unitOfWork.GetRepository<Category>();
            var category = await repo.GetByIdAsync(id, ct);

            if (category is null)
                return CategoryErrors.NotFound(id);

            if (await _unitOfWork.GetRepository<Trainer>().AnyAsync(t => t.CategoryId == id, ct))
                return CategoryErrors.HasTrainers;

            var now = _clock.UtcNow;
            if (await _unitOfWork.GetRepository<Session>()
                    .AnyAsync(s => s.CategoryId == id && s.Status == SessionStatus.Scheduled && s.StartDate > now, ct))
                return CategoryErrors.HasUpcomingSessions;

            // Soft delete: past sessions keep showing their category name.
            repo.Remove(category);
            await _unitOfWork.SaveChangesAsync(ct);

            return Result.Success();
        }
    }
}
