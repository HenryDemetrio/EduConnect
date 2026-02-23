namespace EduConnect.API.DTOs;

public class CreatePreMatriculaRequest
{
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string Telefone { get; set; } = "";
    public string DataNasc { get; set; } = ""; // dd/MM/yyyy
    public string Endereco { get; set; } = "";
}