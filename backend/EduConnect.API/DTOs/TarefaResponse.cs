namespace EduConnect.API.DTOs
{
    public class TarefaResponse
    {
        public int Id { get; set; }
        public int TurmaDisciplinaId { get; set; }

        public string Tipo { get; set; } = "Tarefa";
        public string Titulo { get; set; } = "";
        public string? Descricao { get; set; }

        public DateTime DataEntrega { get; set; }
        public decimal Peso { get; set; }
        public decimal NotaMaxima { get; set; }

        public DateTime CriadaEm { get; set; }
        public bool Ativa { get; set; }

        public int TurmaId { get; set; }
        public string TurmaCodigo { get; set; } = "";
        public string DisciplinaNome { get; set; } = "";
    }
}
