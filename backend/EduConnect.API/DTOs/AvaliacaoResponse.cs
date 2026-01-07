namespace EduConnect.API.DTOs
{
    public class AvaliacaoResponse
    {
        public int Id { get; set; }

        public int AlunoId { get; set; }
        public string AlunoNome { get; set; } = null!;

        public int TurmaId { get; set; }
        public string TurmaNome { get; set; } = null!;

        public int DisciplinaId { get; set; }
        public string DisciplinaNome { get; set; } = null!;

        public int ProfessorId { get; set; }
        public string ProfessorNome { get; set; } = null!;

        public decimal Nota { get; set; }
        public decimal Frequencia { get; set; }

        // depois podemos usar isso no boletim
        public string Situacao { get; set; } = null!;
    }
}
