namespace EduConnect.API.DTOs
{
    public class CreateAlunoRequest
    {
        public string Nome { get; set; } = null!;
        public string RA { get; set; } = null!;
        public string EmailContato { get; set; } = null!;
    }
}
