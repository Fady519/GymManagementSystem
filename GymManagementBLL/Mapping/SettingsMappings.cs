using GymManagementBLL.DTOs.Settings;
using GymManagementDAL.Entities;

namespace GymManagementBLL.Mapping
{
    /// <summary>Explicit entity → DTO mapping for the gym settings.</summary>
    public static class SettingsMappings
    {
        public static GymSettingsResponse ToResponse(this GymSettings settings) => new(
            settings.GymName,
            settings.Phone,
            settings.WhatsApp,
            settings.Email,
            settings.Address,
            settings.MapUrl,
            settings.FacebookUrl,
            settings.InstagramUrl,
            settings.WeekdayOpensAt,
            settings.WeekdayClosesAt,
            settings.FridayOpensAt,
            settings.FridayClosesAt,
            settings.UpdatedAt);
    }
}
