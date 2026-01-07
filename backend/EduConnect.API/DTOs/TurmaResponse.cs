namespace EduConnect.API.DTOs
{
    public class TurmaResponse
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Codigo { get; set; } = string.Empty;
        public int Ano { get; set; }
    }
}
