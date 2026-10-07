using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.CheckIns;
using GymManagementBLL.Errors;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Linq.Expressions;

namespace GymManagementBLL.BusinessServices.Implementation
{
    /// <summary>
    /// QR check-in at the reception. Rules:
    /// 1. The code must belong to a (not deleted) member, else 404.
    /// 2. The member needs a membership that is running right now and is not frozen.
    /// 3. Only one allowed check-in per member per gym-local day.
    /// Every scan of a known code is saved (allowed or denied), so the log shows refused attempts too.
    /// </summary>
    public class CheckInService : ICheckInService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IClock _clock;
        private readonly GymTimeZone _gymTime;
        private readonly IFileStorage _fileStorage;

        public CheckInService(IUnitOfWork unitOfWork, IClock clock, GymTimeZone gymTime, IFileStorage fileStorage)
        {
            _unitOfWork = unitOfWork;
            _clock = clock;
            _gymTime = gymTime;
            _fileStorage = fileStorage;
        }

        #region Check in

        public async Task<Result<CheckInResultResponse>> CheckInAsync(CheckInRequest request, int staffUserId, CancellationToken ct = default)
        {
            var code = request.Code.Trim().ToLowerInvariant();

            var member = await _unitOfWork.GetRepository<Member>().Query()
                .Where(m => m.CheckInToken == code)
                .Select(m => new { m.Id, m.Name, m.Photo })
                .FirstOrDefaultAsync(ct);

            if (member is null)
                return CheckInErrors.UnknownCode;

            var now = _clock.UtcNow;
            var today = _gymTime.LocalDate(now);

            var memberships = await _unitOfWork.GetRepository<Membership>().Query()
                .Where(m => m.MemberId == member.Id && m.Status != MembershipStatus.Cancelled)
                .Select(m => new MembershipInfo(m.Id, m.PlanName, m.StartDate, m.EndDate, m.Status, m.FrozenUntil))
                .ToListAsync(ct);

            var decision = Decide(memberships, now);

            if (decision.Result == CheckInResult.Allowed && await FirstCheckInTodayAsync(member.Id, today, ct) is DateTime firstToday)
                decision = AlreadyCheckedIn(firstToday);

            var checkIn = NewCheckIn(member.Id, decision, now, today, staffUserId);
            _unitOfWork.GetRepository<CheckIn>().Add(checkIn);

            try
            {
                await _unitOfWork.SaveChangesAsync(ct);
            }
            catch (DbUpdateException) when (decision.Result == CheckInResult.Allowed)
            {
                // Two scans at the same moment: both passed the check above, but the unique index
                // (one allowed check-in per member per day) rejected the second insert.
                _unitOfWork.DiscardChanges();

                if (await FirstCheckInTodayAsync(member.Id, today, ct) is not DateTime first)
                    throw; // a different database problem

                decision = AlreadyCheckedIn(first);
                checkIn = NewCheckIn(member.Id, decision, now, today, staffUserId);
                _unitOfWork.GetRepository<CheckIn>().Add(checkIn);
                await _unitOfWork.SaveChangesAsync(ct);
            }

            var daysLeft = decision.CoveredUntil is DateTime until
                ? _gymTime.LocalDate(until).DayNumber - today.DayNumber
                : (int?)null;

            return new CheckInResultResponse(
                checkIn.Id,
                decision.Result,
                decision.Reason,
                decision.Result == CheckInResult.Allowed ? WelcomeMessage(member.Name, daysLeft) : decision.Message,
                member.Id,
                member.Name,
                member.Photo is null ? null : _fileStorage.GetPublicUrl(MemberService.PhotoFolder, member.Photo),
                decision.Membership?.PlanName,
                decision.CoveredUntil,
                daysLeft,
                now);
        }

        #endregion

        #region Log

        public async Task<PagedResult<CheckInResponse>> GetAllAsync(CheckInQuery query, CancellationToken ct = default)
            => await Filter(query).ToPagedResultAsync(query.Page, query.PageSize, ct);

        public async Task<Result<IReadOnlyList<CheckInResponse>>> GetForExportAsync(CheckInQuery query, int maxRows, CancellationToken ct = default)
            => await Filter(query).ToExportListAsync(maxRows, ct);

        #endregion

        #region QR code

        public async Task<Result<CheckInCodeResponse>> GetCodeAsync(int memberId, CancellationToken ct = default)
        {
            var code = await _unitOfWork.GetRepository<Member>().Query()
                .Where(m => m.Id == memberId)
                .Select(m => m.CheckInToken)
                .FirstOrDefaultAsync(ct);

            return code is null ? MemberErrors.NotFound(memberId) : new CheckInCodeResponse(code);
        }

        public async Task<Result<CheckInCodeResponse>> RegenerateCodeAsync(int memberId, CancellationToken ct = default)
        {
            var member = await _unitOfWork.GetRepository<Member>().GetByIdAsync(memberId, ct);
            if (member is null)
                return MemberErrors.NotFound(memberId);

            member.CheckInToken = CheckInCodes.New();
            await _unitOfWork.SaveChangesAsync(ct);

            return new CheckInCodeResponse(member.CheckInToken);
        }

        #endregion

        #region Helper Methods

        /// <summary>The few membership columns the decision needs.</summary>
        private sealed record MembershipInfo(int Id, string PlanName, DateTime StartDate, DateTime EndDate,
            MembershipStatus Status, DateTime? FrozenUntil);

        private sealed record Decision(CheckInResult Result, CheckInDenyReason? Reason, string Message,
            MembershipInfo? Membership = null, DateTime? CoveredUntil = null);

        /// <summary>Allowed or denied, based on the member's (not cancelled) memberships. Pure logic, no database.</summary>
        private Decision Decide(IReadOnlyList<MembershipInfo> memberships, DateTime now)
        {
            // A freeze ends by itself when FrozenUntil passes (same rule as the rest of the app).
            bool IsFrozenNow(MembershipInfo m) => m.Status == MembershipStatus.Frozen && m.FrozenUntil > now;

            var current = memberships
                .Where(m => m.StartDate <= now && m.EndDate > now && !IsFrozenNow(m))
                .OrderByDescending(m => m.EndDate)
                .FirstOrDefault();

            if (current is not null)
                return new Decision(CheckInResult.Allowed, null, "", current, CoveredUntil(memberships, current.EndDate));

            var frozen = memberships.FirstOrDefault(m => m.EndDate > now && IsFrozenNow(m));
            if (frozen is not null)
                return Denied(CheckInDenyReason.MembershipFrozen, "The membership is frozen until " + LocalDate(frozen.FrozenUntil!.Value) + ".");

            var upcoming = memberships.Where(m => m.StartDate > now).OrderBy(m => m.StartDate).FirstOrDefault();
            if (upcoming is not null)
                return Denied(CheckInDenyReason.MembershipNotStarted, "The membership starts on " + LocalDate(upcoming.StartDate) + ".");

            if (memberships.Count > 0)
                return Denied(CheckInDenyReason.MembershipExpired, "The membership has expired. Please renew at the reception.");

            return Denied(CheckInDenyReason.NoMembership, "This member has no membership. Please buy a plan at the reception.");
        }

        /// <summary>
        /// The end of the time the member has paid for: the current membership, plus renewals that
        /// start before (or exactly when) the previous one ends.
        /// </summary>
        private static DateTime CoveredUntil(IReadOnlyList<MembershipInfo> memberships, DateTime currentEnd)
        {
            var until = currentEnd;
            foreach (var m in memberships.OrderBy(m => m.StartDate))
            {
                if (m.StartDate <= until && m.EndDate > until)
                    until = m.EndDate;
            }
            return until;
        }

        private static Decision Denied(CheckInDenyReason reason, string message) => new(CheckInResult.Denied, reason, message);

        private Decision AlreadyCheckedIn(DateTime firstUtc)
            => Denied(CheckInDenyReason.AlreadyCheckedInToday,
                "Already checked in today at " + _gymTime.ToLocal(firstUtc).ToString("h:mm tt", CultureInfo.InvariantCulture) + ".");

        private static string WelcomeMessage(string name, int? daysLeft)
            => daysLeft switch
            {
                0 => "Welcome, " + name + "! This is the last day of the membership.",
                1 => "Welcome, " + name + "! 1 day left.",
                _ => "Welcome, " + name + "! " + daysLeft + " days left."
            };

        private string LocalDate(DateTime utc) => _gymTime.ToLocal(utc).ToString("d MMM yyyy", CultureInfo.InvariantCulture);

        /// <summary>When the member was allowed in today, or null.</summary>
        private async Task<DateTime?> FirstCheckInTodayAsync(int memberId, DateOnly today, CancellationToken ct)
            => await _unitOfWork.GetRepository<CheckIn>().Query()
                .Where(c => c.MemberId == memberId && c.Day == today && c.Result == CheckInResult.Allowed)
                .Select(c => (DateTime?)c.CheckedInAt)
                .FirstOrDefaultAsync(ct);

        private static CheckIn NewCheckIn(int memberId, Decision decision, DateTime now, DateOnly today, int staffUserId) => new()
        {
            MemberId = memberId,
            MembershipId = decision.Result == CheckInResult.Allowed ? decision.Membership?.Id : null,
            CheckedInAt = now,
            Day = today,
            Result = decision.Result,
            DenyReason = decision.Reason,
            CheckedByUserId = staffUserId,
        };

        private IQueryable<CheckInResponse> Filter(CheckInQuery query)
        {
            // IgnoreQueryFilters: check-ins of a member who was deleted later are still history.
            var checkIns = _unitOfWork.GetRepository<CheckIn>().Query().IgnoreQueryFilters();

            if (query.From is not null)
                checkIns = checkIns.Where(c => c.Day >= query.From);
            if (query.To is not null)
                checkIns = checkIns.Where(c => c.Day <= query.To);
            if (query.MemberId is not null)
                checkIns = checkIns.Where(c => c.MemberId == query.MemberId);
            if (query.Result is not null)
                checkIns = checkIns.Where(c => c.Result == query.Result);

            return checkIns
                .OrderByDescending(c => c.CheckedInAt).ThenByDescending(c => c.Id)
                .Select(ToResponse);
        }

        private static readonly Expression<Func<CheckIn, CheckInResponse>> ToResponse = c =>
            new CheckInResponse(
                c.Id,
                c.MemberId,
                c.Member.Name,
                c.Result,
                c.DenyReason,
                c.CheckedInAt,
                c.Day,
                c.CheckedByUser != null ? c.CheckedByUser.FullName : null);

        #endregion
    }
}
