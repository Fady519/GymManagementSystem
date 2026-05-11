using AutoMapper;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models.BookingVms;
using GymManagementBLL.View_Models.SessionVms;
using GymManagementDAL.Entities;
using GymManagementDAL.UnitOfWorkPattern;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class BookingService : IBookingService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public BookingService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }
        public IEnumerable<SessionViewModel> GetAllSessionsWithTrainerAndCategory()
        {
            var sessionRepo = _unitOfWork.SessionRepository;
            var sessions = sessionRepo.GetAllWithCategoryAndTrainer();


            var sessionsVm = _mapper.Map<IEnumerable<SessionViewModel>>(sessions);

            // Calculate Booked Slots for each session
            foreach (var sessionVm in sessionsVm)
                sessionVm.BookedSlots = sessionRepo.GetCountOfBookedSlots(sessionVm.Id);

            return sessionsVm;


        }

        public IEnumerable<MemberForSessionViewModel> GetAllMembersForUpcomingSession(int id)
        {
            var BookingRepo = _unitOfWork.BookingRepository;
            var MemberForSessions = BookingRepo.GetSessionById(id);
            
            var memberForBookingVm = _mapper.Map<IEnumerable<MemberForSessionViewModel>>(MemberForSessions);
            return memberForBookingVm;

        }

        public IEnumerable<MemberForSessionViewModel> GetAllMembersForOngoingSession(int id)
        {
            var BookingRepo = _unitOfWork.BookingRepository;
            var MembersForSession = BookingRepo.GetSessionById(id);
            var memberForBookingVm = _mapper.Map<IEnumerable<MemberForSessionViewModel>>(MembersForSession);
            return memberForBookingVm;
        }

        // BUSINESS RULE #4: A booking can only be created for a future session.
        // Any session that has already started or finished cannot be booked.
        // BUSINESS RULE #8: Any action such as booking, cancellation, or marking attendance is not allowed
        // if the referenced booking or session does not exist.
        public bool CreateBooking(CreateBookingViewModel createBookingViewModel)
        {
            try
            {
                var session = _unitOfWork.SessionRepository.GetById(createBookingViewModel.SessionId);
                if (session is null || session.StartDate <= DateTime.UtcNow)
                    return false;

                // BUSINESS RULE #5: A member must have an Active membership in order to book a session.
                var membershipRepo = _unitOfWork.MembershipRepository;
                var activeMembership = membershipRepo.GetFirstOrDefault(m => m.MemberId == createBookingViewModel.MemberId && m.Status == "Active");

                if (activeMembership is null)
                    return false;

                // BUSINESS RULE #6: A session must have available capacity.
                // Booking is rejected if capacity is full.

                var sessionRepo = _unitOfWork.SessionRepository;
                var bookedSlots = sessionRepo.GetCountOfBookedSlots(createBookingViewModel.SessionId);

                var availableSlots = session.Capacity - bookedSlots;
                if (availableSlots == 0)
                    return false;

                var booking = _mapper.Map<MemberSession>(createBookingViewModel);
                // BUSINESS RULE #7: When a booking is created, IsAttended is always set to false by default.

                booking.IsAttended = false;
                _unitOfWork.BookingRepository.Add(booking);


                return _unitOfWork.SaveChanges() > 0;
            }
            catch
            {
                return false;
            }

        }

        // BUSINESS RULE #6: Attendance can only be marked for ongoing sessions (start date has passed but end date has not).
        public bool MemberAttended(MemberAttendOrCancelViewModel model)
        {
            try
            {
                var memberSession = _unitOfWork.GetRepository<MemberSession>()
                                           .GetAll(X => X.MemberId == model.MemberId && X.SessionId == model.SessionId)
                                           .FirstOrDefault();
                if (memberSession is null) return false;

                memberSession.IsAttended = true;
                memberSession.UpdatedAt = DateTime.Now;
                _unitOfWork.GetRepository<MemberSession>().Update(memberSession);
                return _unitOfWork.SaveChanges() > 0;
            }
            catch
            {
                return false;
            }
        }



        // BUSINESS RULE #8: Any action such as booking, cancellation, or marking attendance is not allowed
        // if the referenced booking or session does not exist.
        public bool CancelBooking(MemberAttendOrCancelViewModel model)
        {
            try
            {
                var session = _unitOfWork.SessionRepository.GetById(model.SessionId);
                if (session is null || session.StartDate <= DateTime.Now) return false;

                // BUSINESS RULE #5: A booking can only be cancelled for future sessions. Once the session has started, cancellation is not allowed.
                var Booking = _unitOfWork.BookingRepository.GetAll(X => X.MemberId == model.MemberId && X.SessionId == model.SessionId)
                                                           .FirstOrDefault();
                if (Booking is null) return false;
                _unitOfWork.BookingRepository.Delete(Booking);
                return _unitOfWork.SaveChanges() > 0;
            }
            catch
            {
                return false;
            }
        }

        #region Helpers 

        // BUSINESS RULE #3: Member cannot book the same session twice

        public IEnumerable<MemberSelectListViewModel> GetMembersForDropdown(int id)
        {
            // Get Members who already booked this session
            var bookingRepo = _unitOfWork.BookingRepository;
            var bookedMemberIds = bookingRepo.GetAll(s => s.Id == id)
                                                      .Select(s => s.MemberId)
                                                      .ToList();

            var availableMembersToBook = _unitOfWork.GetRepository<Member>().GetAll(m => !bookedMemberIds.Contains(m.Id));

            var memberSelectListViewModel = _mapper.Map<IEnumerable<MemberSelectListViewModel>>(availableMembersToBook);

            return memberSelectListViewModel;
                                                            
        } 

        #endregion
    }
}
