namespace EduConnect.API.DTOs
{
    public class AddTurmaDisciplinaRequest
    {
        // TurmaId vem na rota (/turmas/{turmaId}/disciplinas)
        public int DisciplinaId { get; set; }
        public int ProfessorId { get; set; }
    }
}
