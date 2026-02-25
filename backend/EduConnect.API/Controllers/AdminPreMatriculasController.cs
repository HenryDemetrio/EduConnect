using EduConnect.API.Data;
using EduConnect.API.DTOs;
using EduConnect.API.Entities;
using EduConnect.API.Services;
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
    private readonly PowerAutomateService _pa;
    private readonly AccessProvisioningService _prov;

    public AdminPreMatriculasController(EduConnectContext ctx, PowerAutomateService pa, AccessProvisioningService prov)
    {
        _ctx = ctx;
        _pa = pa;
        _prov = prov;
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

    // POST /admin/pre-matriculas/{id}/aprovar
    [HttpPost("{id:int}/aprovar")]
    public async Task<IActionResult> Aprovar(int id, [FromBody] AprovarPreMatriculaRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.RA))
            return BadRequest(new { message = "Informe o RA." });

        if (req.TurmaId <= 0)
            return BadRequest(new { message = "Selecione a turma." });

        var pre = await _ctx.PreMatriculas.FirstOrDefaultAsync(x => x.Id == id);
        if (pre == null)
            return NotFound(new { message = "Pré-matrícula não encontrada." });

        if (pre.Status != "PENDENTE_ADMIN")
            return BadRequest(new { message = "Esta pré-matrícula não está pendente de aprovação." });

        // Turma existe?
        var turma = await _ctx.Turmas.FirstOrDefaultAsync(t => t.Id == req.TurmaId);
        if (turma == null)
            return BadRequest(new { message = "Turma inválida." });

        // RA duplicado?
        var raTrim = req.RA.Trim();
        var raExists = await _ctx.Alunos.AnyAsync(a => a.RA == raTrim);
        if (raExists)
            return Conflict(new { message = "RA já cadastrado." });

        // gera email institucional + senha temporária
        var emailInstitucional = await _prov.GenerateInstitutionalEmailFromNameAsync(pre.Nome);
        var senhaTemporaria = _prov.GenerateTempPassword(10);
        var senhaHash = BCrypt.Net.BCrypt.HashPassword(senhaTemporaria);

        // cria Usuario (login pelo institucional)
        var usuario = new Usuario
        {
            Nome = pre.Nome.Trim(),
            Email = emailInstitucional,
            SenhaHash = senhaHash,
            Role = "Aluno"
        };
        _ctx.Usuarios.Add(usuario);
        await _ctx.SaveChangesAsync();

        // cria Aluno
        var aluno = new Aluno
        {
            UsuarioId = usuario.Id,
            RA = raTrim,
            EmailContato = (pre.Email ?? "").Trim().ToLowerInvariant(),
            EmailInstitucional = emailInstitucional
        };
        _ctx.Alunos.Add(aluno);
        await _ctx.SaveChangesAsync();

        // cria Matricula (já com pagamento aprovado, pois ele anexou comprovante na etapa 3)
        var matricula = new Matricula
        {
            AlunoId = aluno.Id,
            TurmaId = turma.Id,
            DataMatricula = DateTime.UtcNow,
            StatusPagamento = "Aprovado",
            PagamentoAprovadoEm = DateTime.UtcNow,
            ComprovanteUrl = pre.ComprovantePagamentoUrl
        };
        _ctx.Matriculas.Add(matricula);

        // fecha pre-matrícula
        pre.Status = "APROVADA";

        await _ctx.SaveChangesAsync();

        // Dispara Power Automate (não bloqueia aprovação se o Flow falhar — retorna warning)
        string? warning = null;
        try
        {
            await _pa.SendProvisioningEmailAsync(new
            {
                tipo = "Aluno",
                nome = pre.Nome.Trim(),
                emailContato = (pre.Email ?? "").Trim(),
                emailInstitucional = emailInstitucional,
                senhaTemporaria = senhaTemporaria
            });
        }
        catch (Exception ex)
        {
            warning = ex.Message;
        }

        return Ok(new
        {
            message = "Pré-matrícula aprovada e aluno criado.",
            alunoId = aluno.Id,
            usuarioEmail = emailInstitucional,
            senhaInicial = senhaTemporaria,
            warning
        });
    }
}