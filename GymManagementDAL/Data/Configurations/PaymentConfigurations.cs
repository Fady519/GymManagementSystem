using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class PaymentConfigurations : IEntityTypeConfiguration<Payment>
    {
        public void Configure(EntityTypeBuilder<Payment> builder)
        {
            builder.Property(x => x.Amount).HasPrecision(10, 2);
            builder.Property(x => x.Method).HasConversion<string>().HasMaxLength(20);
            builder.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
            builder.Property(x => x.Notes).HasMaxLength(500).IsUnicode();

            builder.ToTable(t => t.HasCheckConstraint("CK_Payments_Amount", "Amount > 0"));

            builder.HasOne(x => x.Membership)
                .WithMany(m => m.Payments)
                .HasForeignKey(x => x.MembershipId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.ReceivedByUser)
                .WithMany()
                .HasForeignKey(x => x.ReceivedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // The payments page and revenue reports filter by date.
            builder.HasIndex(x => x.PaidAt);
        }
    }
}
