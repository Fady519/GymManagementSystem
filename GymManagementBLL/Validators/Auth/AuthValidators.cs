using FluentValidation;
using GymManagementBLL.Abstractions;
using GymManagementBLL.DTOs.Auth;
using GymManagementBLL.DTOs.Users;
using GymManagementBLL.Validators.Common;

namespace GymManagementBLL.Validators.Auth
{
    public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
    {
        public RegisterRequestValidator(IClock clock)
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Name).PersonName();
            RuleFor(x => x.Email).ValidEmail();
            RuleFor(x => x.Phone).EgyptianPhone();
            RuleFor(x => x.Password).StrongPassword();
            RuleFor(x => x.DateOfBirth).Age(DateOnly.FromDateTime(clock.UtcNow), minAge: 12);
            RuleFor(x => x.Gender).IsInEnum();
        }
    }

    public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
    {
        public LoginRequestValidator()
        {
            RuleFor(x => x.Email).NotEmpty();
            RuleFor(x => x.Password).NotEmpty();
        }
    }

    public sealed class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
    {
        public ChangePasswordRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.CurrentPassword).NotEmpty();
            RuleFor(x => x.NewPassword).StrongPassword()
                .NotEqual(x => x.CurrentPassword).WithMessage("The new password must be different from the current one.");
        }
    }

    public sealed class CreateAdminRequestValidator : AbstractValidator<CreateAdminRequest>
    {
        public CreateAdminRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.FullName).PersonName();
            RuleFor(x => x.Email).ValidEmail();
        }
    }
}
