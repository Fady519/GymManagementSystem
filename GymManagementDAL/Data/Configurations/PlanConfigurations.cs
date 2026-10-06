using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class PlanConfigurations : IEntityTypeConfiguration<Plan>
    {
        public void Configure(EntityTypeBuilder<Plan> builder)
        {
            builder.Property(x => x.Name).HasMaxLength(50).IsUnicode();
            builder.Property(x => x.Description).HasMaxLength(200).IsUnicode();
            builder.Property(x => x.Price).HasPrecision(10, 2);

            builder.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Plans_DurationDays", "DurationDays BETWEEN 1 AND 365");
                t.HasCheckConstraint("CK_Plans_Price", "Price > 0");
            });

            builder.HasIndex(x => x.Name).IsUnique().HasFilter("[IsDeleted] = 0");

            builder.HasQueryFilter(x => !x.IsDeleted);
        }
    }
}
