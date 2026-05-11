using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementDAL.Data.Configurations
{
    internal class GymUserConfigurations<T> : IEntityTypeConfiguration<T> where T : GymUser
    {
        public void Configure(EntityTypeBuilder<T> builder)
        {
            builder.Property(X => X.Name)
                  .HasColumnType("varchar(50)");

            builder.Property(X => X.Email)
                .HasColumnType("varchar(100)");

            builder.ToTable(Tb => Tb.HasCheckConstraint("EmailValidFormatConstraint",
                "Email like '_%@_%._%'"));

            builder.HasIndex(X => X.Email).IsUnique();

            builder.Property(X => X.Phone)
                        .HasColumnType("varchar(11)");

            builder.ToTable(Tb => Tb.HasCheckConstraint("PhoneValidEgpConstraint",
                "Phone like '01[0125]%' and Phone not like '%[^0-9]%'"));


            builder.HasIndex(X=>X.Phone).IsUnique();

            builder.OwnsOne(X => X.Address, AddressBuilder =>
            {
                AddressBuilder.Property(A => A.Street)
                .HasColumnType("varchar(30)");
                AddressBuilder.Property(A => A.City)
                .HasColumnType("varchar(30)");
            });

        }
    }
}
