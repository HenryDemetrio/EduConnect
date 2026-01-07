namespace EduConnect.API.Entities
{
    public class Matricula
    {
        public int Id { get; set; }

        public int AlunoId { get; set; }
        public int TurmaId { get; set; }
        public DateTime DataMatricula { get; set; }

        public Aluno? Aluno { get; set; }
        public Turma? Turma { get; set; }
        public string StatusPagamento { get; set; } = "Pendente"; // Pendente | Aprovado | Reprovado
        public DateTime? PagamentoAprovadoEm { get; set; }
        public string? ComprovanteUrl { get; set; } // opcional (link do arquivo)
    }
}
