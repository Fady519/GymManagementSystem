using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagementDAL.Data.Migrations
{
    /// <inheritdoc />
    public partial class FullStackFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---------------------------------------------------------------------
            // DATA FIX 1: the old app saved dates with DateTime.Now (Cairo time, UTC+3
            // for all existing rows). From now on every date is stored in UTC.
            // ---------------------------------------------------------------------
            migrationBuilder.Sql(@"
                UPDATE Members        SET JoinDate    = DATEADD(HOUR, -3, JoinDate),    UpdatedAt = DATEADD(HOUR, -3, UpdatedAt);
                UPDATE Trainers       SET HireDate    = DATEADD(HOUR, -3, HireDate),    UpdatedAt = DATEADD(HOUR, -3, UpdatedAt);
                UPDATE Sessions       SET StartDate   = DATEADD(HOUR, -3, StartDate),   EndDate   = DATEADD(HOUR, -3, EndDate), UpdatedAt = DATEADD(HOUR, -3, UpdatedAt);
                UPDATE Memberships    SET StartDate   = DATEADD(HOUR, -3, StartDate),   UpdatedAt = DATEADD(HOUR, -3, UpdatedAt);
                UPDATE MemberSessions SET BookingDate = DATEADD(HOUR, -3, BookingDate), UpdatedAt = DATEADD(HOUR, -3, UpdatedAt);

                -- Rows that never got a creation date (0001-01-01).
                UPDATE Plans      SET CreatedAt = SYSUTCDATETIME() WHERE CreatedAt < '2000-01-01';
                UPDATE Categories SET CreatedAt = SYSUTCDATETIME() WHERE CreatedAt < '2000-01-01';
                UPDATE Sessions   SET CreatedAt = SYSUTCDATETIME() WHERE CreatedAt < '2000-01-01';
            ");

            migrationBuilder.DropForeignKey(
                name: "FK_Memberships_Members_MemberId",
                table: "Memberships");

            migrationBuilder.DropForeignKey(
                name: "FK_Memberships_Plans_PlanId",
                table: "Memberships");

            migrationBuilder.DropForeignKey(
                name: "FK_Sessions_Categories_CategoryId",
                table: "Sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_Sessions_Trainers_TrainerId",
                table: "Sessions");

            migrationBuilder.DropIndex(
                name: "IX_Trainers_Email",
                table: "Trainers");

            migrationBuilder.DropIndex(
                name: "IX_Trainers_Phone",
                table: "Trainers");

            migrationBuilder.DropCheckConstraint(
                name: "EmailValidFormatConstraint1",
                table: "Trainers");

            migrationBuilder.DropCheckConstraint(
                name: "PhoneValidEgpConstraint1",
                table: "Trainers");

            migrationBuilder.DropIndex(
                name: "IX_Sessions_TrainerId",
                table: "Sessions");

            migrationBuilder.DropCheckConstraint(
                name: "CapacityConstraint",
                table: "Sessions");

            migrationBuilder.DropCheckConstraint(
                name: "EndDateConstraint",
                table: "Sessions");

            migrationBuilder.DropCheckConstraint(
                name: "DurationDaysConstraint",
                table: "Plans");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Memberships",
                table: "Memberships");

            migrationBuilder.DropIndex(
                name: "IX_Members_Email",
                table: "Members");

            migrationBuilder.DropIndex(
                name: "IX_Members_Phone",
                table: "Members");

            migrationBuilder.DropCheckConstraint(
                name: "EmailValidFormatConstraint",
                table: "Members");

            migrationBuilder.DropCheckConstraint(
                name: "PhoneValidEgpConstraint",
                table: "Members");

            migrationBuilder.RenameColumn(
                name: "HireDate",
                table: "Trainers",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "JoinDate",
                table: "Members",
                newName: "CreatedAt");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Trainers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)");

            migrationBuilder.AlterColumn<string>(
                name: "Address_Street",
                table: "Trainers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(30)");

            migrationBuilder.AlterColumn<string>(
                name: "Address_City",
                table: "Trainers",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(30)");

            migrationBuilder.AlterColumn<int>(
                name: "Address_BuildingNumber",
                table: "Trainers",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Trainers",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "GetDate()");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Trainers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Trainers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Sessions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Sessions",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Sessions",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Sessions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Scheduled");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Plans",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Plans",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(200)");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Plans",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Plans",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Plans",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "StartDate",
                table: "Memberships",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "GETDATE()");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "Memberships",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Memberships",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<int>(
                name: "DurationDays",
                table: "Memberships",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PlanName",
                table: "Memberships",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "PricePaid",
                table: "Memberships",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Memberships",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.AlterColumn<string>(
                name: "Photo",
                table: "Members",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Members",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)");

            migrationBuilder.AlterColumn<string>(
                name: "Address_Street",
                table: "Members",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(30)");

            migrationBuilder.AlterColumn<string>(
                name: "Address_City",
                table: "Members",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(30)");

            migrationBuilder.AlterColumn<int>(
                name: "Address_BuildingNumber",
                table: "Members",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Members",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "GETDATE()");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Members",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Members",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Members",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Categories",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Categories",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Categories",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.RenameColumn(
                name: "CategoryName",
                table: "Categories",
                newName: "Name");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Categories",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(20)");

            migrationBuilder.Sql("UPDATE Categories SET Name = 'General Fitness' WHERE Name = 'GeneralFitness';");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Memberships",
                table: "Memberships",
                column: "Id");

            // ---------------------------------------------------------------------
            // DATA FIX 2 (bug C1): old memberships got EndDate from an empty CreatedAt,
            // so they were expired immediately. Recalculate EndDate from StartDate and
            // fill the new snapshot columns from the plan.
            // ---------------------------------------------------------------------
            migrationBuilder.Sql(@"
                UPDATE ms
                SET ms.PlanName     = p.Name,
                    ms.PricePaid    = p.Price,
                    ms.DurationDays = p.DurationDays,
                    ms.EndDate      = DATEADD(DAY, p.DurationDays, ms.StartDate),
                    ms.CreatedAt    = ms.StartDate
                FROM Memberships ms
                JOIN Plans p ON p.Id = ms.PlanId;
            ");
            migrationBuilder.CreateTable(
                name: "Bookings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MemberId = table.Column<int>(type: "int", nullable: false),
                    SessionId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Bookings_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Bookings_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "HealthRecords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MemberId = table.Column<int>(type: "int", nullable: false),
                    Height = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    BloodType = table.Column<string>(type: "varchar(3)", unicode: false, maxLength: 3, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HealthRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HealthRecords_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ---------------------------------------------------------------------
            // DATA MOVE: copy data into the new tables before dropping the old ones.
            // ---------------------------------------------------------------------
            migrationBuilder.Sql(@"
                INSERT INTO Bookings (MemberId, SessionId, Status, CreatedAt, UpdatedAt)
                SELECT MemberId, SessionId,
                       CASE WHEN IsAttended = 1 THEN 'Attended' ELSE 'Booked' END,
                       BookingDate, UpdatedAt
                FROM MemberSessions;

                INSERT INTO HealthRecords (MemberId, Height, Weight, BloodType, Note, CreatedAt)
                SELECT Id, Height, Weight, LEFT(BloodType, 3), LEFT(Note, 500), CreatedAt
                FROM Members;
            ");

            migrationBuilder.DropTable(
                name: "MemberSessions");
            migrationBuilder.DropColumn(
                name: "BloodType",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "Height",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "Weight",
                table: "Members");

            migrationBuilder.CreateIndex(
                name: "IX_Trainers_Email",
                table: "Trainers",
                column: "Email",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Trainers_Phone",
                table: "Trainers",
                column: "Phone",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Trainers_Email",
                table: "Trainers",
                sql: "Email LIKE '_%@_%._%'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Trainers_Phone",
                table: "Trainers",
                sql: "Phone LIKE '01[0125]%' AND Phone NOT LIKE '%[^0-9]%' AND LEN(Phone) = 11");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_StartDate",
                table: "Sessions",
                column: "StartDate");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_TrainerId_StartDate",
                table: "Sessions",
                columns: new[] { "TrainerId", "StartDate" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Sessions_Capacity",
                table: "Sessions",
                sql: "Capacity BETWEEN 1 AND 25");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Sessions_EndDate",
                table: "Sessions",
                sql: "EndDate > StartDate");

            migrationBuilder.CreateIndex(
                name: "IX_Plans_Name",
                table: "Plans",
                column: "Name",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Plans_DurationDays",
                table: "Plans",
                sql: "DurationDays BETWEEN 1 AND 365");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Plans_Price",
                table: "Plans",
                sql: "Price > 0");

            migrationBuilder.CreateIndex(
                name: "IX_Memberships_MemberId_EndDate",
                table: "Memberships",
                columns: new[] { "MemberId", "EndDate" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Memberships_DurationDays",
                table: "Memberships",
                sql: "DurationDays BETWEEN 1 AND 365");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Memberships_EndDate",
                table: "Memberships",
                sql: "EndDate > StartDate");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Memberships_PricePaid",
                table: "Memberships",
                sql: "PricePaid >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Members_Email",
                table: "Members",
                column: "Email",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Members_Phone",
                table: "Members",
                column: "Phone",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Members_UserId",
                table: "Members",
                column: "UserId",
                unique: true,
                filter: "[UserId] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Members_Email",
                table: "Members",
                sql: "Email LIKE '_%@_%._%'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Members_Phone",
                table: "Members",
                sql: "Phone LIKE '01[0125]%' AND Phone NOT LIKE '%[^0-9]%' AND LEN(Phone) = 11");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_MemberId",
                table: "Bookings",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_SessionId_MemberId",
                table: "Bookings",
                columns: new[] { "SessionId", "MemberId" },
                unique: true,
                filter: "[Status] <> 'Cancelled'");

            migrationBuilder.CreateIndex(
                name: "IX_HealthRecords_MemberId",
                table: "HealthRecords",
                column: "MemberId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Memberships_Members_MemberId",
                table: "Memberships",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Memberships_Plans_PlanId",
                table: "Memberships",
                column: "PlanId",
                principalTable: "Plans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sessions_Categories_CategoryId",
                table: "Sessions",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sessions_Trainers_TrainerId",
                table: "Sessions",
                column: "TrainerId",
                principalTable: "Trainers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Memberships_Members_MemberId",
                table: "Memberships");

            migrationBuilder.DropForeignKey(
                name: "FK_Memberships_Plans_PlanId",
                table: "Memberships");

            migrationBuilder.DropForeignKey(
                name: "FK_Sessions_Categories_CategoryId",
                table: "Sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_Sessions_Trainers_TrainerId",
                table: "Sessions");

            migrationBuilder.DropTable(
                name: "Bookings");

            migrationBuilder.DropTable(
                name: "HealthRecords");

            migrationBuilder.DropIndex(
                name: "IX_Trainers_Email",
                table: "Trainers");

            migrationBuilder.DropIndex(
                name: "IX_Trainers_Phone",
                table: "Trainers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Trainers_Email",
                table: "Trainers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Trainers_Phone",
                table: "Trainers");

            migrationBuilder.DropIndex(
                name: "IX_Sessions_StartDate",
                table: "Sessions");

            migrationBuilder.DropIndex(
                name: "IX_Sessions_TrainerId_StartDate",
                table: "Sessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Sessions_Capacity",
                table: "Sessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Sessions_EndDate",
                table: "Sessions");

            migrationBuilder.DropIndex(
                name: "IX_Plans_Name",
                table: "Plans");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Plans_DurationDays",
                table: "Plans");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Plans_Price",
                table: "Plans");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Memberships",
                table: "Memberships");

            migrationBuilder.DropIndex(
                name: "IX_Memberships_MemberId_EndDate",
                table: "Memberships");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Memberships_DurationDays",
                table: "Memberships");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Memberships_EndDate",
                table: "Memberships");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Memberships_PricePaid",
                table: "Memberships");

            migrationBuilder.DropIndex(
                name: "IX_Members_Email",
                table: "Members");

            migrationBuilder.DropIndex(
                name: "IX_Members_Phone",
                table: "Members");

            migrationBuilder.DropIndex(
                name: "IX_Members_UserId",
                table: "Members");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Members_Email",
                table: "Members");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Members_Phone",
                table: "Members");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Name",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Trainers");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Trainers");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "Memberships");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Memberships");

            migrationBuilder.DropColumn(
                name: "DurationDays",
                table: "Memberships");

            migrationBuilder.DropColumn(
                name: "PlanName",
                table: "Memberships");

            migrationBuilder.DropColumn(
                name: "PricePaid",
                table: "Memberships");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Memberships");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Categories");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "Trainers",
                newName: "HireDate");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "Members",
                newName: "JoinDate");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Trainers",
                type: "varchar(50)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Address_Street",
                table: "Trainers",
                type: "varchar(30)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Address_City",
                table: "Trainers",
                type: "varchar(30)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Address_BuildingNumber",
                table: "Trainers",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "HireDate",
                table: "Trainers",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GetDate()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Sessions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Sessions",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Plans",
                type: "varchar(50)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Plans",
                type: "varchar(200)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Plans",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "StartDate",
                table: "Memberships",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETDATE()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<string>(
                name: "Photo",
                table: "Members",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Members",
                type: "varchar(50)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Address_Street",
                table: "Members",
                type: "varchar(30)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Address_City",
                table: "Members",
                type: "varchar(30)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Address_BuildingNumber",
                table: "Members",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "JoinDate",
                table: "Members",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETDATE()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<string>(
                name: "BloodType",
                table: "Members",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Height",
                table: "Members",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Members",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Weight",
                table: "Members",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Categories",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<string>(
                name: "CategoryName",
                table: "Categories",
                type: "varchar(20)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Memberships",
                table: "Memberships",
                columns: new[] { "MemberId", "PlanId" });

            migrationBuilder.CreateTable(
                name: "MemberSessions",
                columns: table => new
                {
                    SessionId = table.Column<int>(type: "int", nullable: false),
                    MemberId = table.Column<int>(type: "int", nullable: false),
                    BookingDate = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    IsAttended = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberSessions", x => new { x.SessionId, x.MemberId });
                    table.ForeignKey(
                        name: "FK_MemberSessions_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MemberSessions_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Trainers_Email",
                table: "Trainers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Trainers_Phone",
                table: "Trainers",
                column: "Phone",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "EmailValidFormatConstraint1",
                table: "Trainers",
                sql: "Email like '_%@_%._%'");

            migrationBuilder.AddCheckConstraint(
                name: "PhoneValidEgpConstraint1",
                table: "Trainers",
                sql: "Phone like '01[0125]%' and Phone not like '%[^0-9]%'");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_TrainerId",
                table: "Sessions",
                column: "TrainerId");

            migrationBuilder.AddCheckConstraint(
                name: "CapacityConstraint",
                table: "Sessions",
                sql: "Capacity between 1 and 25");

            migrationBuilder.AddCheckConstraint(
                name: "EndDateConstraint",
                table: "Sessions",
                sql: "EndDate > StartDate");

            migrationBuilder.AddCheckConstraint(
                name: "DurationDaysConstraint",
                table: "Plans",
                sql: "DurationDays between 1 and 365");

            migrationBuilder.CreateIndex(
                name: "IX_Members_Email",
                table: "Members",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Members_Phone",
                table: "Members",
                column: "Phone",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "EmailValidFormatConstraint",
                table: "Members",
                sql: "Email like '_%@_%._%'");

            migrationBuilder.AddCheckConstraint(
                name: "PhoneValidEgpConstraint",
                table: "Members",
                sql: "Phone like '01[0125]%' and Phone not like '%[^0-9]%'");

            migrationBuilder.CreateIndex(
                name: "IX_MemberSessions_MemberId",
                table: "MemberSessions",
                column: "MemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_Memberships_Members_MemberId",
                table: "Memberships",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Memberships_Plans_PlanId",
                table: "Memberships",
                column: "PlanId",
                principalTable: "Plans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Sessions_Categories_CategoryId",
                table: "Sessions",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Sessions_Trainers_TrainerId",
                table: "Sessions",
                column: "TrainerId",
                principalTable: "Trainers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
