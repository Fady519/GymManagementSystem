using Microsoft.IdentityModel.Tokens;

namespace GymManagementBLL.Common
{
    /// <summary>
    /// Names and helpers for the one-time tokens inside email links.
    /// Identity tokens contain characters like '+' and '/', so they are Base64Url-encoded:
    /// the token in the link is exactly the token the frontend sends back.
    /// </summary>
    public static class AccountTokens
    {
        /// <summary>Token provider registered for invites (its links live longer than reset links).</summary>
        public const string InviteProvider = "Invite";
        public const string InvitePurpose = "AcceptInvite";

        public static string Encode(string token) => Base64UrlEncoder.Encode(token);

        /// <returns>The original token, or null if the text is not valid Base64Url.</returns>
        public static string? Decode(string encoded)
        {
            try
            {
                return Base64UrlEncoder.Decode(encoded);
            }
            catch (Exception ex) when (ex is FormatException or ArgumentException)
            {
                return null;
            }
        }
    }
}
