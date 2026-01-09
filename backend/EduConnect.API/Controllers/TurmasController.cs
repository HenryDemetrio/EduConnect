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
    public class TurmasController : ControllerBase
    {
        private readonly EduConnectContext _ctx;

        public TurmasController(EduConnectContext ctx)
        {
            _ctx = ctx;
        }

        private int GetUserIdFromToken()
        {
            // tenta "userId" (se você tiver colocado), depois "sub"/NameIdentifier
            var raw =
                User.FindFirstValue("userId") ??
                User.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
                User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(raw) || !int.TryParse(raw, out var userId))
                throw new UnauthorizedAccessException("Token inválido (não foi possível obter o userId).");

            return userId;
        }

        // POST /turmas  (ADMIN)
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateTurmaRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Nome))
                return BadRequest(new { message = "Nome da turma é obrigatório." });

            if (string.IsNullOrWhiteSpace(req.Codigo))
                return BadRequest(new { message = "Código da turma é obrigatório." });

            if (req.Ano <= 0)
                return BadRequest(new { message = "Ano deve ser maior que zero." });

            // Código único
            var codigoExiste = await _ctx.Turmas.AnyAsync(t => t.Codigo == req.Codigo);
            if (codigoExiste)
                return Conflict(new { message = "Código de turma já cadastrado." });

            var turma = new Turma
            {
                Nome = req.Nome,
                Codigo = req.Codigo,
                Ano = req.Ano
            };

            _ctx.Turmas.Add(turma);
            await _ctx.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = turma.Id },
                new { id = turma.Id }
            );
        }

        // GET /turmas  (ADMIN)
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<TurmaResponse>>> GetAll()
        {
            var dados = await _ctx.Turmas
                .AsNoTracking()
                .Select(t => new TurmaResponse
                {
                    Id = t.Id,
                    Nome = t.Nome,
                    Codigo = t.Codigo,
                    Ano = t.Ano
                })
                .ToListAsync();

            return Ok(dados);
        }

        // GET /turmas/{id}  (ADMIN)
        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<TurmaResponse>> GetById(int id)
        {
            var t = await _ctx.Turmas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (t == null)
                return NotFound(new { message = "Turma não encontrada." });

            var resp = new TurmaResponse
            {
                Id = t.Id,
                Nome = t.Nome,
                Codigo = t.Codigo,
                Ano = t.Ano
            };

            return Ok(resp);
        }

        // PUT /turmas/{id}  (ADMIN)
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateTurmaRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Nome))
                return BadRequest(new { message = "Nome da turma é obrigatório." });

            if (string.IsNullOrWhiteSpace(req.Codigo))
                return BadRequest(new { message = "Código da turma é obrigatório." });

            if (req.Ano <= 0)
                return BadRequest(new { message = "Ano deve ser maior que zero." });

            var turma = await _ctx.Turmas.FirstOrDefaultAsync(t => t.Id == id);
            if (turma == null)
                return NotFound(new { message = "Turma não encontrada." });

            var codigoExiste = await _ctx.Turmas
                .AnyAsync(t => t.Codigo == req.Codigo && t.Id != id);
            if (codigoExiste)
                return Conflict(new { message = "Código de turma já cadastrado." });

            turma.Nome = req.Nome;
            turma.Codigo = req.Codigo;
            turma.Ano = req.Ano;

            await _ctx.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /turmas/{id}  (ADMIN)
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var turma = await _ctx.Turmas
                .Include(t => t.Matriculas)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (turma == null)
                return NotFound(new { message = "Turma não encontrada." });

            if (turma.Matriculas != null && turma.Matriculas.Any())
                return Conflict(new { message = "Não é possível excluir turma com alunos matriculados." });

            _ctx.Turmas.Remove(turma);
            await _ctx.SaveChangesAsync();
            return NoContent();
        }

        // GET /turmas/minhas (PROFESSOR)
        [HttpGet("minhas")]
        [Authorize(Roles = "Professor")]
        public async Task<IActionResult> GetMinhas()
        {
            var userId = GetUserIdFromToken();

            var professor = await _ctx.Professores
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UsuarioId == userId);

            if (professor == null)
                return Ok(new List<TurmaResponse>());

            // pega turmas onde ele tem TurmaDisciplina
            var turmas = await _ctx.TurmaDisciplinas
                .AsNoTracking()
                .Where(td => td.ProfessorId == professor.Id)
                .Select(td => new TurmaResponse
                {
                    Id = td.Turma.Id,
                    Nome = td.Turma.Nome,
                    Codigo = td.Turma.Codigo,
                    Ano = td.Turma.Ano
                })
                .GroupBy(t => t.Id)          // remove duplicados por Id
                .Select(g => g.First())
                .OrderBy(t => t.Nome)
                .ToListAsync();

            return Ok(turmas);
        }
    }
}
