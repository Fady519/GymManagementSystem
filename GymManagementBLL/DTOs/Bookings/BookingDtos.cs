using GymManagementDAL.Entities.Enums;

namespace GymManagementBLL.DTOs.Bookings
{
    /// <summary>
    /// Admins must send MemberId. Members don't need to: they always book for themselves
    /// (the member id is taken from their token, whatever they send).
    /// </summary>
    public sealed record CreateBookingRequest(int SessionId, int? MemberId);

    public sealed record BookingResponse(
        int Id,
        int SessionId,
        string SessionDescription,
        DateTime SessionStartDate,
        DateTime SessionEndDate,
        int MemberId,
        string MemberName,
        BookingStatus Status,
        DateTime CreatedAt);

    /// <summary>POST /api/me/bookings: a member books a session for himself (no MemberId to send at all).</summary>
    public sealed record BookSessionRequest(int SessionId);

    /// <summary>One row of a member's bookings (member portal and the admin's member profile).</summary>
    public sealed record MyBookingItem(
        int Id,
        int SessionId,
        string CategoryName,
        string SessionDescription,
        string TrainerName,
        DateTime SessionStartDate,
        DateTime SessionEndDate,
        SessionStatus SessionStatus,
        string? SessionCancelReason,
        BookingStatus Status,
        DateTime CreatedAt);

    /// <summary>Upcoming = only active bookings of sessions that haven't started (soonest first). Otherwise all, newest first.</summary>
    public sealed class MyBookingsQuery
    {
        public bool Upcoming { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
