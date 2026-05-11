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
    internal class MembershipConfigurations : IEntityTypeConfiguration<Membership>
    {
        public void Configure(EntityTypeBuilder<Membership> builder)
        {
            builder.Property(X => X.CreatedAt)
                .HasColumnName("StartDate")
                .HasDefaultValueSql("GETDATE()");

            builder.HasKey(X => new { X.MemberId, X.PlanId });

            builder.Ignore(X => X.Id);
            builder.Ignore(X => X.Status);
        }
    }
}
