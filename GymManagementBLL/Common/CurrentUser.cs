namespace GymManagementBLL.Common
{
    /// <summary>
    /// Who is calling, read from the access token by the controller.
    /// Services use it for rules like "a member can only book for himself"
    /// or "only the session's trainer can mark attendance".
    /// </summary>
    public sealed record CurrentUser(bool IsAdmin, int? MemberId, int? TrainerId);
}
