using AutoMapper;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models.PlanVm;
using GymManagementDAL.Entities;
using GymManagementDAL.UnitOfWorkPattern;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class PlanService : IPlanService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public PlanService(IUnitOfWork unitOfWork,IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }
        public IEnumerable<PlanViewModel> GetAllPlans()
        {
            var plans = _unitOfWork.GetRepository<Plan>().GetAll();

            if (plans is null || !plans.Any())
                return [];

            #region Manual Mapping
            //return plans.Select(P => new PlanViewModel
            //{
            //    Id = P.Id,
            //    Name = P.Name,
            //    Description = P.Description,
            //    Price = P.Price,
            //    IsActive = P.IsActive,
            //    DurationDays = P.DurationDays,
            //}); 
            #endregion

            return _mapper.Map<IEnumerable<PlanViewModel>>(plans);
        }

        public PlanViewModel? GetPlanDetails(int PlanId)
        {
            var plan = _unitOfWork.GetRepository<Plan>().GetById(PlanId);

            if (plan is null) return null;

            #region Manual Mapping
            //return new PlanViewModel
            //{
            //    Id = plan.Id,
            //    Name = plan.Name,
            //    Description = plan.Description,
            //    Price = plan.Price,
            //    IsActive = plan.IsActive,
            //    DurationDays = plan.DurationDays,
            //}; 
            #endregion

            return _mapper.Map<PlanViewModel>(plan);
        }

        public PlanToUpdateViewModel? GetPlanToUpdate(int PlanId)
        {
            var plan = _unitOfWork.GetRepository<Plan>().GetById(PlanId);

            if (plan is null || plan.IsActive == false || HasActiveMemberships(PlanId))
                return null;

            #region Manual Mapping
            //return new PlanToUpdateViewModel
            //{
            //    Name = plan.Name,
            //    Description = plan.Description,
            //    Price = plan.Price,
            //    DurationDays = plan.DurationDays,
            //}; 
            #endregion

            return _mapper.Map<PlanToUpdateViewModel>(plan);
        }

        public bool ToggleStatus(int planId)
        {
            var planRepo = _unitOfWork.GetRepository<Plan>();
            var plan = planRepo.GetById(planId);

            if (plan is null || HasActiveMemberships(planId))
                return false;

            plan.IsActive = plan.IsActive == true ? false : true;

            plan.UpdatedAt = DateTime.Now;

            planRepo.Update(plan);

            return _unitOfWork.SaveChanges() > 0;
        }

        public bool UpdatePlan(int planId, PlanToUpdateViewModel planToUpdate)
        {
            var planRepo = _unitOfWork.GetRepository<Plan>();
            var plan = planRepo.GetById(planId);

            if (plan is null || planToUpdate is null)
                return false;

            //Description
            //Price
            //DurationDays
            #region Manual Mapping

            //(plan.Description, plan.DurationDays, plan.Price)
            //    = (planToUpdate.Description, planToUpdate.DurationDays, planToUpdate.Price);

            //plan.UpdatedAt = DateTime.Now; 
            #endregion

            _mapper.Map(planToUpdate, plan);

            try
            {

                planRepo.Update(plan);

                return _unitOfWork.SaveChanges() > 0;
            }
            catch (Exception)
            {

                return false;
            }

        }


        #region Helper Methods

        private bool HasActiveMemberships(int planId)
        {
            var activeMemberships = _unitOfWork.GetRepository<Membership>()
                .GetAll(X => X.PlanId == planId && X.Status == "Active");

            return activeMemberships.Any();
        }
        #endregion
    }
}
