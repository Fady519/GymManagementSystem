using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Categories;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface ICategoryService
    {
        Task<IReadOnlyList<CategoryResponse>> GetAllAsync(CancellationToken ct = default);
        Task<Result<CategoryResponse>> GetByIdAsync(int id, CancellationToken ct = default);
        Task<Result<CategoryResponse>> CreateAsync(SaveCategoryRequest request, CancellationToken ct = default);
        Task<Result<CategoryResponse>> UpdateAsync(int id, SaveCategoryRequest request, CancellationToken ct = default);
        Task<Result> DeleteAsync(int id, CancellationToken ct = default);
    }
}
