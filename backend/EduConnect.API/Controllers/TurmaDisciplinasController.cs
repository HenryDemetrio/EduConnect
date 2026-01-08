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
    [Route("turmas")]
    public class TurmaDisciplinasController : ControllerBase
    {
        private readonly EduConnectContext _ctx;

        public TurmaDisciplinasController(EduConnectContext ctx)
        {
            _ctx = ctx;
        }

        private int GetUserIdFromToken()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(sub) || !int.TryParse(sub, out var userId))
                throw new UnauthorizedAccessException("Token inválido (sub).");

            return userId;
        }

        // POST /turmas/{turmaId}/disciplinas
        [HttpPost("{turmaId:int}/disciplinas")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Vincular(int turmaId, CreateTurmaDisciplinaRequest req)
        {
            var turmaExiste = await _ctx.Turmas.AnyAsync(t => t.Id == turmaId);
            if (!turmaExiste) return BadRequest(new { message = "TurmaId inválido." });

            var discExiste = await _ctx.Disciplinas.AnyAsync(d => d.Id == req.DisciplinaId);
            if (!discExiste) return BadRequest(new { message = "DisciplinaId inválido." });

            var profExiste = await _ctx.Professores.AnyAsync(p => p.Id == req.ProfessorId);
            if (!profExiste) return BadRequest(new { message = "ProfessorId inválido." });

            var jaExiste = await _ctx.TurmaDisciplinas
                .AnyAsync(td => td.TurmaId == turmaId && td.DisciplinaId == req.DisciplinaId);

            if (jaExiste) return Conflict(new { message = "Esta disciplina já está vinculada a esta turma." });

            var tdNew = new TurmaDisciplina
            {
                TurmaId = turmaId,
                DisciplinaId = req.DisciplinaId,
                ProfessorId = req.ProfessorId
            };

            _ctx.TurmaDisciplinas.Add(tdNew);
            await _ctx.SaveChangesAsync();

            return CreatedAtAction(nameof(ListarGrade), new { turmaId }, new { id = tdNew.Id });
        }

        // GET /turmas/{turmaId}/disciplinas
        [HttpGet("{turmaId:int}/disciplinas")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> ListarGrade([FromRoute] int turmaId)
        {
            var query = _ctx.TurmaDisciplinas
                .AsNoTracking()
                .Include(td => td.Turma)
                .Include(td => td.Disciplina)
                .Include(td => td.Professor)
                    .ThenInclude(p => p.Usuario)
                .Where(td => td.TurmaId == turmaId);

            if (User.IsInRole("Professor"))
            {
                var userId = GetUserIdFromToken();
                var professor = await _ctx.Professores.AsNoTracking().FirstOrDefaultAsync(p => p.UsuarioId == userId);
                if (professor == null) return Forbid();

                query = query.Where(td => td.ProfessorId == professor.Id);
            }

            var list = await query
                .Select(td => new TurmaDisciplinaResponse
                {
                    Id = td.Id,
                    TurmaId = td.TurmaId,
                    TurmaNome = td.Turma.Nome,
                    DisciplinaId = td.DisciplinaId,
                    DisciplinaNome = td.Disciplina.Nome,
                    ProfessorId = td.ProfessorId,
                    ProfessorNome = td.ProfessorId == null ? null : td.Professor.Usuario.Nome
                })
                .ToListAsync();

            return Ok(list);
        }

        // PUT /turmas/disciplinas/{id}
        [HttpPut("disciplinas/{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> TrocarProfessor([FromRoute] int id, [FromBody] TrocarProfessorTurmaDisciplinaRequest req)
        {
            var td = await _ctx.TurmaDisciplinas.FirstOrDefaultAsync(x => x.Id == id);
            if (td == null) return NotFound(new { message = "TurmaDisciplina não encontrada." });

            // ✅ DESVINCULAR
            if (req.ProfessorId == null)
            {
                td.ProfessorId = null;
                await _ctx.SaveChangesAsync();
                return NoContent();
            }

            var profExiste = await _ctx.Professores.AnyAsync(p => p.Id == req.ProfessorId.Value);
            if (!profExiste) return BadRequest(new { message = "ProfessorId inválido." });

            td.ProfessorId = req.ProfessorId.Value;
            await _ctx.SaveChangesAsync();

            return NoContent();
        }


        // DELETE /turmas/disciplinas/{id}
        [HttpDelete("disciplinas/{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Remover([FromRoute] int id)
        {
            var td = await _ctx.TurmaDisciplinas.FirstOrDefaultAsync(x => x.Id == id);
            if (td == null) return NotFound(new { message = "TurmaDisciplina não encontrada." });

            var temAvaliacoes = await _ctx.Avaliacoes.AnyAsync(a => a.TurmaDisciplinaId == id);
            if (temAvaliacoes)
                return Conflict(new { message = "Não é possível remover: existem avaliações vinculadas." });

            _ctx.TurmaDisciplinas.Remove(td);
            await _ctx.SaveChangesAsync();

            return NoContent();
        }
    }
}
