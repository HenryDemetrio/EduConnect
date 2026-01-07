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

            // 201 Created padrão REST: Location + corpo enxuto com id
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
            var t = await _ctx.Turmas.FirstOrDefaultAsync(x => x.Id == id);
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

        // PUT /turmas/{id}  (ADMIN) - atualiza dados da turma
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

            // garantir código único, ignorando a própria turma
            var codigoExiste = await _ctx.Turmas
                .AnyAsync(t => t.Codigo == req.Codigo && t.Id != id);
            if (codigoExiste)
                return Conflict(new { message = "Código de turma já cadastrado." });

            turma.Nome = req.Nome;
            turma.Codigo = req.Codigo;
            turma.Ano = req.Ano;

            await _ctx.SaveChangesAsync();

            // padrão comum em REST: 204 NoContent pra update sem corpo
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

            // se quiser, pode impedir excluir turma com matrículas
            if (turma.Matriculas != null && turma.Matriculas.Any())
                return Conflict(new { message = "Não é possível excluir turma com alunos matriculados." });

            _ctx.Turmas.Remove(turma);
            await _ctx.SaveChangesAsync();

            // padrão: 204 NoContent em deleção bem sucedida
            return NoContent();
        }
    }
}
