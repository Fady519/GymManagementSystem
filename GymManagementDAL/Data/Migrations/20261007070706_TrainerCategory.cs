using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagementDAL.Data.Migrations
{
    /// <summary>
    /// Trainer speciality: fixed enum (Specialities int) -> link to the Categories table (CategoryId).
    /// Hand-edited: EF generated a plain RenameColumn, which would treat the old enum number
    /// as a category id. Instead each trainer is matched to the category with the same name.
    /// </summary>
    public partial class TrainerCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1) New nullable column, so existing rows are allowed while we fill it.
            migrationBuilder.AddColumn<int>(
                name: "CategoryId",
                table: "Trainers",
                type: "int",
                nullable: true);

            // 2) Old enum value -> category with the same name.
            migrationBuilder.Sql("""
                UPDATE t
                SET t.CategoryId = c.Id
                FROM Trainers t
                JOIN Categories c ON c.Name = CASE t.Specialities
                                                  WHEN 1 THEN N'General Fitness'
                                                  WHEN 2 THEN N'Yoga'
                                                  WHEN 3 THEN N'Boxing'
                                                  WHEN 4 THEN N'CrossFit'
                                              END;

                -- Safety net: any trainer that didn't match gets the first category.
                UPDATE Trainers
                SET CategoryId = (SELECT MIN(Id) FROM Categories)
                WHERE CategoryId IS NULL;
                """);

            // 3) Now every row has a value: make it required and drop the old column.
            migrationBuilder.AlterColumn<int>(
                name: "CategoryId",
                table: "Trainers",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "Specialities",
                table: "Trainers");

            migrationBuilder.CreateIndex(
                name: "IX_Trainers_CategoryId",
                table: "Trainers",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Trainers_Categories_CategoryId",
                table: "Trainers",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trainers_Categories_CategoryId",
                table: "Trainers");

            migrationBuilder.DropIndex(
                name: "IX_Trainers_CategoryId",
                table: "Trainers");

            migrationBuilder.AddColumn<int>(
                name: "Specialities",
                table: "Trainers",
                type: "int",
                nullable: false,
                defaultValue: 1);

            // Category name -> old enum value (unknown categories become General Fitness = 1).
            migrationBuilder.Sql("""
                UPDATE t
                SET t.Specialities = CASE c.Name
                                         WHEN N'Yoga' THEN 2
                                         WHEN N'Boxing' THEN 3
                                         WHEN N'CrossFit' THEN 4
                                         ELSE 1
                                     END
                FROM Trainers t
                JOIN Categories c ON c.Id = t.CategoryId;
                """);

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "Trainers");
        }
    }
}
