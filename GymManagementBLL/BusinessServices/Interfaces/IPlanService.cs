using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Plans;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IPlanService
    {
        Task<IReadOnlyList<PlanResponse>> GetAllAsync(bool? isActive = null, CancellationToken ct = default);

        Task<Result<PlanResponse>> GetByIdAsync(int id, CancellationToken ct = default);

        Task<Result<PlanResponse>> CreateAsync(CreatePlanRequest request, CancellationToken ct = default);

        Task<Result<PlanResponse>> UpdateAsync(int id, UpdatePlanRequest request, CancellationToken ct = default);

        Task<Result<PlanResponse>> SetStatusAsync(int id, bool isActive, CancellationToken ct = default);

        Task<Result> DeleteAsync(int id, CancellationToken ct = default);
    }
}
