using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduConnect.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTurmaIdToNotificacoes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TurmaId",
                table: "Notificacoes",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_TurmaId",
                table: "Notificacoes",
                column: "TurmaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Notificacoes_Turmas_TurmaId",
                table: "Notificacoes",
                column: "TurmaId",
                principalTable: "Turmas",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notificacoes_Turmas_TurmaId",
                table: "Notificacoes");

            migrationBuilder.DropIndex(
                name: "IX_Notificacoes_TurmaId",
                table: "Notificacoes");

            migrationBuilder.DropColumn(
                name: "TurmaId",
                table: "Notificacoes");
        }
    }
}
