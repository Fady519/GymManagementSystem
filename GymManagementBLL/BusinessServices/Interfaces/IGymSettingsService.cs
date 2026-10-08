using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Settings;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    /// <summary>The gym's details (one row): read by the public website, edited by admins.</summary>
    public interface IGymSettingsService
    {
        Task<GymSettingsResponse> GetAsync(CancellationToken ct = default);
        Task<Result<GymSettingsResponse>> UpdateAsync(UpdateGymSettingsRequest request, CancellationToken ct = default);
    }
}
