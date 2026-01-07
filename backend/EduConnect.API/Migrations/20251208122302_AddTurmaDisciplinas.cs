using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTurmaDisciplinas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TurmaDisciplinas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TurmaId = table.Column<int>(type: "int", nullable: false),
                    DisciplinaId = table.Column<int>(type: "int", nullable: false),
                    ProfessorId = table.Column<int>(type: "int", nullable: false),
                    TurmaId1 = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TurmaDisciplinas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TurmaDisciplinas_Disciplinas_DisciplinaId",
                        column: x => x.DisciplinaId,
                        principalTable: "Disciplinas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TurmaDisciplinas_Professores_ProfessorId",
                        column: x => x.ProfessorId,
                        principalTable: "Professores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TurmaDisciplinas_Turmas_TurmaId",
                        column: x => x.TurmaId,
                        principalTable: "Turmas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TurmaDisciplinas_Turmas_TurmaId1",
                        column: x => x.TurmaId1,
                        principalTable: "Turmas",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_TurmaDisciplinas_DisciplinaId",
                table: "TurmaDisciplinas",
                column: "DisciplinaId");

            migrationBuilder.CreateIndex(
                name: "IX_TurmaDisciplinas_ProfessorId",
                table: "TurmaDisciplinas",
                column: "ProfessorId");

            migrationBuilder.CreateIndex(
                name: "IX_TurmaDisciplinas_TurmaId_DisciplinaId",
                table: "TurmaDisciplinas",
                columns: new[] { "TurmaId", "DisciplinaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TurmaDisciplinas_TurmaId1",
                table: "TurmaDisciplinas",
                column: "TurmaId1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TurmaDisciplinas");
        }
    }
}
