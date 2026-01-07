using EduConnect.API.Data;
using EduConnect.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.API.Controllers
{
    [ApiController]
    [Route("disciplinas")]
    public class DisciplinasController : ControllerBase
    {
        private readonly EduConnectContext _ctx;

        public DisciplinasController(EduConnectContext ctx)
        {
            _ctx = ctx;
        }

        // GET /disciplinas  (Admin e Professor por enquanto)
        [HttpGet]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<ActionResult<IEnumerable<DisciplinaResponse>>> GetAll()
        {
            var dados = await _ctx.Disciplinas
                .OrderBy(d => d.Nome)
                .Select(d => new DisciplinaResponse
                {
                    Id = d.Id,
                    Nome = d.Nome
                })
                .ToListAsync();

            return Ok(dados);
        }
    }
}
