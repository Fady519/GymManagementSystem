using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Trainers;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface ITrainerService
    {
        Task<PagedResult<TrainerResponse>> GetAllAsync(TrainerQuery query, CancellationToken ct = default);
        Task<Result<TrainerResponse>> GetByIdAsync(int id, CancellationToken ct = default);

        /// <summary>Creates the trainer AND their login account (temporary password returned once).</summary>
        Task<Result<TrainerWithAccountResponse>> CreateAsync(SaveTrainerRequest request, CancellationToken ct = default);

        Task<Result<TrainerResponse>> UpdateAsync(int id, SaveTrainerRequest request, CancellationToken ct = default);
        Task<Result> DeleteAsync(int id, CancellationToken ct = default);

        /// <summary>For trainers added before accounts existed.</summary>
        Task<Result<TrainerWithAccountResponse>> CreateAccountAsync(int id, CancellationToken ct = default);
    }
}
