namespace GymManagementDAL.Entities
{
    /// <summary>
    /// Common columns for every table. CreatedAt / UpdatedAt are filled automatically
    /// (in UTC) by GymDbContext.SaveChangesAsync, so services never set them by hand.
    /// </summary>
    public abstract class BaseEntity
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// Marks an entity as "soft deletable": deleting it only sets IsDeleted = true
    /// instead of removing the row, so history (memberships, payments, reports) is kept.
    /// Soft-deleted rows are hidden from all queries by a global query filter.
    /// </summary>
    public interface ISoftDeletable
    {
        bool IsDeleted { get; set; }
        DateTime? DeletedAt { get; set; }
    }
}
