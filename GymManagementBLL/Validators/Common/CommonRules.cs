using FluentValidation;
using GymManagementBLL.DTOs.Common;

namespace GymManagementBLL.Validators.Common
{
    /// <summary>
    /// Rules reused by many validators (members, trainers, register...), so a rule is written once.
    /// </summary>
    public static class CommonRules
    {
        public const int NameMin = 2;
        public const int NameMax = 50;
        public const int EmailMax = 100;
        public const int PasswordMin = 8;
        public const int PasswordMax = 100;

        /// <summary>Letters of any language (\p{L} = Arabic, English...), spaces, dot, apostrophe and dash.</summary>
        public const string NamePattern = @"^[\p{L}\s.'-]+$";

        /// <summary>Egyptian mobile: 010 / 011 / 012 / 015 + 8 digits (same rule as the database check constraint).</summary>
        public const string EgyptianPhonePattern = "^01[0125][0-9]{8}$";

        public static IRuleBuilderOptions<T, string> PersonName<T>(this IRuleBuilder<T, string> rule) =>
            rule.NotEmpty()
                .Length(NameMin, NameMax)
                .Matches(NamePattern).WithMessage("Name can only contain letters, spaces, dots, apostrophes and dashes.");

        public static IRuleBuilderOptions<T, string> ValidEmail<T>(this IRuleBuilder<T, string> rule) =>
            rule.NotEmpty().MaximumLength(EmailMax).EmailAddress();

        public static IRuleBuilderOptions<T, string> EgyptianPhone<T>(this IRuleBuilder<T, string> rule) =>
            rule.NotEmpty()
                .Matches(EgyptianPhonePattern).WithMessage("Phone must be an Egyptian mobile number (e.g. 01012345678).");

        /// <summary>Kept in sync with the Identity password options (AuthServiceCollectionExtensions).</summary>
        public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rule) =>
            rule.NotEmpty()
                .Length(PasswordMin, PasswordMax)
                .Matches("[A-Z]").WithMessage("Password must contain an uppercase letter.")
                .Matches("[a-z]").WithMessage("Password must contain a lowercase letter.")
                .Matches("[0-9]").WithMessage("Password must contain a digit.");

        /// <summary>Age between <paramref name="minAge"/> and 100 years, based on today's date.</summary>
        public static IRuleBuilderOptions<T, DateOnly> Age<T>(this IRuleBuilder<T, DateOnly> rule, DateOnly today, int minAge) =>
            rule.LessThanOrEqualTo(today.AddYears(-minAge)).WithMessage($"Age must be at least {minAge} years.")
                .GreaterThan(today.AddYears(-100)).WithMessage("Please enter a valid date of birth.");
    }

    public sealed class AddressDtoValidator : AbstractValidator<AddressDto>
    {
        public AddressDtoValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.BuildingNumber).InclusiveBetween(1, 9999);
            RuleFor(x => x.Street).NotEmpty().Length(2, 50);
            RuleFor(x => x.City).NotEmpty().Length(2, 30);
        }
    }

    public sealed class HealthRecordDtoValidator : AbstractValidator<HealthRecordDto>
    {
        public static readonly string[] BloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

        public HealthRecordDtoValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Height).InclusiveBetween(50, 250).WithMessage("Height must be between 50 and 250 cm.");
            RuleFor(x => x.Weight).InclusiveBetween(20, 300).WithMessage("Weight must be between 20 and 300 kg.");
            RuleFor(x => x.BloodType).NotEmpty()
                .Must(b => BloodTypes.Contains(b)).WithMessage("Blood type must be one of: " + string.Join(", ", BloodTypes) + ".");
            RuleFor(x => x.Note).MaximumLength(500);
        }
    }
}
