namespace EduConnect.API.DTOs
{
    public class AlunoResponse
    {
        public int Id { get; set; }
        public string Nome { get; set; } = null!;
        public string RA { get; set; } = null!;
        public string EmailInstitucional { get; set; } = null!;
        public string EmailContato { get; set; } = null!;
    }
}
