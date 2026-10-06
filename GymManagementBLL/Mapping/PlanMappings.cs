using GymManagementBLL.DTOs.Plans;
using GymManagementDAL.Entities;

namespace GymManagementBLL.Mapping
{
    /// <summary>
    /// Explicit entity → DTO mapping for plans (no reflection, compile-time checked).
    /// </summary>
    public static class PlanMappings
    {
        public static PlanResponse ToResponse(this Plan plan) => new(
            plan.Id,
            plan.Name,
            plan.Description,
            plan.DurationDays,
            plan.Price,
            plan.IsActive,
            plan.CreatedAt,
            plan.UpdatedAt);
    }
}
