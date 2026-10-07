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
    /// Returned when a login account is created (or the invite is sent again) for a trainer.
    /// The trainer gets an invite email and chooses their own password; nobody else ever knows it.
    /// InviteSent = false means the email could not be sent (try again later).
    /// </summary>
    public sealed record TrainerWithAccountResponse(TrainerResponse Trainer, bool InviteSent);

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
