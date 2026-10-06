using System.ComponentModel.DataAnnotations;

namespace GymManagementBLL.Options
{
    /// <summary>
    /// Settings for creating/validating JWTs, read from the "Jwt" config section.
    /// The Key is a secret: User Secrets locally, environment variable (Jwt__Key) on the server.
    /// The app refuses to start if a required value is missing (ValidateOnStart).
    /// </summary>
    public sealed class JwtOptions
    {
        public const string SectionName = "Jwt";

        [Required]
        public string Issuer { get; set; } = null!;

        [Required]
        public string Audience { get; set; } = null!;

        /// <summary>HMAC-SHA256 signing key. At least 32 characters (256 bits).</summary>
        [Required, MinLength(32)]
        public string Key { get; set; } = null!;

        [Range(1, 60)]
        public int AccessTokenMinutes { get; set; } = 15;

        [Range(1, 30)]
        public int RefreshTokenDays { get; set; } = 7;
    }
}
