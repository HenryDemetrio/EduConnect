using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPreMatriculas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tarefas_TurmaDisciplinas_TurmaDisciplinaId1",
                table: "Tarefas");

            migrationBuilder.DropIndex(
                name: "IX_Tarefas_TurmaDisciplinaId1",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "TurmaDisciplinaId1",
                table: "Tarefas");

            migrationBuilder.CreateTable(
                name: "PreMatriculas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nome = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Telefone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DataNascimento = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Endereco = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    RgCpfUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EscolaridadeUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ComprovantePagamentoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CriadaEmUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreMatriculas", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PreMatriculas_Email",
                table: "PreMatriculas",
                column: "Email");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PreMatriculas");

            migrationBuilder.AddColumn<int>(
                name: "TurmaDisciplinaId1",
                table: "Tarefas",
                type: "int",
                nullable: true);

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
    }
}
