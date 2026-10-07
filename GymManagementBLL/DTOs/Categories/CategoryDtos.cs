namespace GymManagementBLL.DTOs.Categories
{
    public sealed record CategoryResponse(int Id, string Name, int TrainersCount, DateTime CreatedAt);

    public sealed record SaveCategoryRequest(string Name);
}
