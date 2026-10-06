using GymManagementBLL.Common;

namespace GymManagementBLL.Errors
{
    public static class PlanErrors
    {
        public static Error NotFound(int id) =>
            Error.NotFound("Plan.NotFound", $"Plan with id {id} was not found.");

        public static Error NameTaken(string name) =>
            Error.Conflict("Plan.NameTaken", $"A plan named '{name}' already exists.");

        public static readonly Error HasActiveMemberships =
            Error.Conflict("Plan.HasActiveMemberships", "The plan cannot be edited while it has active memberships.");

        public static readonly Error HasMemberships =
            Error.Conflict("Plan.HasMemberships", "The plan cannot be deleted because it is used by memberships. Deactivate it instead.");
    }
}
