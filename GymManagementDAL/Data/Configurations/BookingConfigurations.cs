using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class BookingConfigurations : IEntityTypeConfiguration<Booking>
    {
        public void Configure(EntityTypeBuilder<Booking> builder)
        {
            builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

            builder.HasOne(x => x.Member)
                .WithMany(m => m.Bookings)
                .HasForeignKey(x => x.MemberId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Session)
                .WithMany(s => s.Bookings)
                .HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Restrict);

            // A member can't book the same session twice, but can re-book after cancelling.
            builder.HasIndex(x => new { x.SessionId, x.MemberId })
                .IsUnique()
                .HasFilter("[Status] <> 'Cancelled'");

            builder.HasIndex(x => x.MemberId);

            // B9 performance review: the unique index above is filtered (not Cancelled), so SQL Server
            // can't use it for "all bookings of a session" or "Status = Booked". This one can.
            builder.HasIndex(x => new { x.SessionId, x.Status });
        }
    }
}
