using Microsoft.AspNetCore.Http;

namespace EduConnect.API.DTOs;

public class UploadPreMatriculaDocumentosRequest
{
    public IFormFile RgCpf { get; set; } = default!;
    public IFormFile Escolaridade { get; set; } = default!;
}