namespace GymManagementBLL.Abstractions
{
    public sealed record EmailMessage(string ToEmail, string ToName, string Subject, string HtmlBody);

    /// <summary>
    /// Sends one email (the "post office"). The real one uses SMTP (MailKit); tests use a fake that keeps
    /// emails in memory. Sending must never crash a request, so it returns false instead of throwing.
    /// </summary>
    public interface IEmailSender
    {
        /// <returns>true if the email was handed to the mail server.</returns>
        Task<bool> SendAsync(EmailMessage message, CancellationToken ct = default);
    }
}
