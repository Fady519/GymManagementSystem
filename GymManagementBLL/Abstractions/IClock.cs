namespace GymManagementBLL.Abstractions
{
    /// <summary>
    /// Abstraction over the current time so business rules can be tested deterministically.
    /// All times are UTC.
    /// </summary>
    public interface IClock
    {
        DateTime UtcNow { get; }
    }

    public sealed class SystemClock : IClock
    {
        public DateTime UtcNow => DateTime.UtcNow;
    }
}
