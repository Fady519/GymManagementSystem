using FluentValidation;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Memberships;
using GymManagementBLL.DTOs.Payments;
using GymManagementBLL.Options;
using Microsoft.Extensions.Options;

namespace GymManagementBLL.Validators.Memberships
{
    public sealed class CreateMembershipRequestValidator : AbstractValidator<CreateMembershipRequest>
    {
        public CreateMembershipRequestValidator()
        {
            RuleFor(x => x.MemberId).GreaterThan(0);
            RuleFor(x => x.PlanId).GreaterThan(0);
            RuleFor(x => x.PaymentMethod).IsInEnum();
            RuleFor(x => x.Notes).MaximumLength(500);
        }
    }

    public sealed class RenewMembershipRequestValidator : AbstractValidator<RenewMembershipRequest>
    {
        public RenewMembershipRequestValidator()
        {
            RuleFor(x => x.PlanId).GreaterThan(0).When(x => x.PlanId is not null);
            RuleFor(x => x.PaymentMethod).IsInEnum();
            RuleFor(x => x.Notes).MaximumLength(500);
        }
    }

    public sealed class CancelMembershipRequestValidator : AbstractValidator<CancelMembershipRequest>
    {
        public CancelMembershipRequestValidator()
        {
            // The upper limit (the amount paid) needs the database, so the service checks it.
            RuleFor(x => x.RefundAmount).GreaterThanOrEqualTo(0).When(x => x.RefundAmount is not null);

            RuleFor(x => x.RefundMethod)
                .NotNull().WithMessage("Choose how the refund is paid back.")
                .When(x => x.RefundAmount > 0);
            RuleFor(x => x.RefundMethod).IsInEnum().When(x => x.RefundMethod is not null);

            RuleFor(x => x.Reason).MaximumLength(200);
        }
    }

    public sealed class FreezeMembershipRequestValidator : AbstractValidator<FreezeMembershipRequest>
    {
        public FreezeMembershipRequestValidator(IOptions<MembershipRulesOptions> options)
        {
            var rules = options.Value;

            RuleFor(x => x.Days).InclusiveBetween(rules.MinFreezeDays, rules.MaxFreezeDays)
                .WithMessage($"A freeze lasts between {rules.MinFreezeDays} and {rules.MaxFreezeDays} days.");
            RuleFor(x => x.Reason).MaximumLength(200);
        }
    }

    public sealed class MembershipQueryValidator : AbstractValidator<MembershipQuery>
    {
        public MembershipQueryValidator()
        {
            RuleFor(x => x.State).IsInEnum();
            RuleFor(x => x.MemberId).GreaterThan(0).When(x => x.MemberId is not null);
            RuleFor(x => x.Search).MaximumLength(50);
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, PaginationExtensions.MaxPageSize);
        }
    }

    public sealed class ExpiringSoonQueryValidator : AbstractValidator<ExpiringSoonQuery>
    {
        public ExpiringSoonQueryValidator()
        {
            RuleFor(x => x.Days).InclusiveBetween(1, 60).When(x => x.Days is not null);
        }
    }

    public sealed class PaymentQueryValidator : AbstractValidator<PaymentQuery>
    {
        public PaymentQueryValidator()
        {
            RuleFor(x => x.Method).IsInEnum();
            RuleFor(x => x.Type).IsInEnum();
            RuleFor(x => x.MemberId).GreaterThan(0).When(x => x.MemberId is not null);
            RuleFor(x => x.To).GreaterThan(x => x.From).When(x => x.From is not null && x.To is not null);
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, PaginationExtensions.MaxPageSize);
        }
    }
}
