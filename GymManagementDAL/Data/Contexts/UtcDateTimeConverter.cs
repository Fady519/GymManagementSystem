using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace GymManagementDAL.Data.Contexts
{
    /// <summary>
    /// Saves DateTime values as they are (UTC) and marks values read from the
    /// database as <see cref="DateTimeKind.Utc"/>. Nullable DateTime? uses it automatically.
    /// </summary>
    internal sealed class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
    {
        public UtcDateTimeConverter()
            : base(
                toDatabase => toDatabase.Kind == DateTimeKind.Local ? toDatabase.ToUniversalTime() : toDatabase,
                fromDatabase => DateTime.SpecifyKind(fromDatabase, DateTimeKind.Utc))
        {
        }
    }
}
