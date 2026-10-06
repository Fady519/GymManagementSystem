using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Reflection;

namespace GymManagementDAL.Data.Contexts
{
    /// <summary>
    /// One database for everything: the gym tables + the Identity tables (AspNetUsers, AspNetRoles...).
    /// IdentityDbContext&lt;User, Role, int&gt; = Identity with int keys (same as our other tables).
    /// </summary>
    public class GymDbContext : IdentityDbContext<ApplicationUser, IdentityRole<int>, int>
    {
        public GymDbContext(DbContextOptions<GymDbContext> options) : base(options)
        {
            // Cascade rules run when SaveChanges is called (not immediately on Remove),
            // so ApplySoftDelete below can turn the delete into an update first.
            ChangeTracker.CascadeDeleteTiming = CascadeTiming.OnSaveChanges;
            ChangeTracker.DeleteOrphansTiming = CascadeTiming.OnSaveChanges;
        }

        public DbSet<Member> Members => Set<Member>();
        public DbSet<HealthRecord> HealthRecords => Set<HealthRecord>();
        public DbSet<Trainer> Trainers => Set<Trainer>();
        public DbSet<Plan> Plans => Set<Plan>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Session> Sessions => Set<Session>();
        public DbSet<Membership> Memberships => Set<Membership>();
        public DbSet<Booking> Bookings => Set<Booking>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Sessions/memberships point to trainers/plans/members that can be soft-deleted.
            // That is intended: business rules (later phases) block deleting anything that is
            // still in use, and memberships keep a snapshot of the plan. So this warning is expected.
            optionsBuilder.ConfigureWarnings(w =>
                w.Ignore(CoreEventId.PossibleIncorrectRequiredNavigationWithQueryFilterInteractionWarning));
        }

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            // SQL Server's datetime2 has no time zone. All our dates are UTC, so mark them as UTC
            // when reading. The JSON then ends with "Z" (e.g. 2026-10-06T14:00:00Z) and the
            // frontend converts it to Cairo time correctly.
            configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Identity configures its tables (AspNetUsers, AspNetRoles...) first, then we add ours.
            base.OnModelCreating(modelBuilder);

            modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

            // Safety net for rows inserted with plain SQL: the database fills CreatedAt in UTC.
            foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                         .Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType)))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .Property(nameof(BaseEntity.CreatedAt))
                    .HasDefaultValueSql("SYSUTCDATETIME()");
            }
        }

        public override int SaveChanges(bool acceptAllChangesOnSuccess)
        {
            ApplyAuditAndSoftDelete();
            return base.SaveChanges(acceptAllChangesOnSuccess);
        }

        public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
        {
            ApplyAuditAndSoftDelete();
            return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        }

        /// <summary>
        /// Runs before every save:
        /// 1. Added rows get CreatedAt, modified rows get UpdatedAt (always UTC).
        /// 2. Deleting an <see cref="ISoftDeletable"/> row becomes an update that sets IsDeleted = true.
        /// </summary>
        private void ApplyAuditAndSoftDelete()
        {
            var now = DateTime.UtcNow;

            foreach (var entry in ChangeTracker.Entries().ToList())
            {
                if (entry.State == EntityState.Deleted && entry.Entity is ISoftDeletable softDeletable)
                {
                    entry.State = EntityState.Modified;
                    softDeletable.IsDeleted = true;
                    softDeletable.DeletedAt = now;
                    KeepOwnedValues(entry);
                }

                if (entry.Entity is not BaseEntity entity)
                    continue;

                switch (entry.State)
                {
                    case EntityState.Added:
                        entity.CreatedAt = now;
                        break;

                    case EntityState.Modified:
                        entity.UpdatedAt = now;
                        entry.Property(nameof(BaseEntity.CreatedAt)).IsModified = false;
                        break;
                }
            }
        }

        /// <summary>
        /// Owned values (e.g. Address) are deleted together with their owner.
        /// When the owner is only soft-deleted, the owned values must be kept.
        /// </summary>
        private static void KeepOwnedValues(EntityEntry entry)
        {
            foreach (var reference in entry.References)
            {
                if (reference.TargetEntry is { } owned && owned.Metadata.IsOwned() && owned.State == EntityState.Deleted)
                    owned.State = EntityState.Unchanged;
            }
        }
    }
}
