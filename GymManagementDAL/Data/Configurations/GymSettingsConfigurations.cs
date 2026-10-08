using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class GymSettingsConfigurations : IEntityTypeConfiguration<GymSettings>
    {
        public void Configure(EntityTypeBuilder<GymSettings> builder)
        {
            builder.ToTable("GymSettings", t =>
            {
                // Only one row may ever exist.
                t.HasCheckConstraint("CK_GymSettings_SingleRow", "Id = 1");
                t.HasCheckConstraint("CK_GymSettings_Email", "Email LIKE '_%@_%._%'");
                t.HasCheckConstraint("CK_GymSettings_WeekdayHours", "WeekdayClosesAt > WeekdayOpensAt");
                // Friday: both times empty (closed), or both set with close after open.
                t.HasCheckConstraint("CK_GymSettings_FridayHours",
                    "(FridayOpensAt IS NULL AND FridayClosesAt IS NULL) OR (FridayClosesAt > FridayOpensAt)");
            });

            // We always use Id = 1, so SQL Server must not generate it.
            builder.Property(x => x.Id).ValueGeneratedNever();

            // nvarchar = Unicode, so Arabic text is stored correctly. URLs too: a pasted Google Maps
            // link can contain Arabic words. Phones and emails are always ASCII, so varchar is enough.
            builder.Property(x => x.GymName).HasMaxLength(100).IsUnicode();
            builder.Property(x => x.Phone).HasMaxLength(20).IsUnicode(false);
            builder.Property(x => x.WhatsApp).HasMaxLength(20).IsUnicode(false);
            builder.Property(x => x.Email).HasMaxLength(100).IsUnicode(false);
            builder.Property(x => x.AddressEn).HasMaxLength(200).IsUnicode();
            builder.Property(x => x.AddressAr).HasMaxLength(200).IsUnicode();
            builder.Property(x => x.MapUrl).HasMaxLength(500).IsUnicode();
            builder.Property(x => x.FacebookUrl).HasMaxLength(300).IsUnicode();
            builder.Property(x => x.InstagramUrl).HasMaxLength(300).IsUnicode();

            // The single row is created by the migration, so it exists in every environment
            // (dev, tests, production). CreatedAt is a fixed value so the model snapshot never changes.
            builder.HasData(new GymSettings
            {
                Id = GymSettings.SingletonId,
                GymName = "Power Fitness",
                Phone = "+20 100 555 0199",
                WhatsApp = "+20 100 555 0199",
                Email = "hello@powerfitness.eg",
                AddressEn = "12 Abbas El Akkad St, Nasr City, Cairo",
                AddressAr = "12 شارع عباس العقاد، مدينة نصر، القاهرة",
                MapUrl = "https://maps.google.com/?q=Abbas+El+Akkad+Nasr+City+Cairo",
                FacebookUrl = null,
                InstagramUrl = null,
                WeekdayOpensAt = new TimeOnly(6, 0),
                WeekdayClosesAt = new TimeOnly(23, 0),
                FridayOpensAt = new TimeOnly(14, 0),
                FridayClosesAt = new TimeOnly(22, 0),
                CreatedAt = new DateTime(2026, 10, 8, 0, 0, 0, DateTimeKind.Utc),
            });
        }
    }
}
