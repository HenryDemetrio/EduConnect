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

        // GET /notificacoes/me  (Aluno/Professor/Admin -> globais + do usuário)
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
                    criadaEmUtc = n.CriadoEmUtc,
                    n.UsuarioId,
                    n.Lida,
                    n.LidaEmUtc
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET /notificacoes?turmaId=1  (Admin/Professor -> globais + notificações para alunos da turma)
        [HttpGet]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> List([FromQuery] int? turmaId = null)
        {
            var q = _ctx.Notificacoes.AsNoTracking().AsQueryable();

            if (turmaId.HasValue)
            {
                // Se professor, só pode ver turma que leciona
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

                var alunoUserIds = await _ctx.Matriculas.AsNoTracking()
                    .Where(m => m.TurmaId == turmaId.Value)
                    .Select(m => m.Aluno.UsuarioId)
                    .Distinct()
                    .ToListAsync();

                q = q.Where(n => n.UsuarioId == null || (n.UsuarioId.HasValue && alunoUserIds.Contains(n.UsuarioId.Value)));
            }

            var list = await q
                .OrderByDescending(n => n.CriadoEmUtc)
                .Take(80)
                .Select(n => new
                {
                    n.Id,
                    n.Titulo,
                    n.Mensagem,
                    criadaEmUtc = n.CriadoEmUtc,
                    n.UsuarioId,
                    n.Lida,
                    n.LidaEmUtc
                })
                .ToListAsync();

            return Ok(list);
        }

        // POST /notificacoes (Admin/Professor)
        // - Admin pode criar global (UsuarioId null) ou para um usuário
        // - Professor só pode criar para um usuário (não global)
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

            // se for para usuário específico, valida existência
            if (req.UsuarioId.HasValue)
            {
                var existe = await _ctx.Usuarios.AsNoTracking().AnyAsync(u => u.Id == req.UsuarioId.Value);
                if (!existe) return BadRequest(new { message = "UsuarioId inválido." });
            }

            var n = new Notificacao
            {
                Titulo = req.Titulo.Trim(),
                Mensagem = req.Mensagem.Trim(),
                UsuarioId = req.UsuarioId
                // CriadoEmUtc já é default
            };

            _ctx.Notificacoes.Add(n);
            await _ctx.SaveChangesAsync();

            return CreatedAtAction(nameof(ListMe), new { }, new { id = n.Id });
        }

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
                CriadoEmUtc = DateTime.UtcNow
            };

            _ctx.Notificacoes.Add(notif);
            await _ctx.SaveChangesAsync();

            return Ok(new { ok = true, id = notif.Id });
        }


        // POST /notificacoes/turma/{turmaId}  (Admin/Professor) -> cria uma notificação para CADA aluno da turma
        [HttpPost("turma/{turmaId:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> CreateForTurma(int turmaId, [FromBody] CreateNotificacaoRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Titulo))
                return BadRequest(new { message = "Título é obrigatório." });
            if (string.IsNullOrWhiteSpace(req.Mensagem))
                return BadRequest(new { message = "Mensagem é obrigatória." });

            // Se professor, só pode enviar pra turma que leciona
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

            var alunoUserIds = await _ctx.Matriculas.AsNoTracking()
                .Where(m => m.TurmaId == turmaId)
                .Select(m => m.Aluno.UsuarioId)
                .Distinct()
                .ToListAsync();

            if (alunoUserIds.Count == 0)
                return Ok(new { message = "Turma sem alunos matriculados.", count = 0 });

            foreach (var uid in alunoUserIds)
            {
                _ctx.Notificacoes.Add(new Notificacao
                {
                    Titulo = req.Titulo.Trim(),
                    Mensagem = req.Mensagem.Trim(),
                    UsuarioId = uid
                });
            }

            await _ctx.SaveChangesAsync();
            return Ok(new { message = "Notificações criadas para a turma.", count = alunoUserIds.Count });
        }

        // DELETE /notificacoes/{id} (Admin) - útil pra “remover aviso” na UI
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
