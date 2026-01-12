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
    [Route("notificacoes")]
    public class NotificacoesController : ControllerBase
    {
        private readonly EduConnectContext _ctx;
        public NotificacoesController(EduConnectContext ctx) => _ctx = ctx;

        private int GetUserIdFromToken()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(sub) || !int.TryParse(sub, out var userId))
                throw new UnauthorizedAccessException("Token inválido (sub).");

            return userId;
        }

        // ✅ FEED DO DASHBOARD
        // GET /notificacoes/feed?turmaId=1
        // - Aluno: Geral + Turma (NÃO inclui diretas)
        // - Admin/Professor: tudo (pode filtrar por turmaId)
        [HttpGet("feed")]
        [Authorize]
        public async Task<IActionResult> Feed([FromQuery] int? turmaId = null)
        {
            var q = _ctx.Notificacoes
                .AsNoTracking()
                .Include(n => n.Turma)
                .AsQueryable();

            if (User.IsInRole("Aluno"))
            {
                var userId = GetUserIdFromToken();

                // acha a turma do aluno (primeira matrícula)
                var alunoTurmaId = await _ctx.Matriculas
                    .AsNoTracking()
                    .Where(m => m.Aluno.UsuarioId == userId)
                    .Select(m => (int?)m.TurmaId)
                    .FirstOrDefaultAsync();

                // aluno vê:
                // - globais: UsuarioId == null && TurmaId == null
                // - da turma: TurmaId == alunoTurmaId && UsuarioId == null
                // NÃO vê diretas: UsuarioId != null
                q = q.Where(n =>
                    (n.UsuarioId == null && n.TurmaId == null) ||
                    (alunoTurmaId.HasValue && n.UsuarioId == null && n.TurmaId == alunoTurmaId.Value)
                );

                var listAluno = await q
                    .OrderByDescending(n => n.CriadoEmUtc)
                    .Take(60)
                    .Select(n => new
                    {
                        n.Id,
                        n.Titulo,
                        n.Mensagem,
                        criadoEmUtc = n.CriadoEmUtc,
                        n.TurmaId,
                        turmaNome = n.Turma != null ? n.Turma.Nome : null,
                        escopo = n.TurmaId != null ? "Turma" : "Geral"
                    })
                    .ToListAsync();

                return Ok(listAluno);
            }

            // Admin/Professor
            if (turmaId.HasValue)
            {
                // professor só pode ver turma que leciona
                if (User.IsInRole("Professor"))
                {
                    var userId = GetUserIdFromToken();
                    var professor = await _ctx.Professores.AsNoTracking()
                        .FirstOrDefaultAsync(p => p.UsuarioId == userId);

                    if (professor == null) return Forbid();

                    var leciona = await _ctx.TurmaDisciplinas.AsNoTracking()
                        .AnyAsync(td => td.TurmaId == turmaId.Value && td.ProfessorId == professor.Id);

                    if (!leciona) return Forbid();
                }

                // filtra: globais + turma específica + diretas de alunos da turma
                var alunoUserIds = await _ctx.Matriculas.AsNoTracking()
                    .Where(m => m.TurmaId == turmaId.Value)
                    .Select(m => m.Aluno.UsuarioId)
                    .Distinct()
                    .ToListAsync();

                q = q.Where(n =>
                    (n.UsuarioId == null && n.TurmaId == null) ||
                    (n.UsuarioId == null && n.TurmaId == turmaId.Value) ||
                    (n.UsuarioId.HasValue && alunoUserIds.Contains(n.UsuarioId.Value))
                );
            }

            var list = await q
                .OrderByDescending(n => n.CriadoEmUtc)
                .Take(80)
                .Select(n => new
                {
                    n.Id,
                    n.Titulo,
                    n.Mensagem,
                    criadoEmUtc = n.CriadoEmUtc,
                    n.UsuarioId,
                    n.TurmaId,
                    turmaNome = n.Turma != null ? n.Turma.Nome : null,
                    escopo = n.UsuarioId != null ? "Direta" : (n.TurmaId != null ? "Turma" : "Geral"),
                    n.Lida,
                    n.LidaEmUtc
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET /notificacoes/me  (qualquer role)
        // mantém pro AgendaAvisos (globais + diretas do usuário)
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> ListMe()
        {
            var userId = GetUserIdFromToken();

            var list = await _ctx.Notificacoes
                .AsNoTracking()
                .Where(n => n.UsuarioId == null || n.UsuarioId == userId)
                .OrderByDescending(n => n.CriadoEmUtc)
                .Take(50)
                .Select(n => new
                {
                    n.Id,
                    n.Titulo,
                    n.Mensagem,
                    criadoEmUtc = n.CriadoEmUtc,
                    n.UsuarioId,
                    n.TurmaId,
                    n.Lida,
                    n.LidaEmUtc
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET /notificacoes?turmaId=1  (Admin/Professor) - opcional pra telas internas
        [HttpGet]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> List([FromQuery] int? turmaId = null)
        {
            var q = _ctx.Notificacoes.AsNoTracking().AsQueryable();

            if (turmaId.HasValue)
            {
                // professor só pode ver turma que leciona
                if (User.IsInRole("Professor"))
                {
                    var userId = GetUserIdFromToken();
                    var professor = await _ctx.Professores.AsNoTracking()
                        .FirstOrDefaultAsync(p => p.UsuarioId == userId);

                    if (professor == null) return Forbid();

                    var leciona = await _ctx.TurmaDisciplinas.AsNoTracking()
                        .AnyAsync(td => td.TurmaId == turmaId.Value && td.ProfessorId == professor.Id);

                    if (!leciona) return Forbid();
                }

                // globais + turma específica + diretas de alunos daquela turma
                var alunoUserIds = await _ctx.Matriculas.AsNoTracking()
                    .Where(m => m.TurmaId == turmaId.Value)
                    .Select(m => m.Aluno.UsuarioId)
                    .Distinct()
                    .ToListAsync();

                q = q.Where(n =>
                    (n.UsuarioId == null && n.TurmaId == null) ||
                    (n.UsuarioId == null && n.TurmaId == turmaId.Value) ||
                    (n.UsuarioId.HasValue && alunoUserIds.Contains(n.UsuarioId.Value))
                );
            }

            var list = await q
                .OrderByDescending(n => n.CriadoEmUtc)
                .Take(80)
                .Select(n => new
                {
                    n.Id,
                    n.Titulo,
                    n.Mensagem,
                    criadoEmUtc = n.CriadoEmUtc,
                    n.UsuarioId,
                    n.TurmaId,
                    n.Lida,
                    n.LidaEmUtc
                })
                .ToListAsync();

            return Ok(list);
        }

        // POST /notificacoes (Admin/Professor)
        // - Admin pode criar global (UsuarioId null, TurmaId null) ou direta (UsuarioId setado)
        // - Professor só pode criar direta (não global)
        [HttpPost]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> Create([FromBody] CreateNotificacaoRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Titulo))
                return BadRequest(new { message = "Título é obrigatório." });
            if (string.IsNullOrWhiteSpace(req.Mensagem))
                return BadRequest(new { message = "Mensagem é obrigatória." });

            if (User.IsInRole("Professor") && req.UsuarioId == null)
                return Forbid(); // professor não cria global

            if (req.UsuarioId.HasValue)
            {
                var existe = await _ctx.Usuarios.AsNoTracking().AnyAsync(u => u.Id == req.UsuarioId.Value);
                if (!existe) return BadRequest(new { message = "UsuarioId inválido." });
            }

            var n = new Notificacao
            {
                Titulo = req.Titulo.Trim(),
                Mensagem = req.Mensagem.Trim(),
                UsuarioId = req.UsuarioId,
                TurmaId = null // global ou direta, turma é pelo endpoint /turma/{id}
            };

            _ctx.Notificacoes.Add(n);
            await _ctx.SaveChangesAsync();

            return CreatedAtAction(nameof(ListMe), new { }, new { id = n.Id });
        }

        // POST /notificacoes/aluno/{alunoId} (Admin/Professor) -> direta para o usuário do aluno
        [HttpPost("aluno/{alunoId:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> CriarParaAluno(int alunoId, [FromBody] CreateNotificacaoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Titulo) || string.IsNullOrWhiteSpace(request.Mensagem))
                return BadRequest(new { message = "Título e mensagem são obrigatórios." });

            var aluno = await _ctx.Alunos
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == alunoId);

            if (aluno == null)
                return NotFound(new { message = "Aluno não encontrado." });

            var notif = new Notificacao
            {
                Titulo = request.Titulo.Trim(),
                Mensagem = request.Mensagem.Trim(),
                UsuarioId = aluno.UsuarioId,
                TurmaId = null,
                CriadoEmUtc = DateTime.UtcNow
            };

            _ctx.Notificacoes.Add(notif);
            await _ctx.SaveChangesAsync();

            return Ok(new { ok = true, id = notif.Id });
        }

        // ✅ POST /notificacoes/turma/{turmaId} (Admin/Professor) -> UMA notificação para a turma
        [HttpPost("turma/{turmaId:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> CreateForTurma(int turmaId, [FromBody] CreateNotificacaoRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Titulo))
                return BadRequest(new { message = "Título é obrigatório." });
            if (string.IsNullOrWhiteSpace(req.Mensagem))
                return BadRequest(new { message = "Mensagem é obrigatória." });

            // professor só pode enviar pra turma que leciona
            if (User.IsInRole("Professor"))
            {
                var userId = GetUserIdFromToken();
                var professor = await _ctx.Professores.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UsuarioId == userId);

                if (professor == null) return Forbid();

                var leciona = await _ctx.TurmaDisciplinas.AsNoTracking()
                    .AnyAsync(td => td.TurmaId == turmaId && td.ProfessorId == professor.Id);

                if (!leciona) return Forbid();
            }

            var turmaExiste = await _ctx.Turmas.AsNoTracking().AnyAsync(t => t.Id == turmaId);
            if (!turmaExiste) return NotFound(new { message = "Turma não encontrada." });

            var notif = new Notificacao
            {
                Titulo = req.Titulo.Trim(),
                Mensagem = req.Mensagem.Trim(),
                UsuarioId = null,
                TurmaId = turmaId,
                CriadoEmUtc = DateTime.UtcNow
            };

            _ctx.Notificacoes.Add(notif);
            await _ctx.SaveChangesAsync();

            return Ok(new { message = "Notificação criada para a turma.", id = notif.Id });
        }

        // DELETE /notificacoes/{id} (Admin)
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var n = await _ctx.Notificacoes.FirstOrDefaultAsync(x => x.Id == id);
            if (n == null) return NotFound();

            _ctx.Notificacoes.Remove(n);
            await _ctx.SaveChangesAsync();
            return NoContent();
        }
    }
}
