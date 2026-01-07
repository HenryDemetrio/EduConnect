namespace EduConnect.API.Entities
{
    public class Avaliacao
    {
        public int Id { get; set; }

        public int AlunoId { get; set; }
        public Aluno Aluno { get; set; } = null!;

        public int TurmaDisciplinaId { get; set; }
        public TurmaDisciplina TurmaDisciplina { get; set; } = null!;

        // 0–10
        public decimal Nota { get; set; }

        // 0–100 (%)
        public decimal Frequencia { get; set; }
    }
}
