using EduConnect.API.Entities;

public class Professor
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    public string Registro { get; set; } = null!;

    // NOVO: email pessoal/contato
    public string EmailContato { get; set; } = null!;
}
