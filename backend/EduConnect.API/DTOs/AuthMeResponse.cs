namespace EduConnect.API.DTOs
{
    public class AuthMeResponse
    {
        public int UserId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;

        public int? AlunoId { get; set; }
        public string? RA { get; set; }

        public int? ProfessorId { get; set; }
        public string? Registro { get; set; }
    }
}
