namespace EduConnect.API.DTOs
{
    public class ProfessorTurmaDisciplinaResponse
    {
        public int TurmaDisciplinaId { get; set; }

        public int TurmaId { get; set; }
        public string TurmaNome { get; set; } = string.Empty;
        public string TurmaCodigo { get; set; } = string.Empty;
        public int TurmaAno { get; set; }

        public int DisciplinaId { get; set; }
        public string DisciplinaNome { get; set; } = string.Empty;
    }
}
