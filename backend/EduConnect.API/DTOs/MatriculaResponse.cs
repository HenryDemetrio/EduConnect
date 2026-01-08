namespace EduConnect.API.DTOs
{
    public class MatriculaResponse
    {
        public int Id { get; set; }

        public int AlunoId { get; set; }
        public string AlunoNome { get; set; } = string.Empty;

        public int TurmaId { get; set; }
        public string TurmaNome { get; set; } = string.Empty;
        public string TurmaCodigo { get; set; } = string.Empty;

        public DateTime DataMatricula { get; set; }

        
        public string StatusPagamento { get; set; } = "Pendente";
        public DateTime? PagamentoAprovadoEm { get; set; }
    }
}
