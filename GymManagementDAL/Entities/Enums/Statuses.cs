namespace GymManagementDAL.Entities.Enums
{
    /// <summary>
    /// Stored status of a session. Whether it is upcoming / ongoing / completed is
    /// NOT stored: it is calculated from StartDate/EndDate and the current time.
    /// </summary>
    public enum SessionStatus
    {
        Scheduled = 0,
        Cancelled = 1
    }

    /// <summary>
    /// Stored status of a membership (only states caused by an action).
    /// "Expired" is NOT stored: a membership is expired when EndDate &lt;= now.
    /// </summary>
    public enum MembershipStatus
    {
        Active = 0,
        Frozen = 1,
        Cancelled = 2
    }

    public enum BookingStatus
    {
        Booked = 0,
        Attended = 1,
        Cancelled = 2
    }
}
