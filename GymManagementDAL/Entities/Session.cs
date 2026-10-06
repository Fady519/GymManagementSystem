using GymManagementDAL.Entities.Enums;

namespace GymManagementDAL.Entities
{
    public class Session : BaseEntity
    {
        public string Description { get; set; } = null!;
        public int Capacity { get; set; }

        /// <summary>UTC.</summary>
        public DateTime StartDate { get; set; }

        /// <summary>UTC.</summary>
        public DateTime EndDate { get; set; }

        public SessionStatus Status { get; set; } = SessionStatus.Scheduled;

        /// <summary>
        /// Concurrency token: SQL Server changes it on every update. If two people try to
        /// book the last seat at the same moment, the second save fails instead of overbooking.
        /// </summary>
        public byte[] RowVersion { get; set; } = null!;

        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;

        public int TrainerId { get; set; }
        public Trainer Trainer { get; set; } = null!;

        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}
