using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using EduConnect.API.Data;
using EduConnect.API.DTOs;
using EduConnect.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.API.Controllers
{
    [ApiController]
    [Route("relatorios")]
    public class RelatoriosController : ControllerBase
    {
        private readonly EduConnectContext _ctx;
        private readonly BoletimPdfService _boletimPdfService;

        public RelatoriosController(EduConnectContext ctx, BoletimPdfService boletimPdfService)
        {
            _ctx = ctx;
            _boletimPdfService = boletimPdfService;
        }

        // GET /relatorios/boletim/{alunoId}  (ADMIN / PROFESSOR)
        [HttpGet("boletim/{alunoId:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> GerarBoletim(int alunoId)
        {
            return await GerarBoletimInternal(alunoId);
        }

        // GET /relatorios/me/boletim (ALUNO)
        [HttpGet("me/boletim")]
        [Authorize(Roles = "Aluno")]
        public async Task<IActionResult> GerarBoletimMe()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(sub) || !int.TryParse(sub, out var userId))
                return Unauthorized(new { message = "Token inválido (sub)." });

            var aluno = await _ctx.Alunos
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.UsuarioId == userId);

            if (aluno == null)
                return Forbid(); // token diz "Aluno", mas não achou vínculo Aluno-Usuario

            return await GerarBoletimInternal(aluno.Id);
        }

        // -----------------------
        // Implementação compartilhada
        // -----------------------
        private async Task<IActionResult> GerarBoletimInternal(int alunoId)
        {
            // Busca o aluno com os dados de login
            var aluno = await _ctx.Alunos
                .Include(a => a.Usuario)
                .FirstOrDefaultAsync(a => a.Id == alunoId);

            if (aluno == null)
                return NotFound(new { message = "Aluno não encontrado." });

            // Pega a PRIMEIRA matrícula por data pra descobrir a turma (mais consistente)
            var matricula = await _ctx.Matriculas
                .Include(m => m.Turma)
                .Where(m => m.AlunoId == alunoId)
                .OrderBy(m => m.DataMatricula)
                .FirstOrDefaultAsync();

            var turmaNome = matricula?.Turma?.Nome ?? "Não matriculado";

            // Busca avaliações no banco
            var avaliacoesDb = await _ctx.Avaliacoes
                .Include(a => a.TurmaDisciplina)!.ThenInclude(td => td.Turma)
                .Include(a => a.TurmaDisciplina)!.ThenInclude(td => td.Disciplina)
                .Include(a => a.TurmaDisciplina)!.ThenInclude(td => td.Professor)!.ThenInclude(p => p.Usuario)
                .Where(a => a.AlunoId == alunoId)
                .ToListAsync();

            // Monta DTOs
            var avaliacoes = avaliacoesDb
                .Select(a => new AvaliacaoResponse
                {
                    Id = a.Id,
                    AlunoId = aluno.Id,
                    AlunoNome = aluno.Usuario!.Nome,
                    TurmaId = a.TurmaDisciplina!.TurmaId,
                    TurmaNome = a.TurmaDisciplina.Turma!.Nome,
                    DisciplinaId = a.TurmaDisciplina.DisciplinaId,
                    DisciplinaNome = a.TurmaDisciplina.Disciplina!.Nome,
                    ProfessorId = a.TurmaDisciplina.ProfessorId,
                    ProfessorNome = a.TurmaDisciplina.Professor!.Usuario!.Nome,
                    Nota = a.Nota,
                    Frequencia = a.Frequencia,
                    Situacao = CalcularSituacao(a.Nota, a.Frequencia)
                })
                .ToList();

            // Gera PDF
            var pdfBytes = _boletimPdfService.GerarBoletimPdf(
                aluno.Usuario!.Nome,
                aluno.RA,
                turmaNome,
                avaliacoes
            );

            var fileName = $"boletim_{aluno.RA}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }

        private string CalcularSituacao(decimal nota, decimal frequencia)
        {
            if (frequencia < 75)
                return "Reprovado por frequência";

            if (nota >= 7)
                return "Aprovado";

            if (nota >= 5)
                return "Recuperação";

            return "Reprovado por nota";
        }
    }
}
