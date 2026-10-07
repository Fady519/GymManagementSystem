using GymManagementBLL.Abstractions;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace GymManagement.Tests.Infrastructure
{
    /// <summary>
    /// Replaces the SMTP sender in tests: emails are kept in memory so a test can read them
    /// (e.g. take the token out of a reset link). Nothing is sent over the network.
    /// </summary>
    public sealed partial class FakeEmailSender : IEmailSender
    {
        private readonly ConcurrentQueue<EmailMessage> _sent = new();

        /// <summary>Set to true to simulate a mail server that is down (SendAsync returns false).</summary>
        public bool SimulateFailure { get; set; }

        public Task<bool> SendAsync(EmailMessage message, CancellationToken ct = default)
        {
            if (SimulateFailure)
                return Task.FromResult(false);

            _sent.Enqueue(message);
            return Task.FromResult(true);
        }

        /// <summary>All emails sent to this address (tests use unique emails, so they don't see each other's).</summary>
        public IReadOnlyList<EmailMessage> SentTo(string email)
            => _sent.Where(m => string.Equals(m.ToEmail, email, StringComparison.OrdinalIgnoreCase)).ToList();

        /// <summary>The newest email sent to this address (fails the test if there is none).</summary>
        public EmailMessage LastSentTo(string email)
        {
            var emails = SentTo(email);
            Assert.NotEmpty(emails);
            return emails[^1];
        }

        /// <summary>Reads the token from the link in the email (token=... up to the next &amp; or quote).</summary>
        public static string ExtractToken(EmailMessage message)
        {
            var match = TokenRegex().Match(message.HtmlBody);
            Assert.True(match.Success, "The email has no token link.");
            return match.Groups[1].Value;
        }

        [GeneratedRegex("token=([^&\"<\\s]+)")]
        private static partial Regex TokenRegex();
    }
}
