namespace EduConnect.API.Entities
{
    public class EntregaTarefa
    {
        public int Id { get; set; }

        public int TarefaId { get; set; }
        public Tarefa? Tarefa { get; set; }

        public int AlunoId { get; set; }
        public Aluno? Aluno { get; set; }

        public string ArquivoNome { get; set; } = null!;
        public string ArquivoPath { get; set; } = null!; // caminho relativo: /uploads/...
        public string ContentType { get; set; } = "application/pdf";
        public long SizeBytes { get; set; }

        public string? ComentarioAluno { get; set; }

        public decimal? Nota { get; set; }           // nota atribuída pelo professor
        public string? FeedbackProfessor { get; set; }

        public DateTime EnviadoEm { get; set; } = DateTime.UtcNow;
        public DateTime? AvaliadoEm { get; set; }
    }
}
