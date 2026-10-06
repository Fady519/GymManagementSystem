using GymManagementDAL.Entities.Enums;

namespace GymManagementDAL.Entities
{
    /// <summary>A member's booking of a session (was "MemberSession").</summary>
    public class Booking : BaseEntity
    {
        public int MemberId { get; set; }
        public Member Member { get; set; } = null!;

        public int SessionId { get; set; }
        public Session Session { get; set; } = null!;

        public BookingStatus Status { get; set; } = BookingStatus.Booked;
    }
}
