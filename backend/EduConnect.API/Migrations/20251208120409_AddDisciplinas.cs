using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDisciplinas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Disciplinas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nome = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Disciplinas", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Disciplinas",
                columns: new[] { "Id", "Nome" },
                values: new object[,]
                {
                    { 1, "Python" },
                    { 2, "SQL" },
                    { 3, "Data Science" },
                    { 4, "Estatística" },
                    { 5, "Inteligência Artificial" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Disciplinas_Nome",
                table: "Disciplinas",
                column: "Nome",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Disciplinas");
        }
    }
}
