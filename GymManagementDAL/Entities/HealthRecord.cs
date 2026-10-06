namespace GymManagementDAL.Entities
{
    /// <summary>A member's health data. Optional, one-to-one with <see cref="Member"/>.</summary>
    public class HealthRecord : BaseEntity
    {
        public int MemberId { get; set; }
        public Member Member { get; set; } = null!;

        public decimal Height { get; set; }
        public decimal Weight { get; set; }
        public string BloodType { get; set; } = null!;
        public string? Note { get; set; }
    }
}
