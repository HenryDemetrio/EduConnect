using EduConnect.API.Entities;

namespace EduConnect.API.Entities
{
    public class Aluno
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }

        // mantém como nullable pra cortar warnings e porque EF injeta depois
        public Usuario? Usuario { get; set; }

        public string RA { get; set; } = null!;

        // email pessoal/contato (onde o Flow manda o acesso)
        public string EmailContato { get; set; } = null!;

        // ✅ NOVO: email institucional usado pra login (nome.sobrenome@educonnect.com)
        public string? EmailInstitucional { get; set; }
    }
}
