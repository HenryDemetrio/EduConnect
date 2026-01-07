using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using EduConnect.API.Data;
using EduConnect.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.API.Controllers
{
    [ApiController]
    [Route("turmas")]
    public class TurmasAlunosController : ControllerBase
    {
        private readonly EduConnectContext _ctx;

        public TurmasAlunosController(EduConnectContext ctx)
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

        [HttpGet("{turmaId:int}/alunos")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> GetAlunosDaTurma(int turmaId)
        {
            // valida turma
            var turmaExiste = await _ctx.Turmas.AsNoTracking().AnyAsync(t => t.Id == turmaId);
            if (!turmaExiste)
                return NotFound(new { message = "Turma não encontrada." });

            // se for professor, só pode ver turma que ele ministra alguma disciplina
            if (User.IsInRole("Professor"))
            {
                var userId = GetUserIdFromToken();
                var professor = await _ctx.Professores.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UsuarioId == userId);

                if (professor == null)
                    return Forbid();

                var lecionaNaTurma = await _ctx.TurmaDisciplinas.AsNoTracking()
                    .AnyAsync(td => td.TurmaId == turmaId && td.ProfessorId == professor.Id);

                if (!lecionaNaTurma)
                    return Forbid();
            }

            var alunos = await _ctx.Matriculas
                .AsNoTracking()
                .Where(m => m.TurmaId == turmaId)
                .Include(m => m.Aluno)
                    .ThenInclude(a => a.Usuario)
                .OrderBy(m => m.Aluno.Usuario.Nome)
                .Select(m => new TurmaAlunoResponse
                {
                    AlunoId = m.AlunoId,
                    Nome = m.Aluno.Usuario.Nome,
                    Email = m.Aluno.Usuario.Email,
                    RA = m.Aluno.RA,
                    DataMatriculaUtc = m.DataMatricula
                })
                .ToListAsync();

            return Ok(alunos);
        }
    }
}
