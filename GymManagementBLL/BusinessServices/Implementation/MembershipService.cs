using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Memberships;
using GymManagementBLL.Errors;
using GymManagementBLL.Mapping;
using GymManagementBLL.Options;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GymManagementBLL.BusinessServices.Implementation
{
    /// <summary>
    /// The life of a membership: buy, renew, cancel, freeze, unfreeze.
    /// Words used in this file:
    /// - "running"  = not cancelled and not ended yet (EndDate &gt; now). Includes a renewal waiting to start.
    /// - "queued renewal" = an early renewal that starts when the current membership ends.
    /// </summary>
    public class MembershipService : IMembershipService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IClock _clock;
        private readonly MembershipRulesOptions _rules;

        public MembershipService(IUnitOfWork unitOfWork, IClock clock, IOptions<MembershipRulesOptions> rules)
        {
            _unitOfWork = unitOfWork;
            _clock = clock;
            _rules = rules.Value;
        }

        private IQueryable<Membership> Memberships(bool asTracking = false)
            => _unitOfWork.GetRepository<Membership>().Query(asTracking);

        #region Queries

        public async Task<PagedResult<MembershipResponse>> GetAllAsync(MembershipQuery query, CancellationToken ct = default)
            => await ListQuery(query).ToPagedResultAsync(query.Page, query.PageSize, ct);

        public async Task<Result<IReadOnlyList<MembershipResponse>>> GetForExportAsync(MembershipQuery query, int maxRows, CancellationToken ct = default)
            => await ListQuery(query).ToExportListAsync(maxRows, ct);

        /// <summary>The memberships list as one SQL query (shared by the page and the export).</summary>
        private IQueryable<MembershipResponse> ListQuery(MembershipQuery query)
        {
            var now = _clock.UtcNow;

            // IgnoreQueryFilters: memberships of a deleted member are still part of the history.
            var memberships = Memberships().IgnoreQueryFilters();

            if (query.MemberId is not null)
                memberships = memberships.Where(m => m.MemberId == query.MemberId);

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim();
                memberships = memberships.Where(m => m.Member.Name.Contains(search) || m.Member.Phone.Contains(search));
            }

            // Same rules as the CASE in MembershipMappings.ToResponse, written as filters.
            memberships = query.State switch
            {
                MembershipState.Cancelled => memberships.Where(m => m.Status == MembershipStatus.Cancelled),
                MembershipState.Expired => memberships.Where(m => m.Status != MembershipStatus.Cancelled && m.EndDate <= now),
                MembershipState.Upcoming => memberships.Where(m => m.Status != MembershipStatus.Cancelled && m.EndDate > now && m.StartDate > now),
                MembershipState.Frozen => memberships.Where(m => m.Status == MembershipStatus.Frozen && m.FrozenUntil > now
                    && m.EndDate > now && m.StartDate <= now),
                MembershipState.Active => memberships.Where(m => m.Status != MembershipStatus.Cancelled && m.EndDate > now && m.StartDate <= now
                    && !(m.Status == MembershipStatus.Frozen && m.FrozenUntil > now)),
                _ => memberships
            };

            return memberships
                .OrderByDescending(m => m.CreatedAt).ThenByDescending(m => m.Id)
                .Select(MembershipMappings.ToResponse(now));
        }

        public async Task<Result<MembershipDetailsResponse>> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var membership = await FindResponseAsync(id, ct);
            if (membership is null)
                return MembershipErrors.NotFound(id);

            var payments = await _unitOfWork.GetRepository<Payment>().Query().IgnoreQueryFilters()
                .Where(p => p.MembershipId == id)
                .OrderBy(p => p.PaidAt)
                .Select(MembershipMappings.PaymentToResponse)
                .ToListAsync(ct);

            var freezes = await _unitOfWork.GetRepository<MembershipFreeze>().Query()
                .Where(f => f.MembershipId == id)
                .OrderBy(f => f.StartDate)
                .Select(MembershipMappings.FreezeToResponse)
                .ToListAsync(ct);

            return new MembershipDetailsResponse(membership, payments, freezes);
        }

        public async Task<IReadOnlyList<MembershipResponse>> GetExpiringSoonAsync(ExpiringSoonQuery query, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;
            var limit = now.AddDays(query.Days ?? _rules.ExpiringSoonDays);

            // Started, not cancelled, ends between now and the limit, and the member hasn't renewed yet.
            return await Memberships()
                .Where(m => m.Status != MembershipStatus.Cancelled
                    && m.StartDate <= now && m.EndDate > now && m.EndDate <= limit
                    && !m.Member.Memberships.Any(r => r.Id != m.Id && r.Status != MembershipStatus.Cancelled && r.StartDate >= m.EndDate))
                .OrderBy(m => m.EndDate)
                .Select(MembershipMappings.ToResponse(now))
                .ToListAsync(ct);
        }

        #endregion

        #region Buy and renew

        public async Task<Result<MembershipResponse>> CreateAsync(CreateMembershipRequest request, int staffUserId, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;

            if (!await _unitOfWork.GetRepository<Member>().AnyAsync(m => m.Id == request.MemberId, ct))
                return MembershipErrors.MemberNotFound(request.MemberId);

            var plan = await _unitOfWork.GetRepository<Plan>().GetByIdAsync(request.PlanId, ct);
            if (plan is null)
                return MembershipErrors.PlanNotFound(request.PlanId);
            if (!plan.IsActive)
                return MembershipErrors.PlanInactive;

            // One running membership per member. To continue, the admin uses "renew".
            if (await HasRunningMembershipAsync(request.MemberId, now, ct))
                return MembershipErrors.AlreadyHasMembership;

            var membership = NewMembership(request.MemberId, plan, start: now);
            membership.Payments.Add(NewPayment(plan.Price, request.PaymentMethod, PaymentType.Purchase, staffUserId, request.Notes, now));

            // C1 fix: the membership and its payment are saved by ONE SaveChanges call.
            // EF wraps one SaveChanges in a database transaction: both rows are saved, or neither.
            _unitOfWork.GetRepository<Membership>().Add(membership);
            await _unitOfWork.SaveChangesAsync(ct);

            return (await FindResponseAsync(membership.Id, ct))!;
        }

        public async Task<Result<MembershipResponse>> RenewAsync(int id, RenewMembershipRequest request, int staffUserId, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;

            var current = await Memberships().FirstOrDefaultAsync(m => m.Id == id, ct);
            if (current is null)
                return MembershipErrors.NotFound(id);
            if (current.Status == MembershipStatus.Cancelled)
                return MembershipErrors.Cancelled;

            if (!await _unitOfWork.GetRepository<Member>().AnyAsync(m => m.Id == current.MemberId, ct))
                return MembershipErrors.MemberNotFound(current.MemberId);

            // Empty PlanId = the same plan again; another id = change / upgrade the plan.
            var planId = request.PlanId ?? current.PlanId;
            var plan = await _unitOfWork.GetRepository<Plan>().GetByIdAsync(planId, ct);
            if (plan is null)
                return MembershipErrors.PlanNotFound(planId);
            if (!plan.IsActive)
                return MembershipErrors.PlanInactive;

            DateTime start;
            if (current.EndDate > now)
            {
                // Early renewal: the new membership waits and starts when this one ends.
                // Only one renewal can wait (this one must not be a waiting renewal itself).
                if (current.StartDate > now || await FindQueuedRenewalAsync(current, asTracking: false, ct) is not null)
                    return MembershipErrors.RenewalAlreadyQueued;

                start = current.EndDate;
            }
            else
            {
                // Already ended: the new membership starts today,
                // unless the member already has another running membership.
                if (await HasRunningMembershipAsync(current.MemberId, now, ct))
                    return MembershipErrors.AlreadyHasMembership;

                start = now;
            }

            var renewal = NewMembership(current.MemberId, plan, start);
            renewal.Payments.Add(NewPayment(plan.Price, request.PaymentMethod, PaymentType.Renewal, staffUserId, request.Notes, now));

            _unitOfWork.GetRepository<Membership>().Add(renewal);
            await _unitOfWork.SaveChangesAsync(ct);

            return (await FindResponseAsync(renewal.Id, ct))!;
        }

        #endregion

        #region Cancel

        public async Task<Result<MembershipResponse>> CancelAsync(int id, CancelMembershipRequest request, int staffUserId, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;

            var membership = await Memberships(asTracking: true)
                .Include(m => m.Freezes)
                .FirstOrDefaultAsync(m => m.Id == id, ct);

            if (membership is null)
                return MembershipErrors.NotFound(id);
            if (membership.Status == MembershipStatus.Cancelled)
                return MembershipErrors.Cancelled;
            if (membership.EndDate <= now)
                return MembershipErrors.Expired;

            // Cancelling this one would leave a gap before the waiting renewal.
            if (await FindQueuedRenewalAsync(membership, asTracking: false, ct) is not null)
                return MembershipErrors.HasQueuedRenewal;

            var refund = request.RefundAmount ?? 0;
            if (refund > membership.PricePaid)
                return MembershipErrors.RefundTooHigh(membership.PricePaid);

            // H12 fix: the old code deleted the row (with a GET link). Now we only change the status,
            // so the history and the revenue reports stay correct.
            membership.Status = MembershipStatus.Cancelled;
            membership.CancelledAt = now;
            membership.CancellationReason = request.Reason;
            membership.FrozenUntil = null;

            foreach (var freeze in membership.Freezes.Where(f => f.EndedEarlyAt is null && f.EndDate > now))
                freeze.EndedEarlyAt = now;

            if (refund > 0)
                membership.Payments.Add(NewPayment(refund, request.RefundMethod!.Value, PaymentType.Refund, staffUserId, request.Reason, now));

            await CancelUncoveredBookingsAsync(membership, now, ct);

            await _unitOfWork.SaveChangesAsync(ct);

            return (await FindResponseAsync(id, ct))!;
        }

        #endregion

        #region Freeze

        public async Task<Result<MembershipResponse>> FreezeAsync(int id, FreezeMembershipRequest request, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;

            var membership = await Memberships(asTracking: true).FirstOrDefaultAsync(m => m.Id == id, ct);
            if (membership is null)
                return MembershipErrors.NotFound(id);

            EndFinishedFreeze(membership, now);

            if (membership.Status == MembershipStatus.Cancelled)
                return MembershipErrors.Cancelled;
            if (membership.EndDate <= now)
                return MembershipErrors.Expired;
            if (membership.StartDate > now || membership.Status == MembershipStatus.Frozen)
                return MembershipErrors.NotActive;

            if (membership.TotalFrozenDays + request.Days > _rules.MaxTotalFreezeDays)
                return MembershipErrors.FreezeLimitReached(membership.TotalFrozenDays, _rules.MaxTotalFreezeDays);

            // Read the waiting renewal BEFORE moving EndDate (it is found by the old EndDate).
            var queuedRenewal = await FindQueuedRenewalAsync(membership, asTracking: true, ct);

            var frozenUntil = now.AddDays(request.Days);

            membership.Status = MembershipStatus.Frozen;
            membership.FrozenUntil = frozenUntil;
            membership.TotalFrozenDays += request.Days;

            // The member doesn't lose the frozen days: the membership ends later by the same number of days.
            membership.EndDate = membership.EndDate.AddDays(request.Days);
            ShiftDates(queuedRenewal, request.Days);

            membership.Freezes.Add(new MembershipFreeze
            {
                StartDate = now,
                EndDate = frozenUntil,
                Days = request.Days,
                Reason = request.Reason,
            });

            // No training while frozen: cancel the bookings that start during the freeze.
            var bookingsDuringFreeze = await _unitOfWork.GetRepository<Booking>().Query(asTracking: true)
                .Where(b => b.MemberId == membership.MemberId
                    && b.Status == BookingStatus.Booked
                    && b.Session.StartDate >= now
                    && b.Session.StartDate < frozenUntil)
                .ToListAsync(ct);

            foreach (var booking in bookingsDuringFreeze)
                booking.Status = BookingStatus.Cancelled;

            await _unitOfWork.SaveChangesAsync(ct);

            return (await FindResponseAsync(id, ct))!;
        }

        public async Task<Result<MembershipResponse>> UnfreezeAsync(int id, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;

            var membership = await Memberships(asTracking: true)
                .Include(m => m.Freezes)
                .FirstOrDefaultAsync(m => m.Id == id, ct);

            if (membership is null)
                return MembershipErrors.NotFound(id);

            EndFinishedFreeze(membership, now);

            if (membership.Status != MembershipStatus.Frozen)
                return MembershipErrors.NotFrozen;

            var freeze = membership.Freezes
                .Where(f => f.EndedEarlyAt is null)
                .OrderByDescending(f => f.StartDate)
                .First();

            // A started day counts as used (ceiling). The days not used are given back,
            // so the membership ends earlier by that many days.
            var usedDays = Math.Clamp((int)Math.Ceiling((now - freeze.StartDate).TotalDays), 1, freeze.Days);
            var unusedDays = freeze.Days - usedDays;

            var queuedRenewal = await FindQueuedRenewalAsync(membership, asTracking: true, ct);

            membership.Status = MembershipStatus.Active;
            membership.FrozenUntil = null;
            membership.TotalFrozenDays -= unusedDays;
            membership.EndDate = membership.EndDate.AddDays(-unusedDays);
            ShiftDates(queuedRenewal, -unusedDays);

            freeze.EndedEarlyAt = now;

            await _unitOfWork.SaveChangesAsync(ct);

            return (await FindResponseAsync(id, ct))!;
        }

        #endregion

        #region Helper Methods

        private Task<MembershipResponse?> FindResponseAsync(int id, CancellationToken ct)
            => Memberships().IgnoreQueryFilters()
                .Where(m => m.Id == id)
                .Select(MembershipMappings.ToResponse(_clock.UtcNow))
                .FirstOrDefaultAsync(ct);

        /// <summary>Running = not cancelled and not ended (a waiting renewal counts too).</summary>
        private Task<bool> HasRunningMembershipAsync(int memberId, DateTime now, CancellationToken ct)
            => _unitOfWork.GetRepository<Membership>().AnyAsync(m =>
                m.MemberId == memberId && m.Status != MembershipStatus.Cancelled && m.EndDate > now, ct);

        /// <summary>The early renewal that starts when <paramref name="membership"/> ends, if any.</summary>
        private Task<Membership?> FindQueuedRenewalAsync(Membership membership, bool asTracking, CancellationToken ct)
            => Memberships(asTracking).FirstOrDefaultAsync(m =>
                m.MemberId == membership.MemberId
                && m.Id != membership.Id
                && m.Status != MembershipStatus.Cancelled
                && m.StartDate >= membership.EndDate, ct);

        /// <summary>
        /// A freeze ends by itself when FrozenUntil passes (there is no background job).
        /// Before changing a membership we make the stored status match reality.
        /// </summary>
        private static void EndFinishedFreeze(Membership membership, DateTime now)
        {
            if (membership.Status == MembershipStatus.Frozen && membership.FrozenUntil <= now)
            {
                membership.Status = MembershipStatus.Active;
                membership.FrozenUntil = null;
            }
        }

        /// <summary>Moves a waiting renewal so it still starts exactly when the current membership ends.</summary>
        private static void ShiftDates(Membership? renewal, int days)
        {
            if (renewal is null || days == 0)
                return;

            renewal.StartDate = renewal.StartDate.AddDays(days);
            renewal.EndDate = renewal.EndDate.AddDays(days);
        }

        /// <summary>
        /// After a cancel, future bookings that no other membership covers are cancelled too
        /// (e.g. cancelling a waiting renewal cancels the bookings after the current membership ends).
        /// </summary>
        private async Task CancelUncoveredBookingsAsync(Membership cancelled, DateTime now, CancellationToken ct)
        {
            var otherMemberships = await _unitOfWork.GetRepository<Membership>().ListAsync(m =>
                m.MemberId == cancelled.MemberId
                && m.Id != cancelled.Id
                && m.Status != MembershipStatus.Cancelled
                && m.EndDate > now, ct);

            var futureBookings = await _unitOfWork.GetRepository<Booking>().Query(asTracking: true)
                .Include(b => b.Session)
                .Where(b => b.MemberId == cancelled.MemberId && b.Status == BookingStatus.Booked && b.Session.StartDate > now)
                .ToListAsync(ct);

            foreach (var booking in futureBookings)
            {
                var covered = otherMemberships.Any(m =>
                    m.StartDate <= booking.Session.StartDate && m.EndDate >= booking.Session.EndDate);

                if (!covered)
                    booking.Status = BookingStatus.Cancelled;
            }
        }

        /// <summary>A membership with a copy (snapshot) of the plan's name, price and duration.</summary>
        private static Membership NewMembership(int memberId, Plan plan, DateTime start) => new()
        {
            MemberId = memberId,
            PlanId = plan.Id,
            StartDate = start,
            EndDate = start.AddDays(plan.DurationDays),
            Status = MembershipStatus.Active,
            PlanName = plan.Name,
            PricePaid = plan.Price,
            DurationDays = plan.DurationDays,
        };

        private static Payment NewPayment(decimal amount, PaymentMethod method, PaymentType type,
            int staffUserId, string? notes, DateTime now) => new()
        {
            Amount = amount,
            Method = method,
            Type = type,
            PaidAt = now,
            ReceivedByUserId = staffUserId,
            Notes = notes,
        };

        #endregion
    }
}
