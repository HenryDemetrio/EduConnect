namespace EduConnect.API.DTOs
{
    public class CreateProfessorRequest
    {
        public string Nome { get; set; } = string.Empty;
        public string Registro { get; set; } = string.Empty;
        public string EmailContato { get; set; } = null!;
    }
}
