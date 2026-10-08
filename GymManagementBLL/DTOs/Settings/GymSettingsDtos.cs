namespace GymManagementBLL.DTOs.Settings
{
    /// <summary>
    /// The gym's details for the public website and the admin "Gym settings" page.
    /// Times are gym local time ("HH:mm:ss"). Weekday = Saturday to Thursday.
    /// FridayOpensAt and FridayClosesAt are both null when the gym is closed on Friday.
    /// </summary>
    public sealed record GymSettingsResponse(
        string GymName,
        string Phone,
        string? WhatsApp,
        string Email,
        string Address,
        string? MapUrl,
        string? FacebookUrl,
        string? InstagramUrl,
        TimeOnly WeekdayOpensAt,
        TimeOnly WeekdayClosesAt,
        TimeOnly? FridayOpensAt,
        TimeOnly? FridayClosesAt,
        DateTime? UpdatedAt);

    /// <summary>
    /// Replaces all the settings. Texts are trimmed; an empty optional text (WhatsApp, URLs) is saved as null.
    /// Send both Friday times, or neither (= closed on Friday).
    /// </summary>
    public sealed record UpdateGymSettingsRequest(
        string GymName,
        string Phone,
        string? WhatsApp,
        string Email,
        string Address,
        string? MapUrl,
        string? FacebookUrl,
        string? InstagramUrl,
        TimeOnly WeekdayOpensAt,
        TimeOnly WeekdayClosesAt,
        TimeOnly? FridayOpensAt,
        TimeOnly? FridayClosesAt);
}
