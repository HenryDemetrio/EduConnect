namespace EduConnect.API.DTOs
{
    public class CreateTurmaRequest
    {
        public string Nome { get; set; } = string.Empty;   // ex: "1A"
        public string Codigo { get; set; } = string.Empty; // ex: "TURMA-2025-1A"
        public int Ano { get; set; }                       // ex: 2025
    }
}
