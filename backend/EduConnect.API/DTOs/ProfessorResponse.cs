namespace EduConnect.API.DTOs
{
    public class ProfessorResponse
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Registro { get; set; } = string.Empty;
        public string EmailContato { get; set; } = null!;
        public string EmailInstitucional { get; set; } = null!;
    }
}
