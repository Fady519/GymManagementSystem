using FluentValidation;
using GymManagementBLL.DTOs.Settings;
using GymManagementBLL.Validators.Common;
using System.Text.RegularExpressions;

namespace GymManagementBLL.Validators.Settings
{
    /// <summary>Limits and helpers for the gym settings (same lengths as the database columns).</summary>
    internal static class GymSettingsRules
    {
        public const int GymNameMax = 100;
        public const int AddressMax = 200;
        public const int MapUrlMax = 500;
        public const int SocialUrlMax = 300;

        /// <summary>
        /// A gym phone can be a landline or written in international format (e.g. +20 100 555 0199),
        /// so it can't use the members' "Egyptian mobile" rule: digits, spaces, + and -, 7–20 characters.
        /// </summary>
        public const string PhonePattern = @"^[0-9+\- ]{7,20}$";

        /// <summary>Trims the text; an empty text becomes null. The service saves the cleaned value.</summary>
        public static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        // The rules below check the TRIMMED text, because that is what the service saves.

        public static bool FitsIn(string value, int maxLength) => value.Trim().Length <= maxLength;

        public static bool IsPhone(string value) => Regex.IsMatch(value.Trim(), PhonePattern);

        /// <summary>Only absolute https links (no http, no "javascript:", no relative paths).</summary>
        public static bool IsHttpsUrl(string value)
            => Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps;
    }

    public sealed class UpdateGymSettingsRequestValidator : AbstractValidator<UpdateGymSettingsRequest>
    {
        private const string PhoneMessage = "Use only digits, spaces, + and - (7–20 characters).";
        private const string HttpsMessage = "Must be a full https:// link.";
        private const string FridayBothMessage = "Send both Friday times, or neither if the gym is closed on Friday.";

        public UpdateGymSettingsRequestValidator()
        {
            // Stop at the first failure, so Must() never calls Trim() on a missing text.
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.GymName).NotEmpty()
                .Must(v => GymSettingsRules.FitsIn(v, GymSettingsRules.GymNameMax))
                .WithMessage($"Gym name must be at most {GymSettingsRules.GymNameMax} characters.");

            RuleFor(x => x.Phone).NotEmpty()
                .Must(GymSettingsRules.IsPhone).WithMessage(PhoneMessage);

            // Optional: an empty WhatsApp is saved as null (no WhatsApp button on the website).
            RuleFor(x => x.WhatsApp!)
                .Must(GymSettingsRules.IsPhone).WithMessage(PhoneMessage)
                .When(x => !string.IsNullOrWhiteSpace(x.WhatsApp));

            RuleFor(x => x.Email).NotEmpty()
                .Must(v => GymSettingsRules.FitsIn(v, CommonRules.EmailMax))
                .WithMessage($"Email must be at most {CommonRules.EmailMax} characters.")
                .EmailAddress();

            RuleFor(x => x.AddressEn).NotEmpty()
                .Must(v => GymSettingsRules.FitsIn(v, GymSettingsRules.AddressMax))
                .WithMessage($"Address must be at most {GymSettingsRules.AddressMax} characters.");

            RuleFor(x => x.AddressAr).NotEmpty()
                .Must(v => GymSettingsRules.FitsIn(v, GymSettingsRules.AddressMax))
                .WithMessage($"Address must be at most {GymSettingsRules.AddressMax} characters.");

            // Optional links: empty is fine (saved as null); otherwise a full https URL.
            RuleFor(x => x.MapUrl!)
                .Must(v => GymSettingsRules.FitsIn(v, GymSettingsRules.MapUrlMax))
                .WithMessage($"The link must be at most {GymSettingsRules.MapUrlMax} characters.")
                .Must(GymSettingsRules.IsHttpsUrl).WithMessage(HttpsMessage)
                .When(x => !string.IsNullOrWhiteSpace(x.MapUrl));

            RuleFor(x => x.FacebookUrl!)
                .Must(v => GymSettingsRules.FitsIn(v, GymSettingsRules.SocialUrlMax))
                .WithMessage($"The link must be at most {GymSettingsRules.SocialUrlMax} characters.")
                .Must(GymSettingsRules.IsHttpsUrl).WithMessage(HttpsMessage)
                .When(x => !string.IsNullOrWhiteSpace(x.FacebookUrl));

            RuleFor(x => x.InstagramUrl!)
                .Must(v => GymSettingsRules.FitsIn(v, GymSettingsRules.SocialUrlMax))
                .WithMessage($"The link must be at most {GymSettingsRules.SocialUrlMax} characters.")
                .Must(GymSettingsRules.IsHttpsUrl).WithMessage(HttpsMessage)
                .When(x => !string.IsNullOrWhiteSpace(x.InstagramUrl));

            // Overnight hours (e.g. open until 02:00) are not supported: closing must be later the same day.
            RuleFor(x => x.WeekdayClosesAt)
                .GreaterThan(x => x.WeekdayOpensAt).WithMessage("The gym must close after it opens (Saturday to Thursday).");

            // Friday: both times (open that day) or neither (closed on Friday).
            RuleFor(x => x.FridayClosesAt)
                .NotNull().WithMessage(FridayBothMessage)
                .When(x => x.FridayOpensAt is not null);

            RuleFor(x => x.FridayOpensAt)
                .NotNull().WithMessage(FridayBothMessage)
                .When(x => x.FridayClosesAt is not null);

            RuleFor(x => x.FridayClosesAt)
                .GreaterThan(x => x.FridayOpensAt).WithMessage("The gym must close after it opens on Friday.")
                .When(x => x.FridayOpensAt is not null && x.FridayClosesAt is not null);
        }
    }
}
