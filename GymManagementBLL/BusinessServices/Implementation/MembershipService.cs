using AutoMapper;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models.MembershipsVms;
using GymManagementDAL.Entities;
using GymManagementDAL.UnitOfWorkPattern;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class MembershipService : IMembershipService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public MembershipService(IUnitOfWork unitOfWork, IMapper mapper)
        {
         _unitOfWork = unitOfWork;
           _mapper = mapper;
        }
        public IEnumerable<MembershipViewModel> GetAllMemberships()
        {
            var memberships = _unitOfWork.MembershipRepository.GetAllMembershipsWithMembersAndPlans(m => m.Status == "Active");
            var membershipViewModels = _mapper.Map<IEnumerable<MembershipViewModel>>(memberships);

            return membershipViewModels;

        }

        public bool CreateMembership(CreateMembershipViewModel model)
        {
            if (!IsMemberExists(model.MemberId) || !IsPlanExists(model.PlanId) || HasActiveMembership(model.MemberId))
                return false;

            var membershipRepo = _unitOfWork.GetRepository<Membership>();

            var membershipToCreate = _mapper.Map<Membership>(model);

            var plan = _unitOfWork.GetRepository<Plan>().GetById(model.PlanId);

            // BUSSINESS RULE #5: When a membership is created, its EndDate
            // is automatically calculated based on the plan duration.
            membershipToCreate.EndDate = membershipToCreate.CreatedAt.AddDays(plan!.DurationDays);

            membershipRepo.Add(membershipToCreate);

            return _unitOfWork.SaveChanges() > 0;
        }

        // BUSSINESS RULE #7: Cancellation Delete Memberships For Member On This Plan 
        // BUSSINESS RULE #8: A membership can only be deleted if it is Active.
        public bool DeleteMembership(int MemberId)
        {
            var membershipRepo = _unitOfWork.MembershipRepository;
            var membershipToDelete = membershipRepo.GetFirstOrDefault(m => m.MemberId == MemberId && m.Status == "Active");

            if (membershipToDelete is null)
                return false;

            membershipRepo.Delete(membershipToDelete);
            return _unitOfWork.SaveChanges() > 0;
        }

        public IEnumerable<PlanSelectListViewModel> GetPlansForDropDown()
        {
            var Plans = _unitOfWork.GetRepository<Plan>().GetAll(X => X.IsActive == true);
            return _mapper.Map<IEnumerable<PlanSelectListViewModel>>(Plans);
        }
        public IEnumerable<MemberSelectListViewModel> GetMembersForDropDown()
        {
            var Members = _unitOfWork.GetRepository<Member>().GetAll();
            return _mapper.Map<IEnumerable<MemberSelectListViewModel>>(Members);
        }


        #region Helper methods


        // BUSSINESS RULE #1: A membership can only be created if the member exists in the system
        private bool IsMemberExists(int memberId)
            => _unitOfWork.GetRepository<Member>().GetById(memberId) is not null;

        // BUSSINESS RULE #2: A membership can only be created if the plan exists in the system.
        private bool IsPlanExists(int planId)
            => _unitOfWork.GetRepository<Plan>().GetById(planId) is not null;
        // BUSSINESS RULE #3: A member cannot have more than one Active membership at the same time.
        private bool HasActiveMembership(int memberId)
        => _unitOfWork.MembershipRepository.GetAllMembershipsWithMembersAndPlans(m => m.Status == "Active" && m.MemberId == memberId).Any();

        #endregion

    }
}
