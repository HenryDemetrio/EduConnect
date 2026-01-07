using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailInstitucionalAluno : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "NotaMaxima",
                table: "Tarefas",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Peso",
                table: "Tarefas",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "Tarefas",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ComprovanteUrl",
                table: "Matriculas",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PagamentoAprovadoEm",
                table: "Matriculas",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusPagamento",
                table: "Matriculas",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<decimal>(
                name: "Nota",
                table: "Avaliacoes",
                type: "decimal(4,2)",
                precision: 4,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "Frequencia",
                table: "Avaliacoes",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AddColumn<string>(
                name: "EmailInstitucional",
                table: "Alunos",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EntregasTarefas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TarefaId = table.Column<int>(type: "int", nullable: false),
                    AlunoId = table.Column<int>(type: "int", nullable: false),
                    ArquivoNome = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ArquivoPath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    ComentarioAluno = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Nota = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    FeedbackProfessor = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    EnviadoEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AvaliadoEm = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntregasTarefas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EntregasTarefas_Alunos_AlunoId",
                        column: x => x.AlunoId,
                        principalTable: "Alunos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EntregasTarefas_Tarefas_TarefaId",
                        column: x => x.TarefaId,
                        principalTable: "Tarefas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EntregasTarefas_AlunoId",
                table: "EntregasTarefas",
                column: "AlunoId");

            migrationBuilder.CreateIndex(
                name: "IX_EntregasTarefas_TarefaId_AlunoId",
                table: "EntregasTarefas",
                columns: new[] { "TarefaId", "AlunoId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EntregasTarefas");

            migrationBuilder.DropColumn(
                name: "NotaMaxima",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "Peso",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "ComprovanteUrl",
                table: "Matriculas");

            migrationBuilder.DropColumn(
                name: "PagamentoAprovadoEm",
                table: "Matriculas");

            migrationBuilder.DropColumn(
                name: "StatusPagamento",
                table: "Matriculas");

            migrationBuilder.DropColumn(
                name: "EmailInstitucional",
                table: "Alunos");

            migrationBuilder.AlterColumn<decimal>(
                name: "Nota",
                table: "Avaliacoes",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(4,2)",
                oldPrecision: 4,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "Frequencia",
                table: "Avaliacoes",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2);
        }
    }
}
