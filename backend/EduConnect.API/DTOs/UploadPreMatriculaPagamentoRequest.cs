using Microsoft.AspNetCore.Http;

namespace EduConnect.API.DTOs;

public class UploadPreMatriculaPagamentoRequest
{
    public IFormFile Comprovante { get; set; } = default!;
}