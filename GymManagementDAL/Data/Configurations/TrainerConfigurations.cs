using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    internal class TrainerConfigurations : GymUserConfigurations<Trainer>
    {
        protected override string TableName => "Trainers";

        public override void Configure(EntityTypeBuilder<Trainer> builder)
        {
            base.Configure(builder);

            // One login account per trainer (created by an admin in B4).
            builder.HasIndex(x => x.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL");
            builder.HasOne<ApplicationUser>()
                .WithOne()
                .HasForeignKey<Trainer>(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
