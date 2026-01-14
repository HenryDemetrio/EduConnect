namespace EduConnect.API.Entities
{
    public class Tarefa
    {
        public int Id { get; set; }

        public int TurmaDisciplinaId { get; set; }
        public TurmaDisciplina? TurmaDisciplina { get; set; }

        public string Tipo { get; set; } = "Tarefa";

        public int Numero { get; set; } = 0;

        public string Titulo { get; set; } = null!;
        public string? Descricao { get; set; }

        public DateTime DataEntrega { get; set; }
        public decimal Peso { get; set; } = 1m;
        public decimal NotaMaxima { get; set; } = 10m;
        public string? EnunciadoArquivoNome { get; set; }
        public string? EnunciadoArquivoPath { get; set; } // /uploads/...
        public string EnunciadoContentType { get; set; } = "application/pdf";
        public long? EnunciadoSizeBytes { get; set; }

        public DateTime CriadaEm { get; set; } = DateTime.UtcNow;
        public bool Ativa { get; set; } = true;
    }
}
