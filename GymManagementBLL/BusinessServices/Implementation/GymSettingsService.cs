using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Settings;
using GymManagementBLL.Mapping;
using GymManagementBLL.Validators.Settings;
using GymManagementDAL.Entities;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.BusinessServices.Implementation
{
    /// <summary>
    /// Reads and edits the single GymSettings row (Id = 1). The row is created by the
    /// AddGymSettings migration, so it always exists; a missing row means the database is not migrated.
    /// </summary>
    public class GymSettingsService : IGymSettingsService
    {
        private readonly IUnitOfWork _unitOfWork;

        public GymSettingsService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<GymSettingsResponse> GetAsync(CancellationToken ct = default)
        {
            // Query() = read-only (no tracking).
            var settings = await _unitOfWork.GetRepository<GymSettings>().Query()
                .FirstOrDefaultAsync(s => s.Id == GymSettings.SingletonId, ct)
                ?? throw MissingRow();

            return settings.ToResponse();
        }

        public async Task<Result<GymSettingsResponse>> UpdateAsync(UpdateGymSettingsRequest request, CancellationToken ct = default)
        {
            // The validator already checked the request (400 if invalid). Here we only clean and save.
            var settings = await _unitOfWork.GetRepository<GymSettings>().GetByIdAsync(GymSettings.SingletonId, ct)
                ?? throw MissingRow();

            // Required texts are trimmed; optional ones become null when empty
            // (e.g. no Instagram link = the website hides the Instagram icon).
            settings.GymName = request.GymName.Trim();
            settings.Phone = request.Phone.Trim();
            settings.WhatsApp = GymSettingsRules.Clean(request.WhatsApp);
            settings.Email = request.Email.Trim();
            settings.Address = request.Address.Trim();
            settings.MapUrl = GymSettingsRules.Clean(request.MapUrl);
            settings.FacebookUrl = GymSettingsRules.Clean(request.FacebookUrl);
            settings.InstagramUrl = GymSettingsRules.Clean(request.InstagramUrl);
            settings.WeekdayOpensAt = request.WeekdayOpensAt;
            settings.WeekdayClosesAt = request.WeekdayClosesAt;
            settings.FridayOpensAt = request.FridayOpensAt;
            settings.FridayClosesAt = request.FridayClosesAt;

            // SaveChanges fills UpdatedAt (only when something really changed).
            await _unitOfWork.SaveChangesAsync(ct);

            return settings.ToResponse();
        }

        private static InvalidOperationException MissingRow()
            => new("The GymSettings row (Id = 1) is missing. Run the database migrations (AddGymSettings creates it).");
    }
}
