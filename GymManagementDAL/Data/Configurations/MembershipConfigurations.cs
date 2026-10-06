using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class MembershipConfigurations : IEntityTypeConfiguration<Membership>
    {
        public void Configure(EntityTypeBuilder<Membership> builder)
        {
            // Own Id as primary key (BaseEntity.Id). The old key (MemberId, PlanId)
            // made it impossible to renew the same plan twice.

            builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

            builder.Property(x => x.PlanName).HasMaxLength(50).IsUnicode();
            builder.Property(x => x.PricePaid).HasPrecision(10, 2);

            builder.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Memberships_EndDate", "EndDate > StartDate");
                t.HasCheckConstraint("CK_Memberships_PricePaid", "PricePaid >= 0");
                t.HasCheckConstraint("CK_Memberships_DurationDays", "DurationDays BETWEEN 1 AND 365");
            });

            builder.HasOne(x => x.Member)
                .WithMany(m => m.Memberships)
                .HasForeignKey(x => x.MemberId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Plan)
                .WithMany(p => p.Memberships)
                .HasForeignKey(x => x.PlanId)
                .OnDelete(DeleteBehavior.Restrict);

            // "Does this member have an active membership?" is the most common query.
            builder.HasIndex(x => new { x.MemberId, x.EndDate });
        }
    }
}
