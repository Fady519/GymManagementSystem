namespace GymManagementBLL.DTOs.Common
{
    /// <summary>Optional address (owned columns on Members / Trainers).</summary>
    public sealed record AddressDto(int BuildingNumber, string Street, string City);

    /// <summary>Member health data. Height in cm, weight in kg.</summary>
    public sealed record HealthRecordDto(decimal Height, decimal Weight, string BloodType, string? Note);
}
