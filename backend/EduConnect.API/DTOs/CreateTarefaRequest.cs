namespace EduConnect.API.DTOs
{
    public class CreateTarefaRequest
    {
        public int TurmaDisciplinaId { get; set; }


        public string Tipo { get; set; } = "Tarefa";

    
        public int Numero { get; set; }

        public string Titulo { get; set; } = null!;
        public string? Descricao { get; set; }
        public DateTime DataEntrega { get; set; }
        public decimal Peso { get; set; } = 1m;
        public decimal NotaMaxima { get; set; } = 10m;
    }
}
