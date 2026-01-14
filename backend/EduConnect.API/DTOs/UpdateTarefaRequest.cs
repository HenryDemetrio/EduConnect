namespace EduConnect.API.DTOs
{
    public class UpdateTarefaRequest
    {
        public string Tipo { get; set; } = "Tarefa";

        // ✅ novo: 1..3 (T1..T3 ou P1..P3)
        public int Numero { get; set; }

        public string Titulo { get; set; } = null!;
        public string? Descricao { get; set; }
        public DateTime DataEntrega { get; set; }
        public decimal Peso { get; set; } = 1m;
        public decimal NotaMaxima { get; set; } = 10m;

        public bool Ativa { get; set; } = true;
    }
}
