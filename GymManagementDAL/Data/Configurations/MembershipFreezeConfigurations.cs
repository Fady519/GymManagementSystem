using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class MembershipFreezeConfigurations : IEntityTypeConfiguration<MembershipFreeze>
    {
        public void Configure(EntityTypeBuilder<MembershipFreeze> builder)
        {
            builder.Property(x => x.Reason).HasMaxLength(200).IsUnicode();

            builder.ToTable(t =>
            {
                t.HasCheckConstraint("CK_MembershipFreezes_Days", "Days > 0");
                t.HasCheckConstraint("CK_MembershipFreezes_EndDate", "EndDate > StartDate");
            });

            builder.HasOne(x => x.Membership)
                .WithMany(m => m.Freezes)
                .HasForeignKey(x => x.MembershipId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
