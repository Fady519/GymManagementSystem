using GymManagementBLL.Common;

namespace GymManagementBLL.Errors
{
    public static class MembershipErrors
    {
        public static Error NotFound(int id) =>
            Error.NotFound("Membership.NotFound", $"Membership with id {id} was not found.");

        public static Error MemberNotFound(int memberId) =>
            Error.Validation("Membership.MemberNotFound", $"Member with id {memberId} does not exist.");

        public static Error PlanNotFound(int planId) =>
            Error.Validation("Membership.PlanNotFound", $"Plan with id {planId} does not exist.");

        public static readonly Error PlanInactive =
            Error.Conflict("Membership.PlanInactive", "This plan is not offered anymore. Choose an active plan.");

        public static readonly Error AlreadyHasMembership =
            Error.Conflict("Membership.AlreadyHasMembership", "The member already has a running membership. Renew it instead.");

        public static readonly Error RenewalAlreadyQueued =
            Error.Conflict("Membership.RenewalAlreadyQueued", "The member already has a renewal waiting to start.");

        public static readonly Error HasQueuedRenewal =
            Error.Conflict("Membership.HasQueuedRenewal", "This membership has a renewal waiting after it. Cancel the renewal first.");

        public static readonly Error Cancelled =
            Error.Conflict("Membership.Cancelled", "This membership is cancelled.");

        public static readonly Error Expired =
            Error.Conflict("Membership.Expired", "This membership has already ended.");

        public static readonly Error NotActive =
            Error.Conflict("Membership.NotActive", "Only a running membership that is not frozen can be frozen.");

        public static readonly Error NotFrozen =
            Error.Conflict("Membership.NotFrozen", "This membership is not frozen.");

        public static Error FreezeLimitReached(int usedDays, int maxDays) =>
            Error.Conflict("Membership.FreezeLimitReached",
                $"A membership can be frozen for {maxDays} days in total. {usedDays} days are already used.");

        public static Error RefundTooHigh(decimal pricePaid) =>
            Error.Validation("Membership.RefundTooHigh", $"The refund can't be more than the amount paid ({pricePaid:0.00}).");
    }
}
