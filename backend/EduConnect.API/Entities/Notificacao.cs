namespace EduConnect.API.Entities
{
    public class Notificacao
    {
        public int Id { get; set; }

        public string Titulo { get; set; } = string.Empty;
        public string Mensagem { get; set; } = string.Empty;

        public DateTime CriadoEmUtc { get; set; } = DateTime.UtcNow;

        // null = global (pra todos)
        public int? UsuarioId { get; set; }
        public Usuario? Usuario { get; set; }

        public bool Lida { get; set; }
        public DateTime? LidaEmUtc { get; set; }
    }
}
