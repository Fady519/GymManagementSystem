using GymManagementDAL.Entities;
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

            // One login account per member (the FK to the users table is added in B3).
            builder.HasIndex(x => x.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL");
        }
    }
}
