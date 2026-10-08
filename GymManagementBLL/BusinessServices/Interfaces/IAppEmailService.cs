using GymManagementDAL.Entities.Identity;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public sealed record EmailRecipient(string Name, string Email);

    /// <summary>
    /// The emails the gym sends (invite, password reset, session cancelled): builds the link + the HTML
    /// and hands it to IEmailSender. Every method returns whether the email was sent; none of them throws.
    /// </summary>
    public interface IAppEmailService
    {
        Task<bool> SendInviteAsync(ApplicationUser user, string role, CancellationToken ct = default);

        Task<bool> SendPasswordResetAsync(ApplicationUser user, CancellationToken ct = default);

        /// <returns>How many emails were sent.</returns>
        Task<int> SendSessionCancelledAsync(IReadOnlyList<EmailRecipient> recipients, string session, DateTime startUtc,
            string reason, CancellationToken ct = default);
    }
}
