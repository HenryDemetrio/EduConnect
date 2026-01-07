namespace EduConnect.API.DTOs
{
    public class TurmaAlunoResponse
    {
        public int AlunoId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string RA { get; set; } = string.Empty;

        public DateTime DataMatriculaUtc { get; set; }
    }
}
