using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using EduConnect.API.Data;
using EduConnect.API.DTOs;
using EduConnect.API.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.API.Controllers
{
    [ApiController]
    [Route("avaliacoes")]
    public class AvaliacoesController : ControllerBase
    {
        private readonly EduConnectContext _ctx;

        public AvaliacoesController(EduConnectContext ctx)
        {
            _ctx = ctx;
        }

        // -------- Helpers --------
        private int GetUserIdFromToken()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(sub) || !int.TryParse(sub, out var userId))
                throw new UnauthorizedAccessException("Token inválido (sub).");

            return userId;
        }

        private async Task<int> GetProfessorIdOrThrowAsync()
        {
            var userId = GetUserIdFromToken();

            var prof = await _ctx.Professores
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UsuarioId == userId);

            if (prof == null)
                throw new UnauthorizedAccessException("Usuário autenticado não é Professor.");

            return prof.Id;
        }

        private async Task<bool> ProfessorPodeTurmaDisciplinaAsync(int turmaDisciplinaId)
        {
            if (User.IsInRole("Admin")) return true;
            if (!User.IsInRole("Professor")) return false;

            var professorId = await GetProfessorIdOrThrowAsync();

            return await _ctx.TurmaDisciplinas
                .AsNoTracking()
                .AnyAsync(td => td.Id == turmaDisciplinaId && td.ProfessorId == professorId);
        }

        private static decimal Round2(decimal v) => Math.Round(v, 2);

        private static decimal? GetNota(Dictionary<(string tipo, int numero), decimal> map, string tipo, int numero)
            => map.TryGetValue((tipo, numero), out var n) ? n : null;

        // ✅ GET /avaliacoes/me (ALUNO)
        [HttpGet("me")]
        [Authorize(Roles = "Aluno")]
        public async Task<IActionResult> GetMine()
        {
            var userId = GetUserIdFromToken();

            var aluno = await _ctx.Alunos.AsNoTracking()
                .FirstOrDefaultAsync(a => a.UsuarioId == userId);

            if (aluno == null)
                return Ok(new List<object>());

            var dados = await _ctx.Avaliacoes
                .AsNoTracking()
                .Where(a => a.AlunoId == aluno.Id)
                .Include(a => a.TurmaDisciplina)!.ThenInclude(td => td.Disciplina)
                .Select(a => new
                {
                    disciplinaNome = a.TurmaDisciplina!.Disciplina!.Nome,
                    nota = a.Nota,
                    frequencia = a.Frequencia
                })
                .ToListAsync();

            return Ok(dados);
        }

        // ✅ GET /avaliacoes/resumo?turmaId=1 (ADMIN/PROFESSOR)
        [HttpGet("resumo")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> GetResumo([FromQuery] int? turmaId = null)
        {
            IQueryable<Avaliacao> q = _ctx.Avaliacoes
                .AsNoTracking()
                .Include(a => a.TurmaDisciplina)!.ThenInclude(td => td.Disciplina);

            if (User.IsInRole("Professor"))
            {
                var professorId = await GetProfessorIdOrThrowAsync();
                q = q.Where(a => a.TurmaDisciplina!.ProfessorId == professorId);
            }

            if (turmaId.HasValue)
                q = q.Where(a => a.TurmaDisciplina!.TurmaId == turmaId.Value);

            var resumo = await q
                .GroupBy(a => new
                {
                    DisciplinaId = a.TurmaDisciplina!.DisciplinaId,
                    DisciplinaNome = a.TurmaDisciplina!.Disciplina!.Nome
                })
                .Select(g => new
                {
                    disciplinaId = g.Key.DisciplinaId,
                    disciplinaNome = g.Key.DisciplinaNome,
                    mediaNota = Math.Round(g.Average(x => x.Nota), 1),
                    total = g.Count()
                })
                .OrderBy(x => x.disciplinaNome)
                .ToListAsync();

            return Ok(resumo);
        }

        // ✅ NOVO: POST /avaliacoes/fechar (ADMIN/PROFESSOR)
        // Fecha nota final por aluno + TurmaDisciplina, exigindo completude.
        [HttpPost("fechar")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> Fechar([FromBody] FecharBoletimRequest req)
        {
            if (req.AlunoId <= 0 || req.TurmaDisciplinaId <= 0)
                return BadRequest(new { message = "AlunoId e TurmaDisciplinaId são obrigatórios." });

            if (req.Frequencia < 0 || req.Frequencia > 100)
                return BadRequest(new { message = "Frequência deve estar entre 0 e 100." });

            // permissão
            if (!(await ProfessorPodeTurmaDisciplinaAsync(req.TurmaDisciplinaId)))
                return Forbid();

            var td = await _ctx.TurmaDisciplinas
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == req.TurmaDisciplinaId);

            if (td == null)
                return NotFound(new { message = "Turma/Disciplina não encontrada." });

            // aluno existe + matriculado na turma
            var alunoExiste = await _ctx.Alunos.AnyAsync(a => a.Id == req.AlunoId);
            if (!alunoExiste)
                return NotFound(new { message = "Aluno não encontrado." });

            var matriculado = await _ctx.Matriculas
                .AsNoTracking()
                .AnyAsync(m => m.AlunoId == req.AlunoId && m.TurmaId == td.TurmaId);

            if (!matriculado)
                return Conflict(new { message = "Aluno não está matriculado na turma desta disciplina." });

            // buscar entregas corrigidas com Tipo+Numero (robusto)
            var entregas = await _ctx.EntregasTarefas
                .AsNoTracking()
                .Include(e => e.Tarefa)
                .Where(e =>
                    e.AlunoId == req.AlunoId &&
                    e.Nota != null &&
                    e.Tarefa!.TurmaDisciplinaId == req.TurmaDisciplinaId &&
                    e.Tarefa.Numero > 0 &&
                    e.Tarefa.Ativa)
                .ToListAsync();

            var map = entregas
                .Where(e => e.Tarefa != null)
                .GroupBy(e => (e.Tarefa!.Tipo, e.Tarefa!.Numero))
                .ToDictionary(g => (g.Key.Tipo, g.Key.Numero), g => g.First().Nota!.Value);

            decimal? p1 = GetNota(map, "Avaliacao", 1);
            decimal? p2 = GetNota(map, "Avaliacao", 2);
            decimal? t1 = GetNota(map, "Tarefa", 1);
            decimal? t2 = GetNota(map, "Tarefa", 2);
            decimal? t3 = GetNota(map, "Tarefa", 3);
            decimal? p3 = GetNota(map, "Avaliacao", 3); // recuperação

            // exigir base completa
            var faltando = new List<string>();
            if (p1 == null) faltando.Add("P1");
            if (p2 == null) faltando.Add("P2");
            if (t1 == null) faltando.Add("T1");
            if (t2 == null) faltando.Add("T2");
            if (t3 == null) faltando.Add("T3");

            if (faltando.Count > 0)
                return Conflict(new { message = $"Boletim incompleto: faltam notas para {string.Join(", ", faltando)}." });

            // regra de frequência
            if (req.Frequencia < 75)
            {
                // grava/atualiza mesmo assim (nota final pode ser a média base)
                var mediaBase = Round2((0.7m * ((p1!.Value + p2!.Value) / 2m)) + (0.3m * ((t1!.Value + t2!.Value + t3!.Value) / 3m)));

                var avFalta = await _ctx.Avaliacoes
                    .FirstOrDefaultAsync(a => a.AlunoId == req.AlunoId && a.TurmaDisciplinaId == req.TurmaDisciplinaId);

                if (avFalta == null)
                {
                    avFalta = new Avaliacao
                    {
                        AlunoId = req.AlunoId,
                        TurmaDisciplinaId = req.TurmaDisciplinaId
                    };
                    _ctx.Avaliacoes.Add(avFalta);
                }

                avFalta.Frequencia = req.Frequencia;
                avFalta.Nota = mediaBase;

                await _ctx.SaveChangesAsync();

                return Ok(new
                {
                    situacao = "Reprovado por frequência",
                    frequencia = req.Frequencia,
                    mediaFinal = mediaBase
                });
            }

            // média final 70/30
            var mediaProvas = (p1!.Value + p2!.Value) / 2m;
            var mediaTarefas = (t1!.Value + t2!.Value + t3!.Value) / 3m;
            var mediaFinal = Round2((0.7m * mediaProvas) + (0.3m * mediaTarefas));

            string situacao;
            decimal notaFinalParaGravar = mediaFinal;
            decimal? mediaPosRec = null;

            if (mediaFinal >= 6m)
            {
                situacao = "Aprovado";
            }
            else
            {
                // precisa de P3 pra FECHAR de verdade
                if (p3 == null)
                    return Conflict(new { message = "Aluno em recuperação. Corrija a P3 (Recuperação) para finalizar." });

                mediaPosRec = Round2(Math.Max(mediaFinal, (mediaFinal + p3.Value) / 2m));
                notaFinalParaGravar = mediaPosRec.Value;

                situacao = mediaPosRec.Value >= 6m ? "Aprovado pós-rec" : "Reprovado por nota";
            }

            // grava/atualiza Avaliacao (linha do boletim)
            var av = await _ctx.Avaliacoes
                .FirstOrDefaultAsync(a => a.AlunoId == req.AlunoId && a.TurmaDisciplinaId == req.TurmaDisciplinaId);

            if (av == null)
            {
                av = new Avaliacao
                {
                    AlunoId = req.AlunoId,
                    TurmaDisciplinaId = req.TurmaDisciplinaId
                };
                _ctx.Avaliacoes.Add(av);
            }

            av.Frequencia = req.Frequencia;
            av.Nota = notaFinalParaGravar;

            await _ctx.SaveChangesAsync();

            return Ok(new
            {
                situacao,
                p1,
                p2,
                t1,
                t2,
                t3,
                p3,
                mediaFinal,
                mediaPosRec,
                frequencia = req.Frequencia
            });
        }

        // POST /avaliacoes  (ADMIN / PROFESSOR) -> (mantém, mas você pode usar só /fechar)
        [HttpPost]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> Create([FromBody] RegistrarAvaliacaoRequest req)
        {
            if (req.AlunoId <= 0 || req.TurmaDisciplinaId <= 0)
                return BadRequest(new { message = "AlunoId e TurmaDisciplinaId são obrigatórios." });

            if (req.Nota < 0 || req.Nota > 10)
                return BadRequest(new { message = "Nota deve estar entre 0 e 10." });

            if (req.Frequencia < 0 || req.Frequencia > 100)
                return BadRequest(new { message = "Frequência deve estar entre 0 e 100." });

            var alunoExiste = await _ctx.Alunos.AnyAsync(a => a.Id == req.AlunoId);
            if (!alunoExiste)
                return NotFound(new { message = "Aluno não encontrado." });

            var turmaDisciplina = await _ctx.TurmaDisciplinas
                .AsNoTracking()
                .FirstOrDefaultAsync(td => td.Id == req.TurmaDisciplinaId);

            if (turmaDisciplina == null)
                return NotFound(new { message = "Turma/Disciplina não encontrada." });

            if (!(await ProfessorPodeTurmaDisciplinaAsync(req.TurmaDisciplinaId)))
                return Forbid();

            var matriculado = await _ctx.Matriculas
                .AsNoTracking()
                .AnyAsync(m => m.AlunoId == req.AlunoId && m.TurmaId == turmaDisciplina.TurmaId);

            if (!matriculado)
                return Conflict(new { message = "Aluno não está matriculado na turma desta disciplina." });

            var jaExiste = await _ctx.Avaliacoes
                .AnyAsync(a => a.AlunoId == req.AlunoId && a.TurmaDisciplinaId == req.TurmaDisciplinaId);

            if (jaExiste)
                return Conflict(new { message = "Avaliação já cadastrada para este aluno nessa disciplina." });

            var avaliacao = new Avaliacao
            {
                AlunoId = req.AlunoId,
                TurmaDisciplinaId = req.TurmaDisciplinaId,
                Nota = req.Nota,
                Frequencia = req.Frequencia
            };

            _ctx.Avaliacoes.Add(avaliacao);
            await _ctx.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = avaliacao.Id }, new { id = avaliacao.Id });
        }

        // GET /avaliacoes/{id}  (ADMIN / PROFESSOR)
        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<ActionResult<AvaliacaoResponse>> GetById(int id)
        {
            var a = await _ctx.Avaliacoes
                .Include(x => x.Aluno)!.ThenInclude(al => al.Usuario)
                .Include(x => x.TurmaDisciplina)!.ThenInclude(td => td.Turma)
                .Include(x => x.TurmaDisciplina)!.ThenInclude(td => td.Disciplina)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (a == null)
                return NotFound(new { message = "Avaliação não encontrada." });

            if (!(await ProfessorPodeTurmaDisciplinaAsync(a.TurmaDisciplinaId)))
                return Forbid();

            var resp = new AvaliacaoResponse
            {
                Id = a.Id,
                AlunoId = a.AlunoId,
                AlunoNome = a.Aluno!.Usuario!.Nome,
                TurmaNome = a.TurmaDisciplina!.Turma!.Nome,
                DisciplinaNome = a.TurmaDisciplina.Disciplina!.Nome,
                Nota = a.Nota,
                Frequencia = a.Frequencia
            };

            return Ok(resp);
        }

        // GET /avaliacoes/aluno/{alunoId}  (ADMIN / PROFESSOR)
        [HttpGet("aluno/{alunoId:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<ActionResult<IEnumerable<AvaliacaoResponse>>> GetByAluno(int alunoId)
        {
            var query = _ctx.Avaliacoes
                .Include(x => x.Aluno)!.ThenInclude(al => al.Usuario)
                .Include(x => x.TurmaDisciplina)!.ThenInclude(td => td.Turma)
                .Include(x => x.TurmaDisciplina)!.ThenInclude(td => td.Disciplina)
                .Where(x => x.AlunoId == alunoId);

            if (User.IsInRole("Professor"))
            {
                var professorId = await GetProfessorIdOrThrowAsync();
                query = query.Where(x => x.TurmaDisciplina!.ProfessorId == professorId);
            }

            var dados = await query
                .Select(a => new AvaliacaoResponse
                {
                    Id = a.Id,
                    AlunoId = a.AlunoId,
                    AlunoNome = a.Aluno!.Usuario!.Nome,
                    TurmaNome = a.TurmaDisciplina!.Turma!.Nome,
                    DisciplinaNome = a.TurmaDisciplina.Disciplina!.Nome,
                    Nota = a.Nota,
                    Frequencia = a.Frequencia
                })
                .ToListAsync();

            return Ok(dados);
        }

        // DELETE /avaliacoes/{id}  (ADMIN / PROFESSOR)
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> Delete(int id)
        {
            var avaliacao = await _ctx.Avaliacoes
                .Include(a => a.TurmaDisciplina)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (avaliacao == null)
                return NotFound(new { message = "Avaliação não encontrada." });

            if (!(await ProfessorPodeTurmaDisciplinaAsync(avaliacao.TurmaDisciplinaId)))
                return Forbid();

            _ctx.Avaliacoes.Remove(avaliacao);
            await _ctx.SaveChangesAsync();

            return NoContent();
        }
    }

    // ✅ request novo pro fechamento
    public class FecharBoletimRequest
    {
        public int AlunoId { get; set; }
        public int TurmaDisciplinaId { get; set; }
        public decimal Frequencia { get; set; }
    }
}
