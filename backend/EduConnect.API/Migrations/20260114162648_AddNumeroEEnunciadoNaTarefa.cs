using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddNumeroEEnunciadoNaTarefa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EnunciadoArquivoNome",
                table: "Tarefas",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnunciadoArquivoPath",
                table: "Tarefas",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnunciadoContentType",
                table: "Tarefas",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "EnunciadoSizeBytes",
                table: "Tarefas",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Numero",
                table: "Tarefas",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TurmaDisciplinaId1",
                table: "Tarefas",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tarefas_TurmaDisciplinaId_Tipo_Numero",
                table: "Tarefas",
                columns: new[] { "TurmaDisciplinaId", "Tipo", "Numero" },
                unique: true,
                filter: "[Numero] > 0");

            migrationBuilder.CreateIndex(
                name: "IX_Tarefas_TurmaDisciplinaId1",
                table: "Tarefas",
                column: "TurmaDisciplinaId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Tarefas_TurmaDisciplinas_TurmaDisciplinaId1",
                table: "Tarefas",
                column: "TurmaDisciplinaId1",
                principalTable: "TurmaDisciplinas",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tarefas_TurmaDisciplinas_TurmaDisciplinaId1",
                table: "Tarefas");

            migrationBuilder.DropIndex(
                name: "IX_Tarefas_TurmaDisciplinaId_Tipo_Numero",
                table: "Tarefas");

            migrationBuilder.DropIndex(
                name: "IX_Tarefas_TurmaDisciplinaId1",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "EnunciadoArquivoNome",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "EnunciadoArquivoPath",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "EnunciadoContentType",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "EnunciadoSizeBytes",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "Numero",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "TurmaDisciplinaId1",
                table: "Tarefas");
        }
    }
}
