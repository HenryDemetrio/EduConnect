namespace EduConnect.API.DTOs
{
    public class UpdateAlunoRequest
    {
        public string Nome { get; set; } = null!;
        public string RA { get; set; } = null!;
        public string EmailContato { get; set; } = null!;
        // sem NovaSenha aqui (senha vira endpoint dedicado)
    }
}
