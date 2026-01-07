namespace EduConnect.API.DTOs
{
    public class EventoEscolarResponse
    {
        public int Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string? Descricao { get; set; }

        public DateTime InicioUtc { get; set; }
        public DateTime? FimUtc { get; set; }

        public int? TurmaId { get; set; }
        public string? TurmaNome { get; set; }
    }
}
