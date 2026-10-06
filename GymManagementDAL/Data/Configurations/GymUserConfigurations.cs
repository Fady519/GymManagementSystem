using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    /// <summary>
    /// Columns shared by Members and Trainers. Each derived configuration calls
    /// base.Configure(builder) and passes its table name so constraint names stay unique.
    /// </summary>
    internal abstract class GymUserConfigurations<T> : IEntityTypeConfiguration<T> where T : GymUser
    {
        protected abstract string TableName { get; }

        public virtual void Configure(EntityTypeBuilder<T> builder)
        {
            // nvarchar = Unicode, so Arabic names are stored correctly (varchar turned them into ????).
            builder.Property(x => x.Name).HasMaxLength(50).IsUnicode();

            // Emails and phone numbers are always ASCII, so varchar is enough.
            builder.Property(x => x.Email).HasMaxLength(100).IsUnicode(false);
            builder.Property(x => x.Phone).HasMaxLength(11).IsUnicode(false);

            builder.ToTable(TableName, t =>
            {
                t.HasCheckConstraint($"CK_{TableName}_Email", "Email LIKE '_%@_%._%'");
                t.HasCheckConstraint($"CK_{TableName}_Phone", "Phone LIKE '01[0125]%' AND Phone NOT LIKE '%[^0-9]%' AND LEN(Phone) = 11");
            });

            // Unique only among non-deleted rows, so a deleted person's email can be reused.
            builder.HasIndex(x => x.Email).IsUnique().HasFilter("[IsDeleted] = 0");
            builder.HasIndex(x => x.Phone).IsUnique().HasFilter("[IsDeleted] = 0");

            builder.OwnsOne(x => x.Address, address =>
            {
                address.Property(a => a.Street).HasMaxLength(50).IsUnicode();
                address.Property(a => a.City).HasMaxLength(30).IsUnicode();
            });

            builder.HasQueryFilter(x => !x.IsDeleted);
        }
    }
}
