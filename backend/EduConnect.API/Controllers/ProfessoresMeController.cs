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
    [Route("professores")]
    public class ProfessoresMeController : ControllerBase
    {
        private readonly EduConnectContext _ctx;

        public ProfessoresMeController(EduConnectContext ctx)
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

        [HttpGet("me/turmas")]
        [Authorize(Roles = "Professor")]
        public async Task<IActionResult> GetMinhasTurmasEDisciplinas()
        {
            var userId = GetUserIdFromToken();

            var professor = await _ctx.Professores
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UsuarioId == userId);

            if (professor == null)
                return Forbid();

            var itens = await _ctx.TurmaDisciplinas
                .AsNoTracking()
                .Include(td => td.Turma)
                .Include(td => td.Disciplina)
                .Where(td => td.ProfessorId == professor.Id)
                .OrderBy(td => td.Turma.Ano)
                .ThenBy(td => td.Turma.Nome)
                .ThenBy(td => td.Disciplina.Nome)
                .Select(td => new ProfessorTurmaDisciplinaResponse
                {
                    TurmaDisciplinaId = td.Id,
                    TurmaId = td.TurmaId,
                    TurmaNome = td.Turma.Nome,
                    TurmaCodigo = td.Turma.Codigo,
                    TurmaAno = td.Turma.Ano,
                    DisciplinaId = td.DisciplinaId,
                    DisciplinaNome = td.Disciplina.Nome
                })
                .ToListAsync();

            return Ok(itens);
        }
    }
}
