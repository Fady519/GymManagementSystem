using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class MemberConfigurations : GymUserConfigurations<Member>
    {
        protected override string TableName => "Members";

        /// <summary>A random 32-character code made by SQL Server (a GUID without dashes, lower case).</summary>
        internal const string CheckInTokenSql = "LOWER(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''))";

        public override void Configure(EntityTypeBuilder<Member> builder)
        {
            base.Configure(builder);

            builder.Property(x => x.Photo).HasMaxLength(200);

            // The QR check-in code. The default value is made by SQL Server for every new row
            // (members added by reception, self-registration, seed data, plain SQL...), so no
            // code path can forget it. NEWID() is random, the dashes are removed: 32 hex characters.
            builder.Property(x => x.CheckInToken)
                .HasMaxLength(64)
                .IsUnicode(false)
                .HasDefaultValueSql(CheckInTokenSql);
            builder.HasIndex(x => x.CheckInToken).IsUnique();

            // One login account per member (optional: members added by reception have none yet).
            builder.HasIndex(x => x.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL");
            builder.HasOne<ApplicationUser>()
                .WithOne()
                .HasForeignKey<Member>(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
