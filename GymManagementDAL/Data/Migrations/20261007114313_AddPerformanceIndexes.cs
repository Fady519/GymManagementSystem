using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagementDAL.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Memberships_CreatedAt",
                table: "Memberships",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Memberships_EndDate",
                table: "Memberships",
                column: "EndDate");

            migrationBuilder.CreateIndex(
                name: "IX_CheckIns_CheckedInAt",
                table: "CheckIns",
                column: "CheckedInAt");

            migrationBuilder.CreateIndex(
                name: "IX_CheckIns_MemberId_CheckedInAt",
                table: "CheckIns",
                columns: new[] { "MemberId", "CheckedInAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_SessionId_Status",
                table: "Bookings",
                columns: new[] { "SessionId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Memberships_CreatedAt",
                table: "Memberships");

            migrationBuilder.DropIndex(
                name: "IX_Memberships_EndDate",
                table: "Memberships");

            migrationBuilder.DropIndex(
                name: "IX_CheckIns_CheckedInAt",
                table: "CheckIns");

            migrationBuilder.DropIndex(
                name: "IX_CheckIns_MemberId_CheckedInAt",
                table: "CheckIns");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_SessionId_Status",
                table: "Bookings");
        }
    }
}
