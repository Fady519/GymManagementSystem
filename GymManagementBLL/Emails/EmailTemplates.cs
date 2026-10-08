using System.Net;

namespace GymManagementBLL.Emails
{
    /// <summary>
    /// The HTML of every email the app sends. Plain C# strings (no template engine) so it is easy to read.
    /// Everything that comes from users (names, descriptions) is HTML-encoded to prevent HTML injection.
    /// </summary>
    public static class EmailTemplates
    {
        private const string Green = "#16a34a";

        public static (string Subject, string Html) Invite(string gymName, string name, string role, string link, int days)
        {
            var body =
                "<p>Hi " + E(name) + ",</p>" +
                "<p>An account was created for you at <b>" + E(gymName) + "</b> with the role <b>" + E(role) + "</b>.</p>" +
                "<p>Click the button to choose your password:</p>" +
                Button("Set my password", link) +
                "<p style=\"color:#6b7280\">This link works for " + days + " day(s) and only once.</p>";

            return ("You're invited to " + gymName, Layout(gymName, body));
        }

        public static (string Subject, string Html) ResetPassword(string gymName, string name, string link, int minutes)
        {
            var body =
                "<p>Hi " + E(name) + ",</p>" +
                "<p>We received a request to reset your password.</p>" +
                Button("Reset my password", link) +
                "<p style=\"color:#6b7280\">This link works for " + minutes + " minutes and only once. " +
                "If you didn't ask for this, ignore this email: your password stays the same.</p>";

            return ("Reset your " + gymName + " password", Layout(gymName, body));
        }

        public static (string Subject, string Html) SessionCancelled(string gymName, string name, string session, string localStart,
            string reason)
        {
            var body =
                "<p>Hi " + E(name) + ",</p>" +
                "<p>Sorry, the session <b>" + E(session) + "</b> on <b>" + E(localStart) + "</b> was cancelled.</p>" +
                "<p><b>Reason:</b> " + E(reason) + "</p>" +
                "<p>Your booking was cancelled too. You can book another session from your account.</p>";

            return ("Session cancelled: " + session, Layout(gymName, body));
        }

        #region Helpers

        private static string E(string text) => WebUtility.HtmlEncode(text);

        private static string Button(string text, string link)
            => "<p><a href=\"" + E(link) + "\" style=\"display:inline-block;background:" + Green +
               ";color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold\">" +
               E(text) + "</a></p>" +
               "<p style=\"color:#6b7280;font-size:12px\">Or copy this link: " + E(link) + "</p>";

        private static string Layout(string gymName, string body)
            => "<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:8px\">" +
               "<div style=\"background:" + Green + ";color:#ffffff;padding:16px 24px;font-size:20px;font-weight:bold\">" +
               E(gymName) + "</div>" +
               "<div style=\"padding:24px;color:#111827;line-height:1.5\">" + body + "</div></div>";

        #endregion
    }
}
