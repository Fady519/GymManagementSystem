using FluentValidation;
using GymManagementBLL.Abstractions;
using GymManagementBLL.DTOs.Auth;
using GymManagementBLL.DTOs.Users;

namespace GymManagementBLL.Validators.Auth
{
    /// <summary>Rules shared by several requests (and kept in sync with the Identity options in Program).</summary>
    internal static class AuthRules
    {
        public const int PasswordMin = 8;
        public const int PasswordMax = 100;
        public const int NameMin = 2;
        public const int NameMax = 50;
        public const int EmailMax = 100;

        /// <summary>Egyptian mobile: 010 / 011 / 012 / 015 + 8 digits (same rule as the database check constraint).</summary>
        public const string EgyptianPhonePattern = "^01[0125][0-9]{8}$";

        public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rule) =>
            rule.NotEmpty()
                .Length(PasswordMin, PasswordMax)
                .Matches("[A-Z]").WithMessage("Password must contain an uppercase letter.")
                .Matches("[a-z]").WithMessage("Password must contain a lowercase letter.")
                .Matches("[0-9]").WithMessage("Password must contain a digit.");

        public static IRuleBuilderOptions<T, string> ValidEmail<T>(this IRuleBuilder<T, string> rule) =>
            rule.NotEmpty().MaximumLength(EmailMax).EmailAddress();
    }

    public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
    {
        public RegisterRequestValidator(IClock clock)
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            var today = DateOnly.FromDateTime(clock.UtcNow);

            RuleFor(x => x.Name).NotEmpty().Length(AuthRules.NameMin, AuthRules.NameMax);
            RuleFor(x => x.Email).ValidEmail();
            RuleFor(x => x.Phone).NotEmpty().Matches(AuthRules.EgyptianPhonePattern)
                .WithMessage("Phone must be an Egyptian mobile number (e.g. 01012345678).");
            RuleFor(x => x.Password).StrongPassword();
            RuleFor(x => x.DateOfBirth)
                .LessThanOrEqualTo(today.AddYears(-12)).WithMessage("You must be at least 12 years old.")
                .GreaterThan(today.AddYears(-100)).WithMessage("Please enter a valid date of birth.");
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

            RuleFor(x => x.FullName).NotEmpty().Length(AuthRules.NameMin, AuthRules.NameMax);
            RuleFor(x => x.Email).ValidEmail();
        }
    }
}
