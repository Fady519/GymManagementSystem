using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagementDAL.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGymSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GymSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    GymName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Phone = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    WhatsApp = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: false),
                    AddressEn = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AddressAr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MapUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    FacebookUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    InstagramUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    WeekdayOpensAt = table.Column<TimeOnly>(type: "time", nullable: false),
                    WeekdayClosesAt = table.Column<TimeOnly>(type: "time", nullable: false),
                    FridayOpensAt = table.Column<TimeOnly>(type: "time", nullable: true),
                    FridayClosesAt = table.Column<TimeOnly>(type: "time", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GymSettings", x => x.Id);
                    table.CheckConstraint("CK_GymSettings_Email", "Email LIKE '_%@_%._%'");
                    table.CheckConstraint("CK_GymSettings_FridayHours", "(FridayOpensAt IS NULL AND FridayClosesAt IS NULL) OR (FridayClosesAt > FridayOpensAt)");
                    table.CheckConstraint("CK_GymSettings_SingleRow", "Id = 1");
                    table.CheckConstraint("CK_GymSettings_WeekdayHours", "WeekdayClosesAt > WeekdayOpensAt");
                });

            migrationBuilder.InsertData(
                table: "GymSettings",
                columns: new[] { "Id", "AddressAr", "AddressEn", "CreatedAt", "Email", "FacebookUrl", "FridayClosesAt", "FridayOpensAt", "GymName", "InstagramUrl", "MapUrl", "Phone", "UpdatedAt", "WeekdayClosesAt", "WeekdayOpensAt", "WhatsApp" },
                values: new object[] { 1, "12 شارع عباس العقاد، مدينة نصر، القاهرة", "12 Abbas El Akkad St, Nasr City, Cairo", new DateTime(2026, 10, 8, 0, 0, 0, 0, DateTimeKind.Utc), "hello@powerfitness.eg", null, new TimeOnly(22, 0, 0), new TimeOnly(14, 0, 0), "Power Fitness", null, "https://maps.google.com/?q=Abbas+El+Akkad+Nasr+City+Cairo", "+20 100 555 0199", null, new TimeOnly(23, 0, 0), new TimeOnly(6, 0, 0), "+20 100 555 0199" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GymSettings");
        }
    }
}
