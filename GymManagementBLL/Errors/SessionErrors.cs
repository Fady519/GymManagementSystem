using GymManagementBLL.Common;

namespace GymManagementBLL.Errors
{
    public static class SessionErrors
    {
        public static Error NotFound(int id) =>
            Error.NotFound("Session.NotFound", $"Session with id {id} was not found.");

        public static Error TrainerNotFound(int trainerId) =>
            Error.Validation("Session.TrainerNotFound", $"Trainer with id {trainerId} does not exist.");

        public static Error CategoryNotFound(int categoryId) =>
            Error.Validation("Session.CategoryNotFound", $"Category with id {categoryId} does not exist.");

        public static readonly Error TrainerCategoryMismatch =
            Error.Validation("Session.TrainerCategoryMismatch", "The session's category must be the trainer's speciality.");

        public static readonly Error TrainerBusy =
            Error.Conflict("Session.TrainerBusy", "The trainer already has another session at this time.");

        public static readonly Error NotUpcoming =
            Error.Conflict("Session.NotUpcoming", "Only upcoming scheduled sessions can be changed. Past sessions are read-only.");

        public static Error CapacityBelowBookings(int bookedCount) =>
            Error.Conflict("Session.CapacityBelowBookings", $"The capacity can't be less than the current bookings ({bookedCount}).");

        public static readonly Error HasBookings =
            Error.Conflict("Session.HasBookings", "A session with bookings can't be deleted. Cancel it instead.");

        public static readonly Error Full =
            Error.Conflict("Session.Full", "The session is full.");

        public static readonly Error ChangedByAnotherUser =
            Error.Conflict("Session.Changed", "The session was changed by someone else at the same moment. Reload it and try again.");
    }

    public static class BookingErrors
    {
        public static Error NotFound(int id) =>
            Error.NotFound("Booking.NotFound", $"Booking with id {id} was not found.");

        public static readonly Error MemberRequired =
            Error.Validation("Booking.MemberRequired", "Choose the member to book.");

        public static Error MemberNotFound(int memberId) =>
            Error.NotFound("Booking.MemberNotFound", $"Member with id {memberId} was not found.");

        public static readonly Error SessionNotBookable =
            Error.Conflict("Booking.SessionNotBookable", "Only upcoming scheduled sessions can be booked.");

        public static readonly Error NoValidMembership =
            Error.Conflict("Booking.NoValidMembership", "The member needs an active membership that covers the session date.");

        public static readonly Error AlreadyBooked =
            Error.Conflict("Booking.AlreadyBooked", "The member has already booked this session.");

        public static readonly Error MemberBusy =
            Error.Conflict("Booking.MemberBusy", "The member has another booking at the same time.");

        public static readonly Error NotActive =
            Error.Conflict("Booking.NotActive", "This booking is already cancelled or attended.");

        public static readonly Error SessionStarted =
            Error.Conflict("Booking.SessionStarted", "The session has already started.");

        public static Error CancellationDeadlinePassed(int hours) =>
            Error.Conflict("Booking.CancellationDeadlinePassed", $"Bookings can be cancelled until {hours} hours before the session. Please contact the gym.");

        public static readonly Error AttendanceNotOpen =
            Error.Conflict("Booking.AttendanceNotOpen", "Attendance can only be marked while the session is running.");

        public static readonly Error NotYourBooking =
            Error.Forbidden("Booking.NotYours", "You can only manage your own bookings.");

        public static readonly Error NotYourSession =
            Error.Forbidden("Session.NotYours", "Only the session's trainer or an admin can do this.");
    }
}
