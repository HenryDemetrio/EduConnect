namespace EduConnect.API.DTOs;

public class PreMatriculaResponse
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string Telefone { get; set; } = "";
    public string Status { get; set; } = "";
    public DateTime CriadaEmUtc { get; set; }

    public string? RgCpfUrl { get; set; }
    public string? EscolaridadeUrl { get; set; }
    public string? ComprovantePagamentoUrl { get; set; }
}