using FluentValidation;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Analytics;
using GymManagementBLL.DTOs.CheckIns;

namespace GymManagementBLL.Validators.Reports
{
    /// <summary>Limits that keep report queries small (a chart with 5 years of days is not useful anyway).</summary>
    public static class ReportLimits
    {
        public const int MaxRangeDays = 366;
        public const int MaxMonths = 36;
        public const int MaxTopCategories = 20;
        public const int CheckInCodeMaxLength = 64;

        /// <summary>
        /// Report ranges: From and To are sent together (or both left empty for the default range),
        /// To is not before From, and the range is at most <paramref name="maxDays"/> days.
        /// </summary>
        public static void DateRange<T>(AbstractValidator<T> validator, Func<T, DateOnly?> getFrom, Func<T, DateOnly?> getTo, int maxDays)
        {
            validator.RuleFor(x => x).Custom((query, context) =>
            {
                var from = getFrom(query);
                var to = getTo(query);

                if (from.HasValue != to.HasValue)
                    context.AddFailure("To", "Send both From and To, or neither (default range).");
                else if (from is null || to is null)
                    return; // default range
                else if (to < from)
                    context.AddFailure("To", "To must be on or after From.");
                else if (to.Value.DayNumber - from.Value.DayNumber >= maxDays)
                    context.AddFailure("To", "The range can cover at most " + maxDays + " days.");
            });
        }
    }

    public sealed class CheckInRequestValidator : AbstractValidator<CheckInRequest>
    {
        public CheckInRequestValidator()
        {
            RuleFor(x => x.Code).NotEmpty().MaximumLength(ReportLimits.CheckInCodeMaxLength);
        }
    }

    public sealed class CheckInQueryValidator : AbstractValidator<CheckInQuery>
    {
        public CheckInQueryValidator()
        {
            // The log is a normal list, so one side of the range alone is fine here.
            RuleFor(x => x.To).GreaterThanOrEqualTo(x => x.From).When(x => x.From is not null && x.To is not null);
            RuleFor(x => x.MemberId).GreaterThan(0).When(x => x.MemberId is not null);
            RuleFor(x => x.Result).IsInEnum();
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, PaginationExtensions.MaxPageSize);
        }
    }

    public sealed class RevenueQueryValidator : AbstractValidator<RevenueQuery>
    {
        public RevenueQueryValidator()
        {
            RuleFor(x => x.Period).IsInEnum();

            // Monthly charts may cover up to 36 months, daily charts up to 366 days.
            ReportLimits.DateRange(this, x => x.From, x => x.To, ReportLimits.MaxMonths * 31);

            RuleFor(x => x)
                .Must(x => x.To!.Value.DayNumber - x.From!.Value.DayNumber < ReportLimits.MaxRangeDays)
                .When(x => x.Period == RevenuePeriod.Daily && x.From is not null && x.To is not null)
                .OverridePropertyName("To")
                .WithMessage("A daily report can cover at most " + ReportLimits.MaxRangeDays + " days (use Period=Monthly for longer ranges).");
        }
    }

    public sealed class DateRangeQueryValidator : AbstractValidator<DateRangeQuery>
    {
        public DateRangeQueryValidator()
        {
            ReportLimits.DateRange(this, x => x.From, x => x.To, ReportLimits.MaxRangeDays);
        }
    }

    public sealed class MembersGrowthQueryValidator : AbstractValidator<MembersGrowthQuery>
    {
        public MembersGrowthQueryValidator()
        {
            RuleFor(x => x.Months).InclusiveBetween(1, ReportLimits.MaxMonths);
        }
    }

    public sealed class TopCategoriesQueryValidator : AbstractValidator<TopCategoriesQuery>
    {
        public TopCategoriesQueryValidator()
        {
            ReportLimits.DateRange(this, x => x.From, x => x.To, ReportLimits.MaxRangeDays);
            RuleFor(x => x.Take).InclusiveBetween(1, ReportLimits.MaxTopCategories);
        }
    }
}
