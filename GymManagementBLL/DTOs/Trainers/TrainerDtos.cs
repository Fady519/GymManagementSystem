using GymManagementBLL.DTOs.Common;
using GymManagementDAL.Entities.Enums;

namespace GymManagementBLL.DTOs.Trainers
{
    public sealed record TrainerResponse(
        int Id,
        string Name,
        string Email,
        string Phone,
        DateOnly DateOfBirth,
        Gender Gender,
        AddressDto? Address,
        int CategoryId,
        string CategoryName,
        bool HasAccount,
        DateTime CreatedAt,
        DateTime? UpdatedAt);

    /// <summary>Used for create and update.</summary>
    public sealed record SaveTrainerRequest(
        string Name,
        string Email,
        string Phone,
        DateOnly DateOfBirth,
        Gender Gender,
        int CategoryId,
        AddressDto? Address);

    /// <summary>
    /// Returned when a login account is created for a trainer. The temporary password is shown
    /// only here (once); the trainer must change it at first login. (B7: it will be emailed.)
    /// </summary>
    public sealed record TrainerWithAccountResponse(TrainerResponse Trainer, string TemporaryPassword);

    /// <summary>Filters for the trainers list ([FromQuery]).</summary>
    public sealed class TrainerQuery
    {
        /// <summary>Part of the name, email or phone.</summary>
        public string? Search { get; set; }

        public int? CategoryId { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
