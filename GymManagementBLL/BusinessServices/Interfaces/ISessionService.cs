using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Sessions;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface ISessionService
    {
        Task<PagedResult<SessionResponse>> GetAllAsync(SessionQuery query, CancellationToken ct = default);
        Task<Result<SessionResponse>> GetByIdAsync(int id, CancellationToken ct = default);
        Task<Result<SessionResponse>> CreateAsync(SaveSessionRequest request, CancellationToken ct = default);
        Task<Result<SessionResponse>> UpdateAsync(int id, SaveSessionRequest request, CancellationToken ct = default);

        /// <summary>Marks the session Cancelled and cancels all its bookings (history is kept).</summary>
        Task<Result> CancelAsync(int id, CancellationToken ct = default);

        /// <summary>Only for upcoming sessions that never had a booking.</summary>
        Task<Result> DeleteAsync(int id, CancellationToken ct = default);

        /// <summary>The session's bookings. Admins see any session; a trainer only their own.</summary>
        Task<Result<IReadOnlyList<SessionBookingItem>>> GetBookingsAsync(int id, CurrentUser user, CancellationToken ct = default);

        /// <summary>Members who can still be booked into the session (valid membership, not booked yet).</summary>
        Task<Result<IReadOnlyList<AvailableMemberItem>>> GetAvailableMembersAsync(int id, string? search, CancellationToken ct = default);
    }
}
