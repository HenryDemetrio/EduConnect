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

        // POST /avaliacoes  (ADMIN / PROFESSOR) -> registrar nota + frequência
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

            // ✅ Permissão do professor
            if (!(await ProfessorPodeTurmaDisciplinaAsync(req.TurmaDisciplinaId)))
                return Forbid();

            // ✅ (Recomendado) aluno precisa estar matriculado na turma dessa disciplina
            var matriculado = await _ctx.Matriculas
                .AsNoTracking()
                .AnyAsync(m => m.AlunoId == req.AlunoId && m.TurmaId == turmaDisciplina.TurmaId);

            if (!matriculado)
                return Conflict(new { message = "Aluno não está matriculado na turma desta disciplina." });

            // um aluno só pode ter uma avaliação por TurmaDisciplina
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

            // ✅ Permissão do professor
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

            // ✅ Permissão do professor
            if (!(await ProfessorPodeTurmaDisciplinaAsync(avaliacao.TurmaDisciplinaId)))
                return Forbid();

            _ctx.Avaliacoes.Remove(avaliacao);
            await _ctx.SaveChangesAsync();

            return NoContent();
        }
    }
}
