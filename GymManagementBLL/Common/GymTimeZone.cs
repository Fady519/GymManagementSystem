using GymManagementBLL.Options;
using Microsoft.Extensions.Options;

namespace GymManagementBLL.Common
{
    /// <summary>
    /// Converts between UTC (what the database stores) and the gym's local time (what people mean
    /// by "today" or "this month"). Egypt has summer time, so the offset is not always +2:
    /// TimeZoneInfo knows the rules for every date.
    /// </summary>
    public sealed class GymTimeZone
    {
        public GymTimeZone(IOptions<GymOptions> options)
        {
            Zone = Find(options.Value.TimeZoneId)
                ?? throw new InvalidOperationException("Unknown time zone '" + options.Value.TimeZoneId + "' (Gym:TimeZoneId).");

            // SQL Server's AT TIME ZONE only understands Windows names (e.g. "Egypt Standard Time").
            SqlServerZoneId = Zone.HasIanaId && TimeZoneInfo.TryConvertIanaIdToWindowsId(Zone.Id, out var windowsId)
                ? windowsId
                : Zone.Id;
        }

        public TimeZoneInfo Zone { get; }

        /// <summary>The same zone with its Windows name, for SQL Server's AT TIME ZONE.</summary>
        public string SqlServerZoneId { get; }

        public DateTime ToLocal(DateTime utc)
            => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);

        /// <summary>The gym's calendar date at this UTC moment.</summary>
        public DateOnly LocalDate(DateTime utc) => DateOnly.FromDateTime(ToLocal(utc));

        /// <summary>The UTC moment when this local day starts (00:00 in the gym).</summary>
        public DateTime StartOfDayUtc(DateOnly day)
            => TimeZoneInfo.ConvertTimeToUtc(day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), Zone);

        /// <summary>Used at startup to check the setting (accepts IANA or Windows ids).</summary>
        public static TimeZoneInfo? Find(string id)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                return null;
            }
        }
    }
}
