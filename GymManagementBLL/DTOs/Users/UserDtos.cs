namespace GymManagementBLL.DTOs.Users
{
    /// <param name="InvitePending">The account was created but the person hasn't set a password yet.</param>
    public sealed record UserResponse(
        int Id,
        string Email,
        string FullName,
        IReadOnlyList<string> Roles,
        bool IsActive,
        bool MustChangePassword,
        bool IsLockedOut,
        bool InvitePending,
        DateTime CreatedAt);

    public sealed record CreateAdminRequest(string FullName, string Email);

    /// <summary>
    /// Nobody (not even the SuperAdmin) knows the new admin's password: they get an invite email
    /// and choose it themselves. InviteSent = false means the email could not be sent (resend it later).
    /// </summary>
    public sealed record CreatedUserResponse(UserResponse User, bool InviteSent);

    public sealed record SetUserStatusRequest(bool IsActive);

    /// <summary>Result of (re)sending an invite email.</summary>
    public sealed record InviteResponse(bool InviteSent);
}
