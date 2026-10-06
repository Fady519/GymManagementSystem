using GymManagement.Tests.Infrastructure;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Tests.Data
{
    /// <summary>
    /// Tests for the database rules added in B2: Unicode text, Restrict deletes,
    /// soft delete, automatic UTC auditing and the booking unique index.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class DataFoundationTests(ApiFactory factory)
    {
        [Fact]
        public async Task ArabicText_IsStoredWithoutQuestionMarks()
        {
            var memberId = 0;
            await factory.WithDbAsync(async db =>
                memberId = (await TestData.AddMemberAsync(db, name: "فادي قيصر", withDetails: true)).Id);

            await factory.WithDbAsync(async db =>
            {
                var member = await db.Members.SingleAsync(m => m.Id == memberId);
                Assert.Equal("فادي قيصر", member.Name);
                Assert.Equal("القاهرة", member.Address!.City);
            });
        }

        [Fact]
        public async Task HardDeletingTrainerWithSessions_IsRejectedByTheDatabase()
        {
            var trainerId = 0;
            await factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                await TestData.AddSessionAsync(db, trainer.Id);
                trainerId = trainer.Id;
            });

            // ExecuteDeleteAsync sends a real DELETE (it bypasses soft delete),
            // so this proves the foreign key is Restrict and not Cascade.
            await factory.WithDbAsync(async db =>
            {
                await Assert.ThrowsAnyAsync<Exception>(() =>
                    db.Trainers.Where(t => t.Id == trainerId).ExecuteDeleteAsync());

                Assert.True(await db.Sessions.AnyAsync(s => s.TrainerId == trainerId));
            });
        }

        [Fact]
        public async Task SoftDeletedMember_IsHidden_ButKeepsAddressAndHealthRecord()
        {
            var memberId = 0;
            await factory.WithDbAsync(async db =>
                memberId = (await TestData.AddMemberAsync(db, withDetails: true)).Id);

            await factory.WithDbAsync(async db =>
            {
                var member = await db.Members.Include(m => m.HealthRecord).SingleAsync(m => m.Id == memberId);
                db.Members.Remove(member);
                await db.SaveChangesAsync();
            });

            await factory.WithDbAsync(async db =>
            {
                Assert.False(await db.Members.AnyAsync(m => m.Id == memberId));

                var row = await db.Members.IgnoreQueryFilters().SingleAsync(m => m.Id == memberId);
                Assert.True(row.IsDeleted);
                Assert.NotNull(row.Address);
                Assert.True(await db.HealthRecords.IgnoreQueryFilters().AnyAsync(h => h.MemberId == memberId));
            });
        }

        [Fact]
        public async Task CreatedAtAndUpdatedAt_AreFilledAutomaticallyInUtc()
        {
            var before = DateTime.UtcNow.AddSeconds(-5);
            var memberId = 0;

            await factory.WithDbAsync(async db =>
            {
                var member = await TestData.AddMemberAsync(db);
                memberId = member.Id;
                Assert.InRange(member.CreatedAt, before, DateTime.UtcNow.AddSeconds(5));
                Assert.Null(member.UpdatedAt);
            });

            await factory.WithDbAsync(async db =>
            {
                var member = await db.Members.SingleAsync(m => m.Id == memberId);
                member.Name = "Renamed Member";
                await db.SaveChangesAsync();

                Assert.NotNull(member.UpdatedAt);
                Assert.InRange(member.UpdatedAt!.Value, before, DateTime.UtcNow.AddSeconds(5));
            });
        }

        [Fact]
        public async Task Booking_SameSessionTwice_IsRejected_ButRebookingAfterCancelIsAllowed()
        {
            await factory.WithDbAsync(async db =>
            {
                var member = await TestData.AddMemberAsync(db);
                var trainer = await TestData.AddTrainerAsync(db);
                var session = await TestData.AddSessionAsync(db, trainer.Id);

                var first = new Booking { MemberId = member.Id, SessionId = session.Id };
                db.Bookings.Add(first);
                await db.SaveChangesAsync();

                db.Bookings.Add(new Booking { MemberId = member.Id, SessionId = session.Id });
                await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
                db.ChangeTracker.Clear();

                var existing = await db.Bookings.SingleAsync(b => b.Id == first.Id);
                existing.Status = BookingStatus.Cancelled;
                await db.SaveChangesAsync();

                db.Bookings.Add(new Booking { MemberId = member.Id, SessionId = session.Id });
                await db.SaveChangesAsync();
            });
        }

        [Fact]
        public async Task Session_HasRowVersion_ThatChangesOnUpdate()
        {
            await factory.WithDbAsync(async db =>
            {
                var trainer = await TestData.AddTrainerAsync(db);
                var session = await TestData.AddSessionAsync(db, trainer.Id);
                var original = session.RowVersion.ToArray();

                session.Capacity = 12;
                await db.SaveChangesAsync();

                Assert.NotEqual(original, session.RowVersion);
            });
        }
    }
}
