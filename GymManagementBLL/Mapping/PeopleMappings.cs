using GymManagementBLL.DTOs.Common;
using GymManagementBLL.DTOs.Members;
using GymManagementBLL.DTOs.Trainers;
using GymManagementDAL.Entities;

namespace GymManagementBLL.Mapping
{
    /// <summary>Explicit entity &lt;-&gt; DTO mapping for members and trainers (no reflection, compile-time checked).</summary>
    public static class PeopleMappings
    {
        public static AddressDto? ToDto(this Address? address)
            => address is null ? null : new AddressDto(address.BuildingNumber, address.Street, address.City);

        public static Address? ToEntity(this AddressDto? dto)
            => dto is null ? null : new Address { BuildingNumber = dto.BuildingNumber, Street = dto.Street.Trim(), City = dto.City.Trim() };

        public static HealthRecordDto? ToDto(this HealthRecord? record)
            => record is null ? null : new HealthRecordDto(record.Height, record.Weight, record.BloodType, record.Note);

        /// <summary>Copies the DTO values into a (new or existing) health record.</summary>
        public static void CopyTo(this HealthRecordDto dto, HealthRecord record)
        {
            record.Height = dto.Height;
            record.Weight = dto.Weight;
            record.BloodType = dto.BloodType;
            record.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
        }

        /// <summary>The trainer must be loaded with its Category.</summary>
        public static TrainerResponse ToResponse(this Trainer trainer) => new(
            trainer.Id,
            trainer.Name,
            trainer.Email,
            trainer.Phone,
            trainer.DateOfBirth,
            trainer.Gender,
            trainer.Address.ToDto(),
            trainer.CategoryId,
            trainer.Category.Name,
            trainer.UserId is not null,
            trainer.CreatedAt,
            trainer.UpdatedAt);

        /// <summary>The member must be loaded with its HealthRecord.</summary>
        public static MemberResponse ToResponse(this Member member, string? photoUrl, MemberMembershipState state) => new(
            member.Id,
            member.Name,
            member.Email,
            member.Phone,
            member.DateOfBirth,
            member.Gender,
            member.Address.ToDto(),
            photoUrl,
            member.HealthRecord.ToDto(),
            state,
            member.UserId is not null,
            member.CreatedAt,
            member.UpdatedAt);
    }
}
