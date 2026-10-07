using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace GymManagementAPI.Infrastructure
{
    /// <summary>Invite links live longer (days) than reset links (minutes), so they get their own settings.</summary>
    public sealed class InviteTokenProviderOptions : DataProtectionTokenProviderOptions
    {
        public InviteTokenProviderOptions()
        {
            // The name is part of the encryption "purpose": a reset token can never pass as an invite token.
            Name = "InviteTokenProvider";
            TokenLifespan = TimeSpan.FromDays(3);
        }
    }

    /// <summary>
    /// Makes the "set your first password" tokens. Same mechanism as the reset tokens
    /// (encrypted user id + purpose + time + security stamp), only a different name and lifetime.
    /// </summary>
    public sealed class InviteTokenProvider : DataProtectorTokenProvider<ApplicationUser>
    {
        public InviteTokenProvider(
            IDataProtectionProvider dataProtectionProvider,
            IOptions<InviteTokenProviderOptions> options,
            ILogger<DataProtectorTokenProvider<ApplicationUser>> logger)
            : base(dataProtectionProvider, options, logger)
        {
        }
    }
}
