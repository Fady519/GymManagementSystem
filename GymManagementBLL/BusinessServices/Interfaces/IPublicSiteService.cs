using GymManagementBLL.DTOs.Public;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    /// <summary>
    /// Read-only data for the public landing page (no login). Every count runs in SQL,
    /// and nothing personal (email, phone, birth date, address) is ever returned.
    /// </summary>
    public interface IPublicSiteService
    {
        Task<PublicStatsResponse> GetStatsAsync(CancellationToken ct = default);
        Task<IReadOnlyList<PublicTrainerResponse>> GetTrainersAsync(CancellationToken ct = default);
    }
}
