using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.Emails;
using GymManagementBLL.Options;
using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using System.Globalization;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class AppEmailService : IAppEmailService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailSender _sender;
        private readonly EmailOptions _options;
        private readonly GymTimeZone _gymTime;

        public AppEmailService(UserManager<ApplicationUser> userManager, IEmailSender sender, IOptions<EmailOptions> options,
            GymTimeZone gymTime)
        {
            _userManager = userManager;
            _sender = sender;
            _options = options.Value;
            _gymTime = gymTime;
        }

        public async Task<bool> SendInviteAsync(ApplicationUser user, string role, CancellationToken ct = default)
        {
            // A one-time token from our "Invite" provider (valid InviteLinkDays). It stops working
            // as soon as a password is set, because setting a password changes the user's security stamp.
            var token = await _userManager.GenerateUserTokenAsync(user, AccountTokens.InviteProvider, AccountTokens.InvitePurpose);
            var link = BuildLink("set-password", user.Email!, token);

            var (subject, html) = EmailTemplates.Invite(_options.GymName, user.FullName, role, link, _options.InviteLinkDays);
            return await _sender.SendAsync(new EmailMessage(user.Email!, user.FullName, subject, html), ct);
        }

        public async Task<bool> SendPasswordResetAsync(ApplicationUser user, CancellationToken ct = default)
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var link = BuildLink("reset-password", user.Email!, token);

            var (subject, html) = EmailTemplates.ResetPassword(_options.GymName, user.FullName, link, _options.ResetPasswordLinkMinutes);
            return await _sender.SendAsync(new EmailMessage(user.Email!, user.FullName, subject, html), ct);
        }

        public async Task<int> SendSessionCancelledAsync(IReadOnlyList<EmailRecipient> recipients, string session, DateTime startUtc,
            CancellationToken ct = default)
        {
            var localStart = ToGymTime(startUtc).ToString("dddd d MMM yyyy, h:mm tt", CultureInfo.InvariantCulture);
            var sent = 0;

            foreach (var recipient in recipients)
            {
                var (subject, html) = EmailTemplates.SessionCancelled(_options.GymName, recipient.Name, session, localStart);
                if (await _sender.SendAsync(new EmailMessage(recipient.Email, recipient.Name, subject, html), ct))
                    sent++;
            }

            return sent;
        }

        #region Helper Methods

        private string BuildLink(string page, string email, string token)
            => _options.FrontendBaseUrl.TrimEnd('/') + "/" + page
               + "?email=" + Uri.EscapeDataString(email)
               + "&token=" + AccountTokens.Encode(token);

        /// <summary>Emails show the gym's local time (the database keeps UTC).</summary>
        private DateTime ToGymTime(DateTime utc) => _gymTime.ToLocal(utc);

        #endregion
    }
}
