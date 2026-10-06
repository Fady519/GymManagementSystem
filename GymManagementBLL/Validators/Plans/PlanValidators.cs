using FluentValidation;
using GymManagementBLL.DTOs.Plans;

namespace GymManagementBLL.Validators.Plans
{
    internal static class PlanRules
    {
        public const int NameMin = 2;
        public const int NameMax = 50;
        public const int DescriptionMin = 5;
        public const int DescriptionMax = 200;
        public const int DurationMin = 1;
        public const int DurationMax = 365;
        public const decimal PriceMax = 100_000m;
    }

    public sealed class CreatePlanRequestValidator : AbstractValidator<CreatePlanRequest>
    {
        public CreatePlanRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Name).NotEmpty().Length(PlanRules.NameMin, PlanRules.NameMax);
            RuleFor(x => x.Description).NotEmpty().Length(PlanRules.DescriptionMin, PlanRules.DescriptionMax);
            RuleFor(x => x.DurationDays).InclusiveBetween(PlanRules.DurationMin, PlanRules.DurationMax);
            RuleFor(x => x.Price).GreaterThan(0).LessThanOrEqualTo(PlanRules.PriceMax).PrecisionScale(10, 2, true);
        }
    }

    public sealed class UpdatePlanRequestValidator : AbstractValidator<UpdatePlanRequest>
    {
        public UpdatePlanRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Name).NotEmpty().Length(PlanRules.NameMin, PlanRules.NameMax);
            RuleFor(x => x.Description).NotEmpty().Length(PlanRules.DescriptionMin, PlanRules.DescriptionMax);
            RuleFor(x => x.DurationDays).InclusiveBetween(PlanRules.DurationMin, PlanRules.DurationMax);
            RuleFor(x => x.Price).GreaterThan(0).LessThanOrEqualTo(PlanRules.PriceMax).PrecisionScale(10, 2, true);
        }
    }
}
