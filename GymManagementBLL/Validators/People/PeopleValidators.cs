using FluentValidation;
using GymManagementBLL.Abstractions;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Categories;
using GymManagementBLL.DTOs.Common;
using GymManagementBLL.DTOs.Members;
using GymManagementBLL.DTOs.Trainers;
using GymManagementBLL.Validators.Common;

namespace GymManagementBLL.Validators.People
{
    public sealed class SaveCategoryRequestValidator : AbstractValidator<SaveCategoryRequest>
    {
        public SaveCategoryRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().Length(2, 50);
        }
    }

    public sealed class SaveTrainerRequestValidator : AbstractValidator<SaveTrainerRequest>
    {
        public SaveTrainerRequestValidator(IClock clock)
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Name).PersonName();
            RuleFor(x => x.Email).ValidEmail();
            RuleFor(x => x.Phone).EgyptianPhone();
            RuleFor(x => x.DateOfBirth).Age(DateOnly.FromDateTime(clock.UtcNow), minAge: 18);
            RuleFor(x => x.Gender).IsInEnum();
            RuleFor(x => x.CategoryId).GreaterThan(0);
            RuleFor(x => x.Address!).SetValidator(new AddressDtoValidator()).When(x => x.Address is not null);
        }
    }

    public sealed class CreateMemberRequestValidator : AbstractValidator<CreateMemberRequest>
    {
        public CreateMemberRequestValidator(IClock clock)
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Name).PersonName();
            RuleFor(x => x.Email).ValidEmail();
            RuleFor(x => x.Phone).EgyptianPhone();
            RuleFor(x => x.DateOfBirth).Age(DateOnly.FromDateTime(clock.UtcNow), minAge: 12);
            RuleFor(x => x.Gender).IsInEnum();
            RuleFor(x => x.Address!).SetValidator(new AddressDtoValidator()).When(x => x.Address is not null);
            RuleFor(x => x.HealthRecord!).SetValidator(new HealthRecordDtoValidator()).When(x => x.HealthRecord is not null);
        }
    }

    public sealed class UpdateMemberRequestValidator : AbstractValidator<UpdateMemberRequest>
    {
        public UpdateMemberRequestValidator(IClock clock)
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Name).PersonName();
            RuleFor(x => x.Email).ValidEmail();
            RuleFor(x => x.Phone).EgyptianPhone();
            RuleFor(x => x.DateOfBirth).Age(DateOnly.FromDateTime(clock.UtcNow), minAge: 12);
            RuleFor(x => x.Gender).IsInEnum();
            RuleFor(x => x.Address!).SetValidator(new AddressDtoValidator()).When(x => x.Address is not null);
        }
    }

    public sealed class UpdateMyProfileRequestValidator : AbstractValidator<UpdateMyProfileRequest>
    {
        public UpdateMyProfileRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Phone).EgyptianPhone();
            RuleFor(x => x.Address!).SetValidator(new AddressDtoValidator()).When(x => x.Address is not null);
        }
    }

    public sealed class MemberQueryValidator : AbstractValidator<MemberQuery>
    {
        public MemberQueryValidator()
        {
            RuleFor(x => x.Search).MaximumLength(100);
            RuleFor(x => x.Gender).IsInEnum();
            RuleFor(x => x.MembershipState).IsInEnum();
            RuleFor(x => x.SortBy).IsInEnum();
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, PaginationExtensions.MaxPageSize);
        }
    }

    public sealed class TrainerQueryValidator : AbstractValidator<TrainerQuery>
    {
        public TrainerQueryValidator()
        {
            RuleFor(x => x.Search).MaximumLength(100);
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, PaginationExtensions.MaxPageSize);
        }
    }
}
