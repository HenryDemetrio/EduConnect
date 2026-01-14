namespace EduConnect.API.Entities
{
    public class TurmaDisciplina
    {
        public int Id { get; set; }

        public int TurmaId { get; set; }
        public Turma Turma { get; set; } = null!;

        public int DisciplinaId { get; set; }
        public Disciplina Disciplina { get; set; } = null!;

        public int? ProfessorId { get; set; }
        public Professor? Professor { get; set; }
        public ICollection<Tarefa> Tarefas { get; set; } = new List<Tarefa>();
    }
}
