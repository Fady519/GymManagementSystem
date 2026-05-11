using GymManagementBLL.View_Models;
using GymManagementBLL.View_Models.MemberVm;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IMemberService
    {
       
        IEnumerable<MemberViewModel> GetAllMembers();

        bool CreateMember(CreateMemberViewModel createMember);

        MemberViewModel? GetMemberDetails(int memberId);

        HealthRecordViewModel? GetMemberHealthDetails(int memberId);

        MemberToUpdateViewModel? GetMemberDetailsToUpdate(int memberId);

        bool UpdateMember(int memberId,MemberToUpdateViewModel memberToUpdate);

        bool RemoveMember(int memberId);
    }
}
