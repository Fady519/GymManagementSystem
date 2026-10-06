namespace GymManagementDAL.Entities.Identity
{
    /// <summary>
    /// A long-lived token (7 days) used to get a new short-lived access token (15 min)
    /// without asking for the password again.
    /// Only a SHA-256 hash is stored: if the database leaks, the tokens can't be used.
    /// </summary>
    public class RefreshToken : BaseEntity
    {
        public int UserId { get; set; }

        /// <summary>SHA-256 of the token, as 64 hex characters.</summary>
        public string TokenHash { get; set; } = null!;

        public DateTime ExpiresAt { get; set; }

        /// <summary>Set when the token is used (rotation), on logout, or when the user is disabled.</summary>
        public DateTime? RevokedAt { get; set; }

        public bool IsActive(DateTime utcNow) => RevokedAt is null && ExpiresAt > utcNow;
    }
}
