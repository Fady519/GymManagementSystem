using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class ApplicationUserConfigurations : IEntityTypeConfiguration<ApplicationUser>
    {
        public void Configure(EntityTypeBuilder<ApplicationUser> builder)
        {
            // Identity already configures its own columns (Email, PasswordHash...). We add ours.
            builder.Property(x => x.FullName).HasMaxLength(100).IsUnicode();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

            // Same relationship Identity already has (AspNetUserRoles.UserId); we only add the navigation.
            builder.HasMany(x => x.UserRoles).WithOne().HasForeignKey(ur => ur.UserId).IsRequired();
        }
    }

    internal class RefreshTokenConfigurations : IEntityTypeConfiguration<RefreshToken>
    {
        public void Configure(EntityTypeBuilder<RefreshToken> builder)
        {
            // SHA-256 in hex is always 64 ASCII characters.
            builder.Property(x => x.TokenHash).HasMaxLength(64).IsUnicode(false).IsFixedLength();
            builder.HasIndex(x => x.TokenHash).IsUnique();

            // Tokens belong to their user: if a user row is ever removed, its tokens go too.
            builder.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
