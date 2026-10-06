using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Plans;
using GymManagementBLL.Errors;
using GymManagementBLL.Mapping;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.UnitOfWorkPattern;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class PlanService : IPlanService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IClock _clock;

        public PlanService(IUnitOfWork unitOfWork, IClock clock)
        {
            _unitOfWork = unitOfWork;
            _clock = clock;
        }

        public async Task<IReadOnlyList<PlanResponse>> GetAllAsync(bool? isActive = null, CancellationToken ct = default)
        {
            var plans = isActive is null
                ? await _unitOfWork.GetRepository<Plan>().ListAsync(ct: ct)
                : await _unitOfWork.GetRepository<Plan>().ListAsync(p => p.IsActive == isActive.Value, ct);

            return plans.OrderBy(p => p.Price).Select(p => p.ToResponse()).ToList();
        }

        public async Task<Result<PlanResponse>> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var plan = await _unitOfWork.GetRepository<Plan>().GetByIdAsync(id, ct);

            if (plan is null)
                return PlanErrors.NotFound(id);

            return plan.ToResponse();
        }

        public async Task<Result<PlanResponse>> CreateAsync(CreatePlanRequest request, CancellationToken ct = default)
        {
            var repo = _unitOfWork.GetRepository<Plan>();
            var name = request.Name.Trim();

            if (await repo.AnyAsync(p => p.Name == name, ct))
                return PlanErrors.NameTaken(name);

            var plan = new Plan
            {
                Name = name,
                Description = request.Description.Trim(),
                DurationDays = request.DurationDays,
                Price = request.Price,
                IsActive = true,
            };

            repo.Add(plan);
            await _unitOfWork.SaveChangesAsync(ct);

            return plan.ToResponse();
        }

        public async Task<Result<PlanResponse>> UpdateAsync(int id, UpdatePlanRequest request, CancellationToken ct = default)
        {
            var repo = _unitOfWork.GetRepository<Plan>();
            var plan = await repo.GetByIdAsync(id, ct);

            if (plan is null)
                return PlanErrors.NotFound(id);

            var name = request.Name.Trim();

            if (await repo.AnyAsync(p => p.Id != id && p.Name == name, ct))
                return PlanErrors.NameTaken(name);

            // Editing is always allowed: existing memberships keep their own copy
            // (snapshot) of the plan's name, price and duration.
            plan.Name = name;
            plan.Description = request.Description.Trim();
            plan.DurationDays = request.DurationDays;
            plan.Price = request.Price;

            await _unitOfWork.SaveChangesAsync(ct);

            return plan.ToResponse();
        }

        public async Task<Result<PlanResponse>> SetStatusAsync(int id, bool isActive, CancellationToken ct = default)
        {
            var plan = await _unitOfWork.GetRepository<Plan>().GetByIdAsync(id, ct);

            if (plan is null)
                return PlanErrors.NotFound(id);

            // Deactivating only hides the plan from new subscriptions;
            // existing memberships keep running, so it is always allowed.
            if (plan.IsActive != isActive)
            {
                plan.IsActive = isActive;
                await _unitOfWork.SaveChangesAsync(ct);
            }

            return plan.ToResponse();
        }

        public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
        {
            var repo = _unitOfWork.GetRepository<Plan>();
            var plan = await repo.GetByIdAsync(id, ct);

            if (plan is null)
                return PlanErrors.NotFound(id);

            if (await HasActiveMembershipsAsync(id, ct))
                return PlanErrors.HasActiveMemberships;

            // Soft delete: the row stays in the database (IsDeleted = true),
            // so old memberships and revenue reports still work.
            repo.Remove(plan);
            await _unitOfWork.SaveChangesAsync(ct);

            return Result.Success();
        }

        #region Helper Methods

        /// <summary>Active = not cancelled and not expired yet (frozen memberships count as active).</summary>
        private Task<bool> HasActiveMembershipsAsync(int planId, CancellationToken ct)
        {
            var now = _clock.UtcNow;
            return _unitOfWork.GetRepository<Membership>()
                .AnyAsync(m => m.PlanId == planId
                               && m.Status != MembershipStatus.Cancelled
                               && m.EndDate > now, ct);
        }

        #endregion
    }
}
