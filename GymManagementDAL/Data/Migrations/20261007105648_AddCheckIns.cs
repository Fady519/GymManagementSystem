using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagementDAL.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckIns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // DATA NOTE: existing members get a code automatically. SQL Server runs the default
            // (NEWID) once per existing row, so every member gets a different code (checked on a copy).
            migrationBuilder.AddColumn<string>(
                name: "CheckInToken",
                table: "Members",
                type: "varchar(64)",
                unicode: false,
                maxLength: 64,
                nullable: false,
                defaultValueSql: "LOWER(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''))");

            migrationBuilder.CreateTable(
                name: "CheckIns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MemberId = table.Column<int>(type: "int", nullable: false),
                    MembershipId = table.Column<int>(type: "int", nullable: true),
                    CheckedInAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Day = table.Column<DateOnly>(type: "date", nullable: false),
                    Result = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DenyReason = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    CheckedByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CheckIns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CheckIns_AspNetUsers_CheckedByUserId",
                        column: x => x.CheckedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CheckIns_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CheckIns_Memberships_MembershipId",
                        column: x => x.MembershipId,
                        principalTable: "Memberships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Members_CheckInToken",
                table: "Members",
                column: "CheckInToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CheckIns_CheckedByUserId",
                table: "CheckIns",
                column: "CheckedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CheckIns_Day",
                table: "CheckIns",
                column: "Day");

            migrationBuilder.CreateIndex(
                name: "IX_CheckIns_MemberId_Day_Allowed",
                table: "CheckIns",
                columns: new[] { "MemberId", "Day" },
                unique: true,
                filter: "[Result] = 'Allowed'");

            migrationBuilder.CreateIndex(
                name: "IX_CheckIns_MembershipId",
                table: "CheckIns",
                column: "MembershipId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CheckIns");

            migrationBuilder.DropIndex(
                name: "IX_Members_CheckInToken",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "CheckInToken",
                table: "Members");
        }
    }
}
