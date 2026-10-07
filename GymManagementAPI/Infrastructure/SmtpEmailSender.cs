using GymManagementBLL.Abstractions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using System.ComponentModel.DataAnnotations;

namespace GymManagementAPI.Infrastructure
{
    /// <summary>
    /// Mail server settings ("Smtp" section). Development uses smtp4dev (a fake mail server on
    /// localhost:25 with a web inbox), so no real email is ever sent while testing.
    /// Username / Password go in user-secrets or environment variables, never in appsettings.
    /// </summary>
    public sealed class SmtpOptions
    {
        public const string SectionName = "Smtp";

        [Required]
        public string Host { get; set; } = "localhost";

        [Range(1, 65535)]
        public int Port { get; set; } = 25;

        /// <summary>true for real providers (Gmail, SendGrid...); false for smtp4dev.</summary>
        public bool UseSsl { get; set; }

        public string? Username { get; set; }
        public string? Password { get; set; }

        [Required, EmailAddress]
        public string FromEmail { get; set; } = "no-reply@gym.local";

        [Required]
        public string FromName { get; set; } = "Gym Management";

        [Range(1, 120)]
        public int TimeoutSeconds { get; set; } = 10;
    }

    /// <summary>
    /// Sends emails with MailKit (the library Microsoft recommends instead of the old SmtpClient).
    /// It never throws: if the mail server is down, it logs the problem and returns false,
    /// so a broken mail server can't break "create trainer" or "cancel session".
    /// </summary>
    public sealed class SmtpEmailSender : IEmailSender
    {
        private readonly SmtpOptions _options;
        private readonly ILogger<SmtpEmailSender> _logger;

        public SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger)
        {
            _options = options.Value;
            _logger = logger;
        }

        public async Task<bool> SendAsync(EmailMessage message, CancellationToken ct = default)
        {
            var mime = new MimeMessage();
            mime.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
            mime.To.Add(new MailboxAddress(message.ToName, message.ToEmail));
            mime.Subject = message.Subject;
            mime.Body = new BodyBuilder { HtmlBody = message.HtmlBody }.ToMessageBody();

            try
            {
                using var client = new SmtpClient { Timeout = _options.TimeoutSeconds * 1000 };

                var security = _options.UseSsl ? SecureSocketOptions.Auto : SecureSocketOptions.None;
                await client.ConnectAsync(_options.Host, _options.Port, security, ct);

                if (!string.IsNullOrEmpty(_options.Username))
                    await client.AuthenticateAsync(_options.Username, _options.Password ?? "", ct);

                await client.SendAsync(mime, ct);
                await client.DisconnectAsync(quit: true, ct);

                // Never log the body: it contains one-time links (reset / invite tokens).
                _logger.LogInformation("Email \"{Subject}\" sent to {To}", message.Subject, message.ToEmail);
                return true;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Could not send email \"{Subject}\" to {To} via {Host}:{Port}",
                    message.Subject, message.ToEmail, _options.Host, _options.Port);
                return false;
            }
        }
    }
}
