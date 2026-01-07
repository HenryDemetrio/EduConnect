namespace EduConnect.API.DTOs
{
    public class EntregaTarefaResponse
    {
        public int Id { get; set; }
        public int TarefaId { get; set; }
        public int AlunoId { get; set; }

        public string ArquivoNome { get; set; } = "";
        public string ArquivoPath { get; set; } = "";
        public string ContentType { get; set; } = "";
        public long SizeBytes { get; set; }

        public string? ComentarioAluno { get; set; }

        public decimal? Nota { get; set; }
        public string? FeedbackProfessor { get; set; }

        public DateTime EnviadoEm { get; set; }
        public DateTime? AvaliadoEm { get; set; }

        // extras pro front
        public string AlunoNome { get; set; } = "";
        public string AlunoRA { get; set; } = "";
    }
}
