using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Bookings;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IBookingService
    {
        /// <summary>An admin books any member; a member books only himself.</summary>
        Task<Result<BookingResponse>> CreateAsync(CreateBookingRequest request, CurrentUser user, CancellationToken ct = default);

        /// <summary>Members must cancel before the deadline; admins can cancel until the session starts.</summary>
        Task<Result> CancelAsync(int id, CurrentUser user, CancellationToken ct = default);

        /// <summary>Only while the session is running, by an admin or the session's trainer.</summary>
        Task<Result> MarkAttendedAsync(int id, CurrentUser user, CancellationToken ct = default);

        /// <summary>The bookings of one member (the member portal passes the id from the token).</summary>
        Task<PagedResult<MyBookingItem>> GetMemberBookingsAsync(int memberId, MyBookingsQuery query, CancellationToken ct = default);
    }
}
