namespace EduConnect.API.DTOs
{
    public class RegistrarAvaliacaoRequest
    {
        public int AlunoId { get; set; }
        public int TurmaDisciplinaId { get; set; }

        // 0–10
        public decimal Nota { get; set; }

        // 0–100
        public decimal Frequencia { get; set; }
    }
}
