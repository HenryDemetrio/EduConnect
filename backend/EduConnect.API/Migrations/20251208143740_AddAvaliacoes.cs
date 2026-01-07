using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAvaliacoes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TurmaDisciplinas_Turmas_TurmaId1",
                table: "TurmaDisciplinas");

            migrationBuilder.DropIndex(
                name: "IX_TurmaDisciplinas_TurmaId1",
                table: "TurmaDisciplinas");

            migrationBuilder.DropColumn(
                name: "TurmaId1",
                table: "TurmaDisciplinas");

            migrationBuilder.CreateTable(
                name: "Avaliacoes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AlunoId = table.Column<int>(type: "int", nullable: false),
                    TurmaDisciplinaId = table.Column<int>(type: "int", nullable: false),
                    Nota = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Frequencia = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Avaliacoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Avaliacoes_Alunos_AlunoId",
                        column: x => x.AlunoId,
                        principalTable: "Alunos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Avaliacoes_TurmaDisciplinas_TurmaDisciplinaId",
                        column: x => x.TurmaDisciplinaId,
                        principalTable: "TurmaDisciplinas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Avaliacoes_AlunoId_TurmaDisciplinaId",
                table: "Avaliacoes",
                columns: new[] { "AlunoId", "TurmaDisciplinaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Avaliacoes_TurmaDisciplinaId",
                table: "Avaliacoes",
                column: "TurmaDisciplinaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Avaliacoes");

            migrationBuilder.AddColumn<int>(
                name: "TurmaId1",
                table: "TurmaDisciplinas",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TurmaDisciplinas_TurmaId1",
                table: "TurmaDisciplinas",
                column: "TurmaId1");

            migrationBuilder.AddForeignKey(
                name: "FK_TurmaDisciplinas_Turmas_TurmaId1",
                table: "TurmaDisciplinas",
                column: "TurmaId1",
                principalTable: "Turmas",
                principalColumn: "Id");
        }
    }
}
