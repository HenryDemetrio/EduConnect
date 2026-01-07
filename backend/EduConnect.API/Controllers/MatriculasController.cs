using System.Globalization;
using System.Text;
using EduConnect.API.Data;
using EduConnect.API.DTOs;
using EduConnect.API.Entities;
using EduConnect.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.API.Controllers
{
    [ApiController]
    [Route("matriculas")]
    public class MatriculasController : ControllerBase
    {
        private readonly EduConnectContext _ctx;
        private readonly PowerAutomateService _powerAutomate;

        public MatriculasController(EduConnectContext ctx, PowerAutomateService powerAutomate)
        {
            _ctx = ctx;
            _powerAutomate = powerAutomate;
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] MatricularAlunoRequest req)
        {
            if (req.AlunoId <= 0 || req.TurmaId <= 0)
                return BadRequest(new { message = "AlunoId e TurmaId são obrigatórios." });

            var aluno = await _ctx.Alunos
                .Include(a => a.Usuario)
                .FirstOrDefaultAsync(a => a.Id == req.AlunoId);

            if (aluno == null)
                return NotFound(new { message = "Aluno não encontrado." });

            var turma = await _ctx.Turmas
                .FirstOrDefaultAsync(t => t.Id == req.TurmaId);

            if (turma == null)
                return NotFound(new { message = "Turma não encontrada." });

            var jaMatriculado = await _ctx.Matriculas
                .AnyAsync(m => m.AlunoId == req.AlunoId && m.TurmaId == req.TurmaId);

            if (jaMatriculado)
                return Conflict(new { message = "Aluno já está matriculado nesta turma." });

            var matricula = new Matricula
            {
                AlunoId = req.AlunoId,
                TurmaId = req.TurmaId,
                DataMatricula = DateTime.UtcNow,
                StatusPagamento = "Pendente",
                PagamentoAprovadoEm = null
            };

            _ctx.Matriculas.Add(matricula);
            await _ctx.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = matricula.Id },
                new { id = matricula.Id }
            );
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<MatriculaResponse>>> GetAll()
        {
            var dados = await _ctx.Matriculas
                .Include(m => m.Aluno)!.ThenInclude(a => a.Usuario)
                .Include(m => m.Turma)
                .Select(m => new MatriculaResponse
                {
                    Id = m.Id,
                    AlunoId = m.AlunoId,
                    AlunoNome = m.Aluno!.Usuario!.Nome,
                    TurmaId = m.TurmaId,
                    TurmaNome = m.Turma!.Nome,
                    TurmaCodigo = m.Turma.Codigo,
                    DataMatricula = m.DataMatricula
                })
                .ToListAsync();

            return Ok(dados);
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<MatriculaResponse>> GetById(int id)
        {
            var m = await _ctx.Matriculas
                .Include(x => x.Aluno)!.ThenInclude(a => a.Usuario)
                .Include(x => x.Turma)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (m == null)
                return NotFound(new { message = "Matrícula não encontrada." });

            var resp = new MatriculaResponse
            {
                Id = m.Id,
                AlunoId = m.AlunoId,
                AlunoNome = m.Aluno!.Usuario!.Nome,
                TurmaId = m.TurmaId,
                TurmaNome = m.Turma!.Nome,
                TurmaCodigo = m.Turma.Codigo,
                DataMatricula = m.DataMatricula
            };

            return Ok(resp);
        }

        [HttpPost("{id:int}/aprovar-pagamento")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AprovarPagamento(int id)
        {
            var m = await _ctx.Matriculas
                .Include(x => x.Aluno)!.ThenInclude(a => a.Usuario)
                .Include(x => x.Turma)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (m == null)
                return NotFound(new { message = "Matrícula não encontrada." });

            m.StatusPagamento = "Aprovado";
            m.PagamentoAprovadoEm = DateTime.UtcNow;

            var aluno = m.Aluno!;
            var usuario = aluno.Usuario!;

            bool acessoGeradoAgora = false;
            bool emailEnviado = false;
            string? warning = null;

            // ✅ agora compila: Aluno tem EmailInstitucional
            if (string.IsNullOrWhiteSpace(aluno.EmailInstitucional))
            {
                var emailInstitucional = await GerarEmailInstitucionalUnicoAsync(usuario.Nome);
                var senhaTemporaria = GerarSenhaTemporaria();

                usuario.Email = emailInstitucional;

                // ✅ no seu projeto é SenhaHash, não PasswordHash
                usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(senhaTemporaria);

                aluno.EmailInstitucional = emailInstitucional;
                acessoGeradoAgora = true;

                await _ctx.SaveChangesAsync();

                try
                {
                    var payload = new
                    {
                        tipo = "Aluno",
                        nome = usuario.Nome,
                        emailContato = aluno.EmailContato,
                        emailInstitucional = emailInstitucional,
                        senhaTemporaria = senhaTemporaria
                    };

                    await _powerAutomate.SendProvisioningEmailAsync(payload);
                    emailEnviado = true;
                }
                catch (Exception ex)
                {
                    emailEnviado = false;
                    warning = $"Acesso criado, mas falhou o envio do e-mail via Power Automate: {ex.Message}";
                }
            }
            else
            {
                await _ctx.SaveChangesAsync();
                emailEnviado = false;
                warning = "Pagamento aprovado. Acesso já existia (email institucional já definido).";
            }

            return Ok(new
            {
                message = "Pagamento aprovado.",
                matriculaId = m.Id,
                statusPagamento = m.StatusPagamento,
                pagamentoAprovadoEm = m.PagamentoAprovadoEm,
                acessoGeradoAgora,
                emailEnviado,
                emailInstitucional = aluno.EmailInstitucional,
                warning
            });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var matricula = await _ctx.Matriculas
                .FirstOrDefaultAsync(m => m.Id == id);

            if (matricula == null)
                return NotFound(new { message = "Matrícula não encontrada." });

            _ctx.Matriculas.Remove(matricula);
            await _ctx.SaveChangesAsync();
            return NoContent();
        }

        private async Task<string> GerarEmailInstitucionalUnicoAsync(string nomeCompleto)
        {
            var baseLocal = SlugEmail(nomeCompleto);
            if (string.IsNullOrWhiteSpace(baseLocal))
                baseLocal = "usuario";

            var domain = "educonnect.com";
            var email = $"{baseLocal}@{domain}";
            var i = 1;

            while (await _ctx.Usuarios.AnyAsync(u => u.Email == email))
            {
                i++;
                email = $"{baseLocal}{i}@{domain}";
            }

            return email;
        }

        private static string SlugEmail(string input)
        {
            var normalized = input.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var c in normalized)
            {
                var uc = CharUnicodeInfo.GetUnicodeCategory(c);
                if (uc != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }

            var s = sb.ToString().Normalize(NormalizationForm.FormC)
                .ToLowerInvariant()
                .Trim();

            var outSb = new StringBuilder();
            bool lastDot = false;

            foreach (var c in s)
            {
                if (char.IsLetterOrDigit(c))
                {
                    outSb.Append(c);
                    lastDot = false;
                }
                else if (char.IsWhiteSpace(c) || c == '.' || c == '-' || c == '_')
                {
                    if (!lastDot)
                    {
                        outSb.Append('.');
                        lastDot = true;
                    }
                }
            }

            var res = outSb.ToString().Trim('.');
            while (res.Contains(".."))
                res = res.Replace("..", ".");

            var parts = res.Split('.', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
                return $"{parts[0]}.{parts[1]}";

            return res;
        }

        private static string GerarSenhaTemporaria()
        {
            var rnd = Random.Shared.Next(100000, 999999);
            return $"Edu@{rnd}";
        }
    }
}
