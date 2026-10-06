using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class MemberConfigurations : GymUserConfigurations<Member>
    {
        protected override string TableName => "Members";

        public override void Configure(EntityTypeBuilder<Member> builder)
        {
            base.Configure(builder);

            builder.Property(x => x.Photo).HasMaxLength(200);

            // One login account per member (optional: members added by reception have none yet).
            builder.HasIndex(x => x.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL");
            builder.HasOne<ApplicationUser>()
                .WithOne()
                .HasForeignKey<Member>(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
