using GymManagementDAL.Entities.Enums;

namespace GymManagementBLL.DTOs.CheckIns
{
    /// <summary>What the reception scanner sends: the text inside the member's QR.</summary>
    public sealed record CheckInRequest(string Code);

    /// <summary>
    /// What the reception screen shows after a scan. Allowed: green screen with the photo, plan and days left.
    /// Denied: red screen with the reason (the photo is still shown, so staff can talk to the right person).
    /// </summary>
    public sealed record CheckInResultResponse(
        int CheckInId,
        CheckInResult Result,
        CheckInDenyReason? DenyReason,
        string Message,
        int MemberId,
        string MemberName,
        string? PhotoUrl,
        string? PlanName,
        // UTC. The end of the covered time, including renewals that start right after the current membership.
        DateTime? CoveredUntil,
        int? DaysLeft,
        DateTime CheckedInAt);

    /// <summary>One row of the check-ins log.</summary>
    public sealed record CheckInResponse(
        int Id,
        int MemberId,
        string MemberName,
        CheckInResult Result,
        CheckInDenyReason? DenyReason,
        DateTime CheckedInAt,
        DateOnly Day,
        string? CheckedBy);

    /// <summary>The member's QR content. The frontend draws the QR image from this text.</summary>
    public sealed record CheckInCodeResponse(string Code);

    /// <summary>Filters for the check-ins log. From/To are gym-local days (inclusive).</summary>
    public sealed class CheckInQuery
    {
        public DateOnly? From { get; set; }
        public DateOnly? To { get; set; }
        public int? MemberId { get; set; }
        public CheckInResult? Result { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
