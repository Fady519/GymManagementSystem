namespace GymManagementBLL.DTOs.Users
{
    public sealed record UserResponse(
        int Id,
        string Email,
        string FullName,
        IReadOnlyList<string> Roles,
        bool IsActive,
        bool MustChangePassword,
        bool IsLockedOut,
        DateTime CreatedAt);

    public sealed record CreateAdminRequest(string FullName, string Email);

    /// <summary>
    /// The temporary password is shown ONCE (only in this response). It is never stored in plain text.
    /// The new admin must change it at first login. (B7: it will be emailed instead.)
    /// </summary>
    public sealed record CreatedUserResponse(UserResponse User, string TemporaryPassword);

    public sealed record SetUserStatusRequest(bool IsActive);

    /// <summary>Result of creating an account with a temporary password (used inside other services).</summary>
    public sealed record CreatedAccount(int UserId, string TemporaryPassword);
}
