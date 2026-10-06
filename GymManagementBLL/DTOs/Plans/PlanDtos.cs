namespace GymManagementBLL.DTOs.Plans
{
    public sealed record PlanResponse(
        int Id,
        string Name,
        string Description,
        int DurationDays,
        decimal Price,
        bool IsActive,
        DateTime CreatedAt,
        DateTime? UpdatedAt);

    public sealed record CreatePlanRequest(
        string Name,
        string Description,
        int DurationDays,
        decimal Price);

    public sealed record UpdatePlanRequest(
        string Name,
        string Description,
        int DurationDays,
        decimal Price);

    public sealed record SetPlanStatusRequest(bool IsActive);
}
