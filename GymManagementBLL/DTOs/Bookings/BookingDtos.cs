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
}
