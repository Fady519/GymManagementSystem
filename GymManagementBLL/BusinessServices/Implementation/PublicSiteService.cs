using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.DTOs.Public;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.BusinessServices.Implementation
{
    /// <summary>
    /// Data for the public landing page. Every number is a COUNT / MIN in SQL (no table is loaded into memory),
    /// and the trainer cards are projected to a small DTO without personal data.
    /// </summary>
    public class PublicSiteService : IPublicSiteService
    {
        /// <summary>Plan prices are shown "per month" = per 30 days.</summary>
        private const int DaysPerMonth = 30;

        private const int ClassesWindowDays = 7;

        private readonly IUnitOfWork _unitOfWork;
        private readonly IClock _clock;

        public PublicSiteService(IUnitOfWork unitOfWork, IClock clock)
        {
            _unitOfWork = unitOfWork;
            _clock = clock;
        }

        public async Task<PublicStatsResponse> GetStatsAsync(CancellationToken ct = default)
        {
            var now = _clock.UtcNow;
            var weekEnd = now.AddDays(ClassesWindowDays);

            // EXACTLY the "active members" rule of the admin dashboard (AnalyticsService.GetSummaryAsync),
            // so the website and the dashboard never show different numbers: MEMBERS (each once) that have
            // a running membership that is not cancelled and not frozen right now.
            var activeMembers = await _unitOfWork.GetRepository<Member>().CountAsync(m => m.Memberships.Any(x =>
                x.Status != MembershipStatus.Cancelled && x.StartDate <= now && x.EndDate > now
                && !(x.Status == MembershipStatus.Frozen && x.FrozenUntil > now)), ct);

            // The query filters already hide deleted trainers and categories.
            var trainers = await _unitOfWork.GetRepository<Trainer>().CountAsync(null, ct);
            var programs = await _unitOfWork.GetRepository<Category>().CountAsync(null, ct);

            // Cancelled sessions are not "classes" anymore.
            var classesThisWeek = await _unitOfWork.GetRepository<Session>().CountAsync(s =>
                s.Status == SessionStatus.Scheduled && s.StartDate >= now && s.StartDate < weekEnd, ct);

            // "From X EGP / month": the cheapest ACTIVE plan, converted to 30 days (a 90-day plan for 900 = 300 / month).
            // (decimal?) makes MIN return null instead of throwing when there is no active plan.
            var fromMonthlyPrice = await _unitOfWork.GetRepository<Plan>().Query()
                .Where(p => p.IsActive)
                .MinAsync(p => (decimal?)(p.Price * DaysPerMonth / p.DurationDays), ct);

            return new PublicStatsResponse(
                activeMembers,
                trainers,
                programs,
                classesThisWeek,
                fromMonthlyPrice is null ? null : Math.Round(fromMonthlyPrice.Value, 2));
        }

        public async Task<IReadOnlyList<PublicTrainerResponse>> GetTrainersAsync(CancellationToken ct = default)
        {
            var now = _clock.UtcNow;

            // Projection: SQL returns only these public columns (never email, phone, birth date, address or UserId).
            // The ordering is done in SQL before the projection: busiest trainers first, then by name (Id = stable tiebreaker).
            return await _unitOfWork.GetRepository<Trainer>().Query()
                .OrderByDescending(t => t.Sessions.Count(s => s.Status == SessionStatus.Scheduled && s.StartDate > now))
                .ThenBy(t => t.Name)
                .ThenBy(t => t.Id)
                .Select(t => new PublicTrainerResponse(
                    t.Id,
                    t.Name,
                    t.Category.Name,
                    t.Sessions.Count(s => s.Status == SessionStatus.Scheduled && s.StartDate > now),
                    t.CreatedAt))
                .ToListAsync(ct);
        }
    }
}
