using Microsoft.AspNetCore.Http;

namespace EduConnect.API.DTOs
{
    public class EnviarEntregaRequest
    {
        public IFormFile Arquivo { get; set; } = default!;
        public string? Comentario { get; set; }
    }
}
