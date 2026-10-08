namespace GymManagementBLL.DTOs.Public
{
    /// <summary>
    /// The numbers on the public landing page. ActiveMembers uses the same rule as the admin dashboard,
    /// so both always show the same number. FromMonthlyPrice = the cheapest active plan's price
    /// for 30 days ("from 300 EGP / month"), or null when there is no active plan.
    /// </summary>
    public sealed record PublicStatsResponse(
        int ActiveMembers,
        int Trainers,
        int Programs,
        int ClassesThisWeek,
        decimal? FromMonthlyPrice);

    /// <summary>
    /// A trainer card on the public website. On purpose it has NO email, phone, date of birth,
    /// address or account id: the website is open to everyone, so only public information is sent.
    /// </summary>
    public sealed record PublicTrainerResponse(
        int Id,
        string Name,
        string CategoryName,
        int UpcomingClasses,
        DateTime JoinedAt);
}
