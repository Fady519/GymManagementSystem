using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagementDAL.Data.Migrations
{
    /// <summary>
    /// Replaces AddressEn + AddressAr with ONE Address column. Project rule: data typed by the admin
    /// is stored once, exactly as entered; changing the website language changes the UI only.
    /// Written by hand (EF scaffolded a rename) so every step is explicit and the current
    /// address is never lost, even if the admin already edited it.
    /// </summary>
    public partial class UnifyGymAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add the new column as nullable first: the existing row has no value for it yet.
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "GymSettings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            // 2. Copy the current (possibly edited) English address into it.
            migrationBuilder.Sql("UPDATE GymSettings SET Address = AddressEn;");

            // 3. Now every row has a value, so the column can become required.
            migrationBuilder.AlterColumn<string>(
                name: "Address",
                table: "GymSettings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            // 4. Drop the two old per-language columns.
            migrationBuilder.DropColumn(
                name: "AddressEn",
                table: "GymSettings");

            migrationBuilder.DropColumn(
                name: "AddressAr",
                table: "GymSettings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Same steps in reverse: recreate both old columns from the single Address.
            migrationBuilder.AddColumn<string>(
                name: "AddressEn",
                table: "GymSettings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressAr",
                table: "GymSettings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            // We only have one address, so both languages get the same text (the admin can fix it later).
            migrationBuilder.Sql("UPDATE GymSettings SET AddressEn = Address, AddressAr = Address;");

            migrationBuilder.AlterColumn<string>(
                name: "AddressEn",
                table: "GymSettings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AddressAr",
                table: "GymSettings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "Address",
                table: "GymSettings");
        }
    }
}
