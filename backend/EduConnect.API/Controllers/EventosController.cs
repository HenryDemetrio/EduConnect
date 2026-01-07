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
    [Route("eventos")]
    public class EventosController : ControllerBase
    {
        private readonly EduConnectContext _ctx;
        public EventosController(EduConnectContext ctx) => _ctx = ctx;

        private int GetUserId()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(sub) || !int.TryParse(sub, out var userId))
                throw new UnauthorizedAccessException("Token inválido (sub).");

            return userId;
        }

        // POST /eventos (Admin)
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateEventoEscolarRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Titulo))
                return BadRequest(new { message = "Título é obrigatório." });

            if (req.FimUtc.HasValue && req.FimUtc.Value < req.InicioUtc)
                return BadRequest(new { message = "FimUtc não pode ser menor que InicioUtc." });

            if (req.TurmaId.HasValue)
            {
                var turmaExiste = await _ctx.Turmas.AnyAsync(t => t.Id == req.TurmaId.Value);
                if (!turmaExiste) return BadRequest(new { message = "TurmaId inválido." });
            }

            var e = new EventoEscolar
            {
                Titulo = req.Titulo.Trim(),
                Descricao = req.Descricao,
                InicioUtc = req.InicioUtc,
                FimUtc = req.FimUtc,
                TurmaId = req.TurmaId
            };

            _ctx.EventosEscolares.Add(e);
            await _ctx.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
        }

        // GET /eventos/{id}
        [HttpGet("{id:int}")]
        [Authorize]
        public async Task<IActionResult> GetById(int id)
        {
            var e = await _ctx.EventosEscolares
                .AsNoTracking()
                .Include(x => x.Turma)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (e == null) return NotFound();

            return Ok(new EventoEscolarResponse
            {
                Id = e.Id,
                Titulo = e.Titulo,
                Descricao = e.Descricao,
                InicioUtc = e.InicioUtc,
                FimUtc = e.FimUtc,
                TurmaId = e.TurmaId,
                TurmaNome = e.Turma?.Nome
            });
        }

        // GET /eventos?turmaId=1
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> List([FromQuery] int? turmaId = null)
        {
            var q = _ctx.EventosEscolares.AsNoTracking().Include(x => x.Turma).AsQueryable();

            if (turmaId.HasValue)
                q = q.Where(e => e.TurmaId == turmaId.Value);

            var list = await q
                .OrderBy(e => e.InicioUtc)
                .Select(e => new EventoEscolarResponse
                {
                    Id = e.Id,
                    Titulo = e.Titulo,
                    Descricao = e.Descricao,
                    InicioUtc = e.InicioUtc,
                    FimUtc = e.FimUtc,
                    TurmaId = e.TurmaId,
                    TurmaNome = e.Turma != null ? e.Turma.Nome : null
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET /eventos/me  (Aluno -> global + turma do aluno)
        [HttpGet("me")]
        [Authorize(Roles = "Aluno")]
        public async Task<IActionResult> ListMe()
        {
            var userId = GetUserId();

            var aluno = await _ctx.Alunos.AsNoTracking()
                .FirstOrDefaultAsync(a => a.UsuarioId == userId);

            if (aluno == null) return Forbid();

            // regra igual a do boletim: usa a 1ª matrícula
            var turmaId = await _ctx.Matriculas.AsNoTracking()
                .Where(m => m.AlunoId == aluno.Id)
                .OrderBy(m => m.DataMatricula)
                .Select(m => (int?)m.TurmaId)
                .FirstOrDefaultAsync();

            var q = _ctx.EventosEscolares.AsNoTracking()
                .Include(e => e.Turma)
                .Where(e => e.TurmaId == null || (turmaId.HasValue && e.TurmaId == turmaId.Value));

            var list = await q
                .OrderBy(e => e.InicioUtc)
                .Select(e => new EventoEscolarResponse
                {
                    Id = e.Id,
                    Titulo = e.Titulo,
                    Descricao = e.Descricao,
                    InicioUtc = e.InicioUtc,
                    FimUtc = e.FimUtc,
                    TurmaId = e.TurmaId,
                    TurmaNome = e.Turma != null ? e.Turma.Nome : null
                })
                .ToListAsync();

            return Ok(list);
        }

        // PUT /eventos/{id} (Admin)
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateEventoEscolarRequest req)
        {
            var e = await _ctx.EventosEscolares.FirstOrDefaultAsync(x => x.Id == id);
            if (e == null) return NotFound();

            if (string.IsNullOrWhiteSpace(req.Titulo))
                return BadRequest(new { message = "Título é obrigatório." });

            if (req.FimUtc.HasValue && req.FimUtc.Value < req.InicioUtc)
                return BadRequest(new { message = "FimUtc não pode ser menor que InicioUtc." });

            if (req.TurmaId.HasValue)
            {
                var turmaExiste = await _ctx.Turmas.AnyAsync(t => t.Id == req.TurmaId.Value);
                if (!turmaExiste) return BadRequest(new { message = "TurmaId inválido." });
            }

            e.Titulo = req.Titulo.Trim();
            e.Descricao = req.Descricao;
            e.InicioUtc = req.InicioUtc;
            e.FimUtc = req.FimUtc;
            e.TurmaId = req.TurmaId;

            await _ctx.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /eventos/{id} (Admin)
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var e = await _ctx.EventosEscolares.FirstOrDefaultAsync(x => x.Id == id);
            if (e == null) return NotFound();

            _ctx.EventosEscolares.Remove(e);
            await _ctx.SaveChangesAsync();
            return NoContent();
        }
    }
}
