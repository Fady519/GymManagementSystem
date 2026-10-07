using System.Security.Cryptography;

namespace GymManagementBLL.Common
{
    /// <summary>QR check-in codes: 32 random hex characters (same format as the database default).</summary>
    public static class CheckInCodes
    {
        /// <summary>16 random bytes from the operating system's secure generator (not Random, which can be guessed).</summary>
        public static string New() => Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
    }
}
