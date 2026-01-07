namespace EduConnect.API.Entities
{
    public class Turma
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;   // ex: "1A"
        public string Codigo { get; set; } = string.Empty; // ex: "TURMA-2025-1A"
        public int Ano { get; set; }                       // ex: 2025

        public ICollection<Matricula> Matriculas { get; set; } = new List<Matricula>();
        public ICollection<TurmaDisciplina> TurmasDisciplinas { get; set; } = new List<TurmaDisciplina>();
    }
}
