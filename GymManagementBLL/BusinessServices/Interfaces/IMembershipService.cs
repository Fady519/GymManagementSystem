using GymManagementBLL.BusinessServices.Implementation;
using GymManagementBLL.View_Models.MembershipsVms;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IMembershipService
    {
        IEnumerable<MembershipViewModel> GetAllMemberships();
        IEnumerable<PlanSelectListViewModel> GetPlansForDropDown();
        IEnumerable<MemberSelectListViewModel> GetMembersForDropDown();
        bool CreateMembership(CreateMembershipViewModel model);
        bool DeleteMembership(int MemberId);


    }
}
