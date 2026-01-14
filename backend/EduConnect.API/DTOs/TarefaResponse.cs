namespace EduConnect.API.DTOs
{
    public class TarefaResponse
    {
        public int Id { get; set; }
        public int TurmaDisciplinaId { get; set; }

        public string Tipo { get; set; } = "Tarefa";

        // ✅ novo
        public int Numero { get; set; }

        public string Titulo { get; set; } = "";
        public string? Descricao { get; set; }

        public DateTime DataEntrega { get; set; }
        public decimal Peso { get; set; }
        public decimal NotaMaxima { get; set; }

        public DateTime CriadaEm { get; set; }
        public bool Ativa { get; set; }

        // ✅ novo: link do PDF do enunciado (professor)
        public string? EnunciadoUrl { get; set; }

        public int TurmaId { get; set; }
        public string TurmaCodigo { get; set; } = "";
        public string DisciplinaNome { get; set; } = "";
    }
}
