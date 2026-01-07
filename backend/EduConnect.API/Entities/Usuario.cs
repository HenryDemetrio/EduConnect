namespace EduConnect.API.Entities
{
    public class Usuario
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;   // UNIQUE
        public string SenhaHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Aluno";         // Admin | Professor | Aluno
        public Aluno? Aluno { get; set; }                   // navegação 1:1
        public Professor? Professor { get; set; }           // navegação 1:1
    }
}
