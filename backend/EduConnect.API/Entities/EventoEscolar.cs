namespace EduConnect.API.Entities
{
    public class EventoEscolar
    {
        public int Id { get; set; }

        public string Titulo { get; set; } = string.Empty;
        public string? Descricao { get; set; }

        public DateTime InicioUtc { get; set; }
        public DateTime? FimUtc { get; set; }

        // null = evento global (aparece pra todos)
        public int? TurmaId { get; set; }
        public Turma? Turma { get; set; }

        public DateTime CriadoEmUtc { get; set; } = DateTime.UtcNow;
    }
}
