using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class HealthRecordConfigurations : IEntityTypeConfiguration<HealthRecord>
    {
        public void Configure(EntityTypeBuilder<HealthRecord> builder)
        {
            builder.ToTable("HealthRecords");

            builder.Property(x => x.Height).HasPrecision(5, 2);
            builder.Property(x => x.Weight).HasPrecision(5, 2);
            builder.Property(x => x.BloodType).HasMaxLength(3).IsUnicode(false);
            builder.Property(x => x.Note).HasMaxLength(500);

            // The health record belongs to the member, so this is the only Cascade relationship.
            builder.HasOne(x => x.Member)
                .WithOne(m => m.HealthRecord)
                .HasForeignKey<HealthRecord>(x => x.MemberId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.MemberId).IsUnique();

            // Hide the health record of a soft-deleted member too (matches the Member filter).
            builder.HasQueryFilter(x => !x.Member.IsDeleted);
        }
    }
}
