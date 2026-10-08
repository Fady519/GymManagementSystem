using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Sessions;
using GymManagementBLL.Errors;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class SessionService : ISessionService
    {
        private const int AvailableMembersLimit = 50;

        private readonly IUnitOfWork _unitOfWork;
        private readonly IAppEmailService _emails;
        private readonly IClock _clock;

        public SessionService(IUnitOfWork unitOfWork, IAppEmailService emails, IClock clock)
        {
            _unitOfWork = unitOfWork;
            _emails = emails;
            _clock = clock;
        }

        public async Task<PagedResult<SessionResponse>> GetAllAsync(SessionQuery query, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;
            var sessions = SessionsQuery();

            // The state is calculated, so each filter describes it with Status + times.
            sessions = query.State switch
            {
                SessionState.Cancelled => sessions.Where(s => s.Status == SessionStatus.Cancelled),
                SessionState.Upcoming => sessions.Where(s => s.Status == SessionStatus.Scheduled && s.StartDate > now),
                SessionState.Ongoing => sessions.Where(s => s.Status == SessionStatus.Scheduled && s.StartDate <= now && s.EndDate > now),
                SessionState.Completed => sessions.Where(s => s.Status == SessionStatus.Scheduled && s.EndDate <= now),
                _ => sessions
            };

            if (query.From is not null)
                sessions = sessions.Where(s => s.StartDate >= query.From);

            if (query.To is not null)
                sessions = sessions.Where(s => s.StartDate < query.To);

            if (query.TrainerId is not null)
                sessions = sessions.Where(s => s.TrainerId == query.TrainerId);

            if (query.CategoryId is not null)
                sessions = sessions.Where(s => s.CategoryId == query.CategoryId);

            // Past lists (Completed, Cancelled) are read newest first; the rest soonest first.
            var newestFirst = query.State is SessionState.Completed or SessionState.Cancelled;
            var ordered = newestFirst
                ? sessions.OrderByDescending(s => s.StartDate).ThenByDescending(s => s.Id)
                : sessions.OrderBy(s => s.StartDate).ThenBy(s => s.Id);

            return await ToResponses(ordered, now)
                .ToPagedResultAsync(query.Page, query.PageSize, ct);
        }

        public async Task<Result<SessionResponse>> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var session = await ToResponses(SessionsQuery().Where(s => s.Id == id), _clock.UtcNow).FirstOrDefaultAsync(ct);
            return session is null ? SessionErrors.NotFound(id) : session;
        }

        public async Task<Result<SessionResponse>> CreateAsync(SaveSessionRequest request, CancellationToken ct = default)
        {
            var check = await CheckTrainerAndCategoryAsync(null, request, ct);
            if (check.IsFailure)
                return check.Error;

            var session = new Session
            {
                Description = request.Description.Trim(),
                Capacity = request.Capacity,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                CategoryId = request.CategoryId,
                TrainerId = request.TrainerId,
            };

            _unitOfWork.GetRepository<Session>().Add(session);
            await _unitOfWork.SaveChangesAsync(ct);

            return await GetByIdAsync(session.Id, ct);
        }

        public async Task<Result<SessionResponse>> UpdateAsync(int id, SaveSessionRequest request, CancellationToken ct = default)
        {
            var session = await _unitOfWork.GetRepository<Session>().GetByIdAsync(id, ct);
            if (session is null)
                return SessionErrors.NotFound(id);

            if (!IsUpcoming(session))
                return SessionErrors.NotUpcoming;

            var bookedCount = await CountActiveBookingsAsync(id, ct);
            if (request.Capacity < bookedCount)
                return SessionErrors.CapacityBelowBookings(bookedCount);

            var check = await CheckTrainerAndCategoryAsync(id, request, ct);
            if (check.IsFailure)
                return check.Error;

            session.Description = request.Description.Trim();
            session.Capacity = request.Capacity;
            session.StartDate = request.StartDate;
            session.EndDate = request.EndDate;
            session.CategoryId = request.CategoryId;
            session.TrainerId = request.TrainerId;

            if (!await TrySaveAsync(ct))
                return SessionErrors.ChangedByAnotherUser;

            return await GetByIdAsync(id, ct);
        }

        public async Task<Result> CancelAsync(int id, CancelSessionRequest request, CancellationToken ct = default)
        {
            var session = await _unitOfWork.GetRepository<Session>().Query(asTracking: true)
                .Include(s => s.Category)
                .FirstOrDefaultAsync(s => s.Id == id, ct);
            if (session is null)
                return SessionErrors.NotFound(id);

            if (!IsUpcoming(session))
                return SessionErrors.NotUpcoming;

            var reason = request.Reason.Trim();
            session.Status = SessionStatus.Cancelled;
            session.CancelReason = reason;

            // Cancel the bookings too (rows are kept for history).
            var bookings = await _unitOfWork.GetRepository<Booking>().Query(asTracking: true)
                .Where(b => b.SessionId == id && b.Status == BookingStatus.Booked)
                .ToListAsync(ct);

            // Who to email: read before saving (afterwards the bookings are no longer "Booked").
            var recipients = await _unitOfWork.GetRepository<Booking>().Query()
                .Where(b => b.SessionId == id && b.Status == BookingStatus.Booked)
                .Select(b => new EmailRecipient(b.Member.Name, b.Member.Email))
                .ToListAsync(ct);

            foreach (var booking in bookings)
                booking.Status = BookingStatus.Cancelled;

            if (!await TrySaveAsync(ct))
                return SessionErrors.ChangedByAnotherUser;

            // Emails only AFTER the save: we never tell members about a cancel that didn't happen.
            // A failed email doesn't undo the cancel (the sender logs it).
            if (recipients.Count > 0)
                await _emails.SendSessionCancelledAsync(recipients, session.Category.Name + " - " + session.Description, session.StartDate, reason, ct);

            return Result.Success();
        }

        public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
        {
            var repo = _unitOfWork.GetRepository<Session>();
            var session = await repo.GetByIdAsync(id, ct);
            if (session is null)
                return SessionErrors.NotFound(id);

            // H8 fix: the old code did the opposite (it deleted past sessions = history).
            if (!IsUpcoming(session))
                return SessionErrors.NotUpcoming;

            if (await _unitOfWork.GetRepository<Booking>().AnyAsync(b => b.SessionId == id, ct))
                return SessionErrors.HasBookings;

            repo.Remove(session);
            return await TrySaveAsync(ct) ? Result.Success() : SessionErrors.ChangedByAnotherUser;
        }

        public async Task<Result<IReadOnlyList<SessionBookingItem>>> GetBookingsAsync(int id, CurrentUser user, CancellationToken ct = default)
        {
            var session = await SessionsQuery()
                .Where(s => s.Id == id)
                .Select(s => new { s.TrainerId })
                .FirstOrDefaultAsync(ct);

            if (session is null)
                return SessionErrors.NotFound(id);

            if (!user.IsAdmin && session.TrainerId != user.TrainerId)
                return BookingErrors.NotYourSession;

            // IgnoreQueryFilters: keep the attendance history even if a member was deleted later.
            var bookings = await _unitOfWork.GetRepository<Booking>().Query()
                .IgnoreQueryFilters()
                .Where(b => b.SessionId == id)
                .OrderBy(b => b.Member.Name)
                .Select(b => new SessionBookingItem(b.Id, b.MemberId, b.Member.Name, b.Member.Phone, b.Status, b.CreatedAt))
                .ToListAsync(ct);

            return Result.Success<IReadOnlyList<SessionBookingItem>>(bookings);
        }

        public async Task<Result<IReadOnlyList<AvailableMemberItem>>> GetAvailableMembersAsync(int id, string? search, CancellationToken ct = default)
        {
            var session = await SessionsQuery()
                .Where(s => s.Id == id)
                .Select(s => new { s.StartDate, s.EndDate })
                .FirstOrDefaultAsync(ct);

            if (session is null)
                return SessionErrors.NotFound(id);

            // C7 fix: the old code compared with an id that was always 0,
            // so members who had already booked still appeared in the list.
            // A frozen membership is fine if the freeze is over before the session starts.
            var members = _unitOfWork.GetRepository<Member>().Query()
                .Where(m => m.Memberships.Any(x => (x.Status == MembershipStatus.Active
                                                    || (x.Status == MembershipStatus.Frozen && x.FrozenUntil <= session.StartDate))
                                                   && x.StartDate <= session.StartDate
                                                   && x.EndDate >= session.EndDate))
                .Where(m => !m.Bookings.Any(b => b.SessionId == id && b.Status != BookingStatus.Cancelled));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                members = members.Where(m => m.Name.Contains(term) || m.Phone.Contains(term));
            }

            var list = await members
                .OrderBy(m => m.Name)
                .Take(AvailableMembersLimit)
                .Select(m => new AvailableMemberItem(m.Id, m.Name, m.Phone))
                .ToListAsync(ct);

            return Result.Success<IReadOnlyList<AvailableMemberItem>>(list);
        }

        #region Helper Methods

        /// <summary>
        /// Sessions query that ignores the soft-delete filter of the trainer / category, so past
        /// sessions of a deleted trainer still show the trainer's name (sessions themselves are never soft-deleted).
        /// </summary>
        private IQueryable<Session> SessionsQuery()
            => _unitOfWork.GetRepository<Session>().Query().IgnoreQueryFilters();

        /// <summary>
        /// One SQL query for the whole page: the bookings are counted inside the SELECT
        /// (H9 fix: the old code ran one extra query per session = the N+1 problem).
        /// </summary>
        private static IQueryable<SessionResponse> ToResponses(IQueryable<Session> sessions, DateTime now)
            => sessions.Select(s => new SessionResponse(
                s.Id,
                s.Description,
                s.Capacity,
                s.Bookings.Count(b => b.Status != BookingStatus.Cancelled),
                s.Capacity - s.Bookings.Count(b => b.Status != BookingStatus.Cancelled),
                s.StartDate,
                s.EndDate,
                s.Status == SessionStatus.Cancelled ? SessionState.Cancelled
                    : s.StartDate > now ? SessionState.Upcoming
                    : s.EndDate > now ? SessionState.Ongoing
                    : SessionState.Completed,
                s.CancelReason,
                s.CategoryId,
                s.Category.Name,
                s.TrainerId,
                s.Trainer.Name,
                s.CreatedAt));

        private bool IsUpcoming(Session session)
            => session.Status == SessionStatus.Scheduled && session.StartDate > _clock.UtcNow;

        private Task<int> CountActiveBookingsAsync(int sessionId, CancellationToken ct)
            => _unitOfWork.GetRepository<Booking>().CountAsync(b => b.SessionId == sessionId && b.Status != BookingStatus.Cancelled, ct);

        /// <param name="sessionId">null when creating; the session's own id when updating (so it doesn't overlap with itself).</param>
        private async Task<Result> CheckTrainerAndCategoryAsync(int? sessionId, SaveSessionRequest request, CancellationToken ct)
        {
            if (!await _unitOfWork.GetRepository<Category>().AnyAsync(c => c.Id == request.CategoryId, ct))
                return SessionErrors.CategoryNotFound(request.CategoryId);

            var trainer = await _unitOfWork.GetRepository<Trainer>().Query()
                .Where(t => t.Id == request.TrainerId)
                .Select(t => new { t.CategoryId })
                .FirstOrDefaultAsync(ct);

            if (trainer is null)
                return SessionErrors.TrainerNotFound(request.TrainerId);

            if (trainer.CategoryId != request.CategoryId)
                return SessionErrors.TrainerCategoryMismatch;

            // H13 fix: two time ranges overlap when each one starts before the other ends.
            var trainerBusy = await _unitOfWork.GetRepository<Session>().AnyAsync(s =>
                s.TrainerId == request.TrainerId
                && s.Id != sessionId
                && s.Status == SessionStatus.Scheduled
                && s.StartDate < request.EndDate
                && request.StartDate < s.EndDate, ct);

            return trainerBusy ? SessionErrors.TrainerBusy : Result.Success();
        }

        /// <summary>
        /// Saves, or returns false if someone else changed the session at the same moment
        /// (its RowVersion no longer matches, e.g. a member booked while the admin was editing).
        /// </summary>
        private async Task<bool> TrySaveAsync(CancellationToken ct)
        {
            try
            {
                await _unitOfWork.SaveChangesAsync(ct);
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                return false;
            }
        }

        #endregion
    }
}
