using EduConnect.API.Data;
using EduConnect.API.DTOs;
using EduConnect.API.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.API.Controllers;

[ApiController]
[Route("admin/pre-matriculas")]
[Authorize(Roles = "Admin")]
public class AdminPreMatriculasController : ControllerBase
{
    private readonly EduConnectContext _ctx;

    public AdminPreMatriculasController(EduConnectContext ctx)
    {
        _ctx = ctx;
    }

    [HttpGet("pendentes")]
    public async Task<ActionResult<IEnumerable<PreMatriculaResponse>>> Pendentes()
    {
        var list = await _ctx.PreMatriculas.AsNoTracking()
            .Where(x => x.Status == "PENDENTE_ADMIN")
            .OrderByDescending(x => x.CriadaEmUtc)
            .Select(x => new PreMatriculaResponse
            {
                Id = x.Id,
                Nome = x.Nome,
                Email = x.Email,
                Telefone = x.Telefone,
                Status = x.Status,
                CriadaEmUtc = x.CriadaEmUtc,
                RgCpfUrl = x.RgCpfUrl,
                EscolaridadeUrl = x.EscolaridadeUrl,
                ComprovantePagamentoUrl = x.ComprovantePagamentoUrl
            })
            .ToListAsync();

        return Ok(list);
    }

    
}