using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class CheckInConfigurations : IEntityTypeConfiguration<CheckIn>
    {
        public void Configure(EntityTypeBuilder<CheckIn> builder)
        {
            builder.Property(x => x.Result).HasConversion<string>().HasMaxLength(20);
            builder.Property(x => x.DenyReason).HasConversion<string>().HasMaxLength(30);

            builder.HasOne(x => x.Member)
                .WithMany()
                .HasForeignKey(x => x.MemberId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Membership)
                .WithMany()
                .HasForeignKey(x => x.MembershipId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.CheckedByUser)
                .WithMany()
                .HasForeignKey(x => x.CheckedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // The database itself guarantees "one allowed check-in per member per day":
            // even if two scans arrive at the same millisecond, the second insert fails.
            // Denied scans are not limited (they are only a log).
            builder.HasIndex(x => new { x.MemberId, x.Day })
                .IsUnique()
                .HasFilter("[Result] = 'Allowed'")
                .HasDatabaseName("IX_CheckIns_MemberId_Day_Allowed");

            // The check-ins page and the reports filter by day.
            builder.HasIndex(x => x.Day);
        }
    }
}
