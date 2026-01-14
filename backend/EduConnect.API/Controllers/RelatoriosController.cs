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

        [HttpGet("boletim/{alunoId:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> GerarBoletim(int alunoId)
        {
            return await GerarBoletimInternal(alunoId);
        }

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
                return Forbid();

            return await GerarBoletimInternal(aluno.Id);
        }

        private static decimal Round2(decimal v) => Math.Round(v, 2);

        private async Task<IActionResult> GerarBoletimInternal(int alunoId)
        {
            var aluno = await _ctx.Alunos
                .Include(a => a.Usuario)
                .FirstOrDefaultAsync(a => a.Id == alunoId);

            if (aluno == null)
                return NotFound(new { message = "Aluno não encontrado." });

            var matricula = await _ctx.Matriculas
                .Include(m => m.Turma)
                .Where(m => m.AlunoId == alunoId)
                .OrderBy(m => m.DataMatricula)
                .FirstOrDefaultAsync();

            var turmaNome = matricula?.Turma?.Nome ?? "Não matriculado";

            // Avaliações = linha base (freq + disciplina)
            var avaliacoesDb = await _ctx.Avaliacoes
                .Include(a => a.TurmaDisciplina)!.ThenInclude(td => td.Turma)
                .Include(a => a.TurmaDisciplina)!.ThenInclude(td => td.Disciplina)
                .Include(a => a.TurmaDisciplina)!.ThenInclude(td => td.Professor)!.ThenInclude(p => p.Usuario)
                .Where(a => a.AlunoId == alunoId)
                .ToListAsync();

            // Entregas corrigidas (para detalhar P1..T3/P3)
            var entregas = await _ctx.EntregasTarefas
                .AsNoTracking()
                .Include(e => e.Tarefa)
                .Where(e => e.AlunoId == alunoId && e.Nota != null && e.Tarefa!.Ativa && e.Tarefa.Numero > 0)
                .ToListAsync();

            // helper local
            decimal? NotaAtividade(int turmaDisciplinaId, string tipo, int numero)
            {
                return entregas
                    .Where(e => e.Tarefa!.TurmaDisciplinaId == turmaDisciplinaId &&
                                e.Tarefa.Tipo == tipo &&
                                e.Tarefa.Numero == numero)
                    .Select(e => e.Nota)
                    .FirstOrDefault();
            }

            var avaliacoes = avaliacoesDb
                .Select(a =>
                {
                    var tdId = a.TurmaDisciplinaId;

                    var p1 = NotaAtividade(tdId, "Avaliacao", 1);
                    var p2 = NotaAtividade(tdId, "Avaliacao", 2);
                    var t1 = NotaAtividade(tdId, "Tarefa", 1);
                    var t2 = NotaAtividade(tdId, "Tarefa", 2);
                    var t3 = NotaAtividade(tdId, "Tarefa", 3);
                    var p3 = NotaAtividade(tdId, "Avaliacao", 3);

                    decimal? mediaFinal = null;
                    decimal? mediaPosRec = null;

                    bool baseCompleta = (p1 != null && p2 != null && t1 != null && t2 != null && t3 != null);

                    if (baseCompleta)
                    {
                        var mediaProvas = (p1!.Value + p2!.Value) / 2m;
                        var mediaTarefas = (t1!.Value + t2!.Value + t3!.Value) / 3m;
                        mediaFinal = Round2((0.7m * mediaProvas) + (0.3m * mediaTarefas));

                        if (mediaFinal < 6m && p3 != null)
                            mediaPosRec = Round2(Math.Max(mediaFinal.Value, (mediaFinal.Value + p3.Value) / 2m));
                    }

                    var situacao = CalcularSituacaoNova(a.Frequencia, baseCompleta, mediaFinal, p3, mediaPosRec);

                    return new AvaliacaoResponse
                    {
                        Id = a.Id,
                        AlunoId = aluno.Id,
                        AlunoNome = aluno.Usuario!.Nome,
                        TurmaId = a.TurmaDisciplina!.TurmaId,
                        TurmaNome = a.TurmaDisciplina.Turma!.Nome,
                        DisciplinaId = a.TurmaDisciplina.DisciplinaId,
                        DisciplinaNome = a.TurmaDisciplina.Disciplina!.Nome,
                        ProfessorId = a.TurmaDisciplina.ProfessorId,
                        ProfessorNome = a.TurmaDisciplina.Professor?.Usuario?.Nome,
                        Nota = a.Nota, // nota final gravada (pode ser mediaPosRec ou mediaFinal)
                        Frequencia = a.Frequencia,
                        Situacao = situacao,

                        // ✅ detalhamento
                        P1 = p1,
                        P2 = p2,
                        T1 = t1,
                        T2 = t2,
                        T3 = t3,
                        P3 = p3,
                        MediaFinal = mediaFinal,
                        MediaPosRec = mediaPosRec
                    };
                })
                .OrderBy(x => x.DisciplinaNome)
                .ToList();

            var pdfBytes = _boletimPdfService.GerarBoletimPdf(
                aluno.Usuario!.Nome,
                aluno.RA,
                turmaNome,
                avaliacoes
            );

            var fileName = $"boletim_{aluno.RA}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }

        // nova  regra:
        // freq < 75 => reprovado por frequencia
        // se base incompleta => incompleto
        // mediaFinal >= 6 => aprovado
        // mediaFinal < 6 e sem P3 => recuperaçao
        // com P3 => mediaPosRec >= 6 aprovado pós-rec, senão reprovado por nota
        private static string CalcularSituacaoNova(decimal frequencia, bool baseCompleta, decimal? mediaFinal, decimal? p3, decimal? mediaPosRec)
        {
            if (frequencia < 75m)
                return "Reprovado por frequência";

            if (!baseCompleta || mediaFinal == null)
                return "Incompleto";

            if (mediaFinal.Value >= 6m)
                return "Aprovado";

            if (p3 == null)
                return "Recuperação";

            if (mediaPosRec != null && mediaPosRec.Value >= 6m)
                return "Aprovado pós-rec";

            return "Reprovado por nota";
        }
    }
}
