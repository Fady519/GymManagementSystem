using GymManagementBLL.BusinessServices.Implementation;
using GymManagementBLL.View_Models.BookingVms;
using GymManagementBLL.View_Models.SessionVms;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface IBookingService
    {
        IEnumerable<SessionViewModel> GetAllSessionsWithTrainerAndCategory();
        IEnumerable<MemberForSessionViewModel> GetAllMembersForUpcomingSession(int id);
        IEnumerable<MemberForSessionViewModel> GetAllMembersForOngoingSession(int id);
        bool CreateBooking(CreateBookingViewModel createBookingViewModel);
        IEnumerable<MemberSelectListViewModel> GetMembersForDropdown(int id);
        bool MemberAttended(MemberAttendOrCancelViewModel model);
        bool CancelBooking(MemberAttendOrCancelViewModel model);
    }
}
