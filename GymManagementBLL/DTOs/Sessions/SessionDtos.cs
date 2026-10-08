using GymManagementDAL.Entities.Enums;

namespace GymManagementBLL.DTOs.Sessions
{
    /// <summary>
    /// The session's state, calculated from its status and times (UTC), not stored.
    /// </summary>
    public enum SessionState
    {
        Upcoming = 0,
        Ongoing = 1,
        Completed = 2,
        Cancelled = 3
    }

    public sealed record SessionResponse(
        int Id,
        string Description,
        int Capacity,
        int BookedCount,
        int AvailableSlots,
        DateTime StartDate,
        DateTime EndDate,
        SessionState State,
        string? CancelReason,
        int CategoryId,
        string CategoryName,
        int TrainerId,
        string TrainerName,
        DateTime CreatedAt);

    /// <summary>Used for create and update. Times must be UTC (ending with "Z").</summary>
    public sealed record SaveSessionRequest(
        string Description,
        int Capacity,
        DateTime StartDate,
        DateTime EndDate,
        int CategoryId,
        int TrainerId);

    /// <summary>The reason is emailed to every booked member and shown on the session.</summary>
    public sealed record CancelSessionRequest(string Reason);

    /// <summary>Filters for the sessions list ([FromQuery]).</summary>
    public sealed class SessionQuery
    {
        public SessionState? State { get; set; }

        /// <summary>Sessions starting on or after this time (UTC).</summary>
        public DateTime? From { get; set; }

        /// <summary>Sessions starting before this time (UTC).</summary>
        public DateTime? To { get; set; }

        public int? TrainerId { get; set; }
        public int? CategoryId { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>One booking in a session's attendance list.</summary>
    public sealed record SessionBookingItem(
        int BookingId,
        int MemberId,
        string MemberName,
        string MemberPhone,
        BookingStatus Status,
        DateTime BookedAt);

    /// <summary>A member who can be booked into a session (for the admin's dropdown).</summary>
    public sealed record AvailableMemberItem(int Id, string Name, string Phone);
}
