namespace EduConnect.API.Entities;

public class PreMatricula
{
    public int Id { get; set; }

    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string Telefone { get; set; } = "";
    public DateTime DataNascimento { get; set; }
    public string Endereco { get; set; } = "";

    // uploads
    public string? RgCpfUrl { get; set; }
    public string? EscolaridadeUrl { get; set; }
    public string? ComprovantePagamentoUrl { get; set; }

    // INICIADA | DOCUMENTOS_OK | PAGAMENTO_OK | PENDENTE_ADMIN | APROVADA | REJEITADA
    public string Status { get; set; } = "INICIADA";

    public DateTime CriadaEmUtc { get; set; } = DateTime.UtcNow;
}