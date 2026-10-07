namespace GymManagementDAL.Entities.Enums
{
    /// <summary>The decision of the reception scanner.</summary>
    public enum CheckInResult
    {
        Allowed = 0,
        Denied = 1
    }

    /// <summary>Why a check-in was denied (null when Allowed).</summary>
    public enum CheckInDenyReason
    {
        /// <summary>The member never had a membership (or all of them were cancelled).</summary>
        NoMembership = 0,
        MembershipExpired = 1,
        MembershipFrozen = 2,
        /// <summary>The member only has a renewal that starts later.</summary>
        MembershipNotStarted = 3,
        /// <summary>Only one allowed check-in per day (gym local day).</summary>
        AlreadyCheckedInToday = 4
    }
}
