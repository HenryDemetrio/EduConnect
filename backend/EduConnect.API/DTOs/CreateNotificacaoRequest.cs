namespace EduConnect.API.DTOs
{
    public class CreateNotificacaoRequest
    {
        public string Titulo { get; set; } = string.Empty;
        public string Mensagem { get; set; } = string.Empty;

        public int? UsuarioId { get; set; } // null = global
    }
}
