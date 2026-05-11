namespace GymManagementBLL.View_Models.MembershipsVms
{
    public class MembershipViewModel
    {
        public int MemberId { get; set; }
        public string MemberName { get; set; }
        public string PlanName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}
