using FluentValidation;
using GymManagementBLL.Abstractions;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Bookings;
using GymManagementBLL.DTOs.Sessions;
using GymManagementBLL.Options;
using Microsoft.Extensions.Options;

namespace GymManagementBLL.Validators.Sessions
{
    public sealed class SaveSessionRequestValidator : AbstractValidator<SaveSessionRequest>
    {
        public SaveSessionRequestValidator(IClock clock, IOptions<SessionRulesOptions> options)
        {
            var rules = options.Value;
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Description).NotEmpty().Length(2, 500);

            // H7 fix: the old form accepted 0; the database needs at least 1.
            RuleFor(x => x.Capacity).InclusiveBetween(1, rules.MaxCapacity);

            RuleFor(x => x.CategoryId).GreaterThan(0);
            RuleFor(x => x.TrainerId).GreaterThan(0);

            // UTC only, so "18:00" means the same thing on every server and browser.
            RuleFor(x => x.StartDate)
                .Must(d => d.Kind == DateTimeKind.Utc).WithMessage("Send the time in UTC, e.g. 2026-10-10T16:00:00Z.")
                .GreaterThan(_ => clock.UtcNow).WithMessage("The session must start in the future.");

            RuleFor(x => x.EndDate)
                .Must(d => d.Kind == DateTimeKind.Utc).WithMessage("Send the time in UTC, e.g. 2026-10-10T17:00:00Z.")
                .GreaterThan(x => x.StartDate).WithMessage("The session must end after it starts.");

            RuleFor(x => x)
                .Must(x => (x.EndDate - x.StartDate).TotalMinutes >= rules.MinDurationMinutes
                        && (x.EndDate - x.StartDate).TotalMinutes <= rules.MaxDurationMinutes)
                .OverridePropertyName("EndDate")
                .WithMessage($"A session lasts between {rules.MinDurationMinutes} minutes and {rules.MaxDurationMinutes / 60} hours.")
                .When(x => x.EndDate > x.StartDate);
        }
    }

    public sealed class SessionQueryValidator : AbstractValidator<SessionQuery>
    {
        public SessionQueryValidator()
        {
            RuleFor(x => x.State).IsInEnum();
            RuleFor(x => x.To).GreaterThan(x => x.From).When(x => x.From is not null && x.To is not null);
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, PaginationExtensions.MaxPageSize);
        }
    }

    public sealed class CreateBookingRequestValidator : AbstractValidator<CreateBookingRequest>
    {
        public CreateBookingRequestValidator()
        {
            RuleFor(x => x.SessionId).GreaterThan(0);
            RuleFor(x => x.MemberId).GreaterThan(0).When(x => x.MemberId is not null);
        }
    }
}
