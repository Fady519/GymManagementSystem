using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Bookings;
using GymManagementBLL.Errors;
using GymManagementBLL.Options;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class BookingService : IBookingService
    {
        /// <summary>How many times we try again when two bookings for the same session collide.</summary>
        private const int MaxAttempts = 3;

        private readonly IUnitOfWork _unitOfWork;
        private readonly IClock _clock;
        private readonly SessionRulesOptions _rules;

        public BookingService(IUnitOfWork unitOfWork, IClock clock, IOptions<SessionRulesOptions> rules)
        {
            _unitOfWork = unitOfWork;
            _clock = clock;
            _rules = rules.Value;
        }

        public async Task<Result<BookingResponse>> CreateAsync(CreateBookingRequest request, CurrentUser user, CancellationToken ct = default)
        {
            // A member always books for himself, whatever memberId he sends.
            var memberId = user.IsAdmin ? request.MemberId : user.MemberId;
            if (memberId is null)
                return BookingErrors.MemberRequired;

            // Optimistic concurrency: if someone else booked the same session at the same moment,
            // our save fails (RowVersion changed). We then read everything again and re-check the rules,
            // so the last seat can never be given to two people.
            for (var attempt = 1; attempt <= MaxAttempts; attempt++)
            {
                try
                {
                    return await TryCreateAsync(request.SessionId, memberId.Value, ct);
                }
                catch (DbUpdateConcurrencyException)
                {
                    _unitOfWork.DiscardChanges();
                }
            }

            // Very busy session: we collided every time. The seat may still be free, so ask to retry.
            // (A really full session is detected inside each attempt and returns Session.Full.)
            return SessionErrors.ChangedByAnotherUser;
        }

        public async Task<Result> CancelAsync(int id, CurrentUser user, CancellationToken ct = default)
        {
            var booking = await LoadWithSessionAsync(id, ct);
            if (booking is null)
                return BookingErrors.NotFound(id);

            if (!user.IsAdmin && booking.MemberId != user.MemberId)
                return BookingErrors.NotYourBooking;

            if (booking.Status != BookingStatus.Booked)
                return BookingErrors.NotActive;

            var now = _clock.UtcNow;
            if (booking.Session.StartDate <= now)
                return BookingErrors.SessionStarted;

            // The deadline is for members; the reception can cancel until the session starts.
            if (!user.IsAdmin && booking.Session.StartDate - now < TimeSpan.FromHours(_rules.CancellationDeadlineHours))
                return BookingErrors.CancellationDeadlinePassed(_rules.CancellationDeadlineHours);

            booking.Status = BookingStatus.Cancelled;
            await _unitOfWork.SaveChangesAsync(ct);

            return Result.Success();
        }

        public async Task<Result> MarkAttendedAsync(int id, CurrentUser user, CancellationToken ct = default)
        {
            var booking = await LoadWithSessionAsync(id, ct);
            if (booking is null)
                return BookingErrors.NotFound(id);

            if (!user.IsAdmin && booking.Session.TrainerId != user.TrainerId)
                return BookingErrors.NotYourSession;

            if (booking.Status != BookingStatus.Booked)
                return BookingErrors.NotActive;

            // H5 fix: this rule was only a comment in the old code.
            var now = _clock.UtcNow;
            var session = booking.Session;
            var isRunning = session.Status == SessionStatus.Scheduled && session.StartDate <= now && now < session.EndDate;
            if (!isRunning)
                return BookingErrors.AttendanceNotOpen;

            booking.Status = BookingStatus.Attended;
            await _unitOfWork.SaveChangesAsync(ct);

            return Result.Success();
        }

        public async Task<PagedResult<MyBookingItem>> GetMemberBookingsAsync(int memberId, MyBookingsQuery query, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;

            // IgnoreQueryFilters: a past booking stays in the history even if its trainer was deleted later.
            var bookings = _unitOfWork.GetRepository<Booking>().Query()
                .IgnoreQueryFilters()
                .Where(b => b.MemberId == memberId);

            bookings = query.Upcoming
                ? bookings
                    .Where(b => b.Status == BookingStatus.Booked && b.Session.Status == SessionStatus.Scheduled && b.Session.StartDate > now)
                    .OrderBy(b => b.Session.StartDate).ThenBy(b => b.Id)
                : bookings.OrderByDescending(b => b.Session.StartDate).ThenByDescending(b => b.Id);

            return await bookings
                .Select(b => new MyBookingItem(
                    b.Id, b.SessionId, b.Session.Category.Name, b.Session.Description, b.Session.Trainer.Name,
                    b.Session.StartDate, b.Session.EndDate, b.Session.Status, b.Status, b.CreatedAt))
                .ToPagedResultAsync(query.Page, query.PageSize, ct);
        }

        #region Helper Methods

        private async Task<Result<BookingResponse>> TryCreateAsync(int sessionId, int memberId, CancellationToken ct)
        {
            var now = _clock.UtcNow;
            var bookings = _unitOfWork.GetRepository<Booking>();

            var session = await _unitOfWork.GetRepository<Session>().GetByIdAsync(sessionId, ct); // tracked
            if (session is null)
                return SessionErrors.NotFound(sessionId);

            if (session.Status != SessionStatus.Scheduled || session.StartDate <= now)
                return BookingErrors.SessionNotBookable;

            if (!await _unitOfWork.GetRepository<Member>().AnyAsync(m => m.Id == memberId, ct))
                return BookingErrors.MemberNotFound(memberId);

            if (await bookings.AnyAsync(b => b.SessionId == sessionId && b.MemberId == memberId && b.Status != BookingStatus.Cancelled, ct))
                return BookingErrors.AlreadyBooked;

            // H4 fix: ">=" (the old code only checked "== 0").
            var bookedCount = await bookings.CountAsync(b => b.SessionId == sessionId && b.Status != BookingStatus.Cancelled, ct);
            if (bookedCount >= session.Capacity)
                return SessionErrors.Full;

            // Valid for the whole session and not frozen at that time
            // (a frozen membership is fine if the freeze is over before the session starts).
            var hasValidMembership = await _unitOfWork.GetRepository<Membership>().AnyAsync(m =>
                m.MemberId == memberId
                && (m.Status == MembershipStatus.Active
                    || (m.Status == MembershipStatus.Frozen && m.FrozenUntil <= session.StartDate))
                && m.StartDate <= session.StartDate
                && m.EndDate >= session.EndDate, ct);

            if (!hasValidMembership)
                return BookingErrors.NoValidMembership;

            // H13 fix: the member can't be in two sessions at the same time.
            var memberBusy = await bookings.AnyAsync(b =>
                b.MemberId == memberId
                && b.Status == BookingStatus.Booked
                && b.Session.Status == SessionStatus.Scheduled
                && b.Session.StartDate < session.EndDate
                && session.StartDate < b.Session.EndDate, ct);

            if (memberBusy)
                return BookingErrors.MemberBusy;

            var booking = new Booking { SessionId = sessionId, MemberId = memberId };
            bookings.Add(booking);

            // "Touch" the session so EF also runs: UPDATE Sessions ... WHERE Id = @id AND RowVersion = @old.
            // If another booking changed the session since we read it, 0 rows match and EF throws
            // DbUpdateConcurrencyException; the booking insert is rolled back with it (same transaction).
            session.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(ct);

            return await bookings.Query()
                .Where(b => b.Id == booking.Id)
                .Select(b => new BookingResponse(
                    b.Id, b.SessionId, b.Session.Description, b.Session.StartDate, b.Session.EndDate,
                    b.MemberId, b.Member.Name, b.Status, b.CreatedAt))
                .FirstAsync(ct);
        }

        /// <summary>The booking (tracked, so changes are saved) with its session.</summary>
        private Task<Booking?> LoadWithSessionAsync(int id, CancellationToken ct)
            => _unitOfWork.GetRepository<Booking>().Query(asTracking: true)
                .Include(b => b.Session)
                .FirstOrDefaultAsync(b => b.Id == id, ct);

        #endregion
    }
}
