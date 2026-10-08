using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagementDAL.Data.Migrations
{
    /// <summary>
    /// Gender was the only enum stored as a number (1/2). Now it is text ("Male"/"Female") like
    /// every other enum column. Written by hand: EF scaffolded a plain ALTER COLUMN int -> nvarchar,
    /// which would turn 1 into "1" (not a valid enum name), so we convert the values ourselves.
    /// </summary>
    public partial class StoreGenderAsString : Migration
    {
        // Members and Trainers share the Gender column (GymUser base class), so both get the same steps.
        private static readonly string[] Tables = ["Members", "Trainers"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                // 1. New text column next to the old one (nullable until it is filled).
                migrationBuilder.AddColumn<string>(
                    name: "GenderText",
                    table: table,
                    type: "nvarchar(10)",
                    maxLength: 10,
                    nullable: true);

                // 2. Map the numbers using the C# enum values: Male = 1, Female = 2.
                //    Any other number stays NULL, so step 3 fails and the whole migration rolls back
                //    instead of silently saving a wrong gender.
                migrationBuilder.Sql(
                    $"UPDATE {table} SET GenderText = CASE Gender WHEN 1 THEN N'Male' WHEN 2 THEN N'Female' END;");

                // 3. Every row has a value now, so the column becomes required.
                migrationBuilder.AlterColumn<string>(
                    name: "GenderText",
                    table: table,
                    type: "nvarchar(10)",
                    maxLength: 10,
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "nvarchar(10)",
                    oldMaxLength: 10,
                    oldNullable: true);

                // 4. Replace the old int column with the new one (same name as before).
                migrationBuilder.DropColumn(
                    name: "Gender",
                    table: table);

                migrationBuilder.RenameColumn(
                    name: "GenderText",
                    table: table,
                    newName: "Gender");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Same steps in reverse: text back to the enum numbers.
            foreach (var table in Tables)
            {
                migrationBuilder.AddColumn<int>(
                    name: "GenderNumber",
                    table: table,
                    type: "int",
                    nullable: true);

                migrationBuilder.Sql(
                    $"UPDATE {table} SET GenderNumber = CASE Gender WHEN N'Male' THEN 1 WHEN N'Female' THEN 2 END;");

                migrationBuilder.AlterColumn<int>(
                    name: "GenderNumber",
                    table: table,
                    type: "int",
                    nullable: false,
                    oldClrType: typeof(int),
                    oldType: "int",
                    oldNullable: true);

                migrationBuilder.DropColumn(
                    name: "Gender",
                    table: table);

                migrationBuilder.RenameColumn(
                    name: "GenderNumber",
                    table: table,
                    newName: "Gender");
            }
        }
    }
}
