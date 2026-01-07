using EduConnect.API.Entities;

namespace EduConnect.API.Entities
{
    public class Tarefa
    {
        public int Id { get; set; }

        public int TurmaDisciplinaId { get; set; }
        public TurmaDisciplina? TurmaDisciplina { get; set; }

        public string Tipo { get; set; } = "Tarefa"; // "Tarefa" | "Avaliacao"
        public string Titulo { get; set; } = null!;
        public string? Descricao { get; set; }

        public DateTime DataEntrega { get; set; }
        public decimal Peso { get; set; } = 1m;       // peso na média
        public decimal NotaMaxima { get; set; } = 10m;

        public DateTime CriadaEm { get; set; } = DateTime.UtcNow;
        public bool Ativa { get; set; } = true;
    }
}
