using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class SessionConfigurations : IEntityTypeConfiguration<Session>
    {
        public void Configure(EntityTypeBuilder<Session> builder)
        {
            builder.Property(x => x.Description).HasMaxLength(500).IsUnicode();

            // Enums are stored as text ("Scheduled") so the table is readable in SQL.
            builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

            builder.Property(x => x.RowVersion).IsRowVersion();

            builder.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Sessions_Capacity", "Capacity BETWEEN 1 AND 25");
                t.HasCheckConstraint("CK_Sessions_EndDate", "EndDate > StartDate");
            });

            // Restrict: a trainer/category that has sessions can't be hard-deleted,
            // so the gym's history is never lost by accident.
            builder.HasOne(x => x.Trainer)
                .WithMany(t => t.Sessions)
                .HasForeignKey(x => x.TrainerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Category)
                .WithMany(c => c.Sessions)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            // Speeds up "sessions of trainer X in a time range" (overlap checks, schedules).
            builder.HasIndex(x => new { x.TrainerId, x.StartDate });
            builder.HasIndex(x => x.StartDate);
        }
    }
}
