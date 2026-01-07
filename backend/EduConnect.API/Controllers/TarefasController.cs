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
    public class TarefasController : ControllerBase
    {
        private readonly EduConnectContext _ctx;
        private readonly IWebHostEnvironment _env;

        public TarefasController(EduConnectContext ctx, IWebHostEnvironment env)
        {
            _ctx = ctx;
            _env = env;
        }

        private int? GetUsuarioId()
        {
            var raw =
                User.FindFirst("id")?.Value ??
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                User.FindFirst("sub")?.Value;

            return int.TryParse(raw, out var id) ? id : null;
        }

        private async Task<Aluno?> GetAlunoLogado()
        {
            var usuarioId = GetUsuarioId();
            if (usuarioId == null) return null;
            return await _ctx.Alunos.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId.Value);
        }

        private async Task<Professor?> GetProfessorLogado()
        {
            var usuarioId = GetUsuarioId();
            if (usuarioId == null) return null;
            return await _ctx.Professores.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId.Value);
        }

        private async Task<bool> ProfessorDonoTurmaDisciplina(int turmaDisciplinaId)
        {
            var professor = await GetProfessorLogado();
            if (professor == null) return false;

            return await _ctx.TurmaDisciplinas.AnyAsync(td =>
                td.Id == turmaDisciplinaId && td.ProfessorId == professor.Id);
        }

        private async Task<bool> AlunoMatriculadoNaTurmaDaTurmaDisciplina(int alunoId, int turmaDisciplinaId)
        {
            var td = await _ctx.TurmaDisciplinas.FirstOrDefaultAsync(x => x.Id == turmaDisciplinaId);
            if (td == null) return false;

            return await _ctx.Matriculas.AnyAsync(m => m.AlunoId == alunoId && m.TurmaId == td.TurmaId);
        }

        // =========================
        //  LISTAR TAREFAS POR TD
        //  GET /turma-disciplinas/{turmaDisciplinaId}/tarefas
        // =========================
        [HttpGet("turma-disciplinas/{turmaDisciplinaId:int}/tarefas")]
        [Authorize(Roles = "Admin,Professor,Aluno")]
        public async Task<ActionResult<IEnumerable<TarefaResponse>>> ListarPorTurmaDisciplina(int turmaDisciplinaId)
        {
            if (User.IsInRole("Professor"))
            {
                if (!await ProfessorDonoTurmaDisciplina(turmaDisciplinaId)) return Forbid();
            }
            else if (User.IsInRole("Aluno"))
            {
                var aluno = await GetAlunoLogado();
                if (aluno == null) return Forbid();

                var ok = await AlunoMatriculadoNaTurmaDaTurmaDisciplina(aluno.Id, turmaDisciplinaId);
                if (!ok) return Forbid();
            }

            var lista = await _ctx.Tarefas
                .Include(t => t.TurmaDisciplina)!.ThenInclude(td => td.Turma)
                .Include(t => t.TurmaDisciplina)!.ThenInclude(td => td.Disciplina)
                .Where(t => t.TurmaDisciplinaId == turmaDisciplinaId)
                .OrderBy(t => t.DataEntrega)
                .Select(t => new TarefaResponse
                {
                    Id = t.Id,
                    TurmaDisciplinaId = t.TurmaDisciplinaId,
                    Tipo = t.Tipo,
                    Titulo = t.Titulo,
                    Descricao = t.Descricao,
                    DataEntrega = t.DataEntrega,
                    Peso = t.Peso,
                    NotaMaxima = t.NotaMaxima,
                    CriadaEm = t.CriadaEm,
                    Ativa = t.Ativa,
                    TurmaId = t.TurmaDisciplina!.TurmaId,
                    TurmaCodigo = t.TurmaDisciplina!.Turma!.Codigo,
                    DisciplinaNome = t.TurmaDisciplina!.Disciplina!.Nome
                })
                .ToListAsync();

            return Ok(lista);
        }

        // =========================
        //  CRIAR TAREFA
        //  POST /tarefas
        // =========================
        [HttpPost("tarefas")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> Criar([FromBody] CreateTarefaRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Titulo))
                return BadRequest(new { message = "Título é obrigatório." });

            if (req.Titulo.Length > 120)
                return BadRequest(new { message = "Título muito longo (máx 120)." });

            if (req.Peso <= 0) req.Peso = 1m;
            if (req.NotaMaxima <= 0) req.NotaMaxima = 10m;

            var td = await _ctx.TurmaDisciplinas.FirstOrDefaultAsync(x => x.Id == req.TurmaDisciplinaId);
            if (td == null) return NotFound(new { message = "TurmaDisciplina não encontrada." });

            if (User.IsInRole("Professor"))
            {
                if (!await ProfessorDonoTurmaDisciplina(req.TurmaDisciplinaId)) return Forbid();
            }

            var tipo = (req.Tipo ?? "Tarefa").Trim();
            if (tipo != "Tarefa" && tipo != "Avaliacao")
                return BadRequest(new { message = "Tipo inválido (use 'Tarefa' ou 'Avaliacao')." });

            var tarefa = new Tarefa
            {
                TurmaDisciplinaId = req.TurmaDisciplinaId,
                Tipo = tipo,
                Titulo = req.Titulo.Trim(),
                Descricao = req.Descricao?.Trim(),
                DataEntrega = req.DataEntrega,
                Peso = req.Peso,
                NotaMaxima = req.NotaMaxima,
                CriadaEm = DateTime.UtcNow,
                Ativa = true
            };

            _ctx.Tarefas.Add(tarefa);
            await _ctx.SaveChangesAsync();

            return Created($"/tarefas/{tarefa.Id}", new { id = tarefa.Id });
        }

        // =========================
        //  DETALHE TAREFA
        //  GET /tarefas/{id}
        // =========================
        [HttpGet("tarefas/{id:int}")]
        [Authorize(Roles = "Admin,Professor,Aluno")]
        public async Task<ActionResult<TarefaResponse>> GetById(int id)
        {
            var t = await _ctx.Tarefas
                .Include(x => x.TurmaDisciplina)!.ThenInclude(td => td.Turma)
                .Include(x => x.TurmaDisciplina)!.ThenInclude(td => td.Disciplina)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (t == null) return NotFound(new { message = "Tarefa não encontrada." });

            if (User.IsInRole("Professor"))
            {
                if (!await ProfessorDonoTurmaDisciplina(t.TurmaDisciplinaId)) return Forbid();
            }
            else if (User.IsInRole("Aluno"))
            {
                var aluno = await GetAlunoLogado();
                if (aluno == null) return Forbid();

                var ok = await AlunoMatriculadoNaTurmaDaTurmaDisciplina(aluno.Id, t.TurmaDisciplinaId);
                if (!ok) return Forbid();
            }

            return Ok(new TarefaResponse
            {
                Id = t.Id,
                TurmaDisciplinaId = t.TurmaDisciplinaId,
                Tipo = t.Tipo,
                Titulo = t.Titulo,
                Descricao = t.Descricao,
                DataEntrega = t.DataEntrega,
                Peso = t.Peso,
                NotaMaxima = t.NotaMaxima,
                CriadaEm = t.CriadaEm,
                Ativa = t.Ativa,
                TurmaId = t.TurmaDisciplina!.TurmaId,
                TurmaCodigo = t.TurmaDisciplina!.Turma!.Codigo,
                DisciplinaNome = t.TurmaDisciplina!.Disciplina!.Nome
            });
        }

        // =========================
        //  EDITAR TAREFA
        //  PUT /tarefas/{id}
        // =========================
        [HttpPut("tarefas/{id:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTarefaRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Titulo))
                return BadRequest(new { message = "Título é obrigatório." });

            var t = await _ctx.Tarefas.FirstOrDefaultAsync(x => x.Id == id);
            if (t == null) return NotFound(new { message = "Tarefa não encontrada." });

            if (User.IsInRole("Professor"))
            {
                if (!await ProfessorDonoTurmaDisciplina(t.TurmaDisciplinaId)) return Forbid();
            }

            var tipo = (req.Tipo ?? "Tarefa").Trim();
            if (tipo != "Tarefa" && tipo != "Avaliacao")
                return BadRequest(new { message = "Tipo inválido (use 'Tarefa' ou 'Avaliacao')." });

            if (req.Peso <= 0) req.Peso = 1m;
            if (req.NotaMaxima <= 0) req.NotaMaxima = 10m;

            t.Tipo = tipo;
            t.Titulo = req.Titulo.Trim();
            t.Descricao = req.Descricao?.Trim();
            t.DataEntrega = req.DataEntrega;
            t.Peso = req.Peso;
            t.NotaMaxima = req.NotaMaxima;
            t.Ativa = req.Ativa;

            await _ctx.SaveChangesAsync();
            return NoContent();
        }

        // =========================
        //  EXCLUIR TAREFA
        //  DELETE /tarefas/{id}
        // =========================
        [HttpDelete("tarefas/{id:int}")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> Delete(int id)
        {
            var t = await _ctx.Tarefas.FirstOrDefaultAsync(x => x.Id == id);
            if (t == null) return NotFound(new { message = "Tarefa não encontrada." });

            if (User.IsInRole("Professor"))
            {
                if (!await ProfessorDonoTurmaDisciplina(t.TurmaDisciplinaId)) return Forbid();
            }

            _ctx.Tarefas.Remove(t);
            await _ctx.SaveChangesAsync();
            return NoContent();
        }

        // =========================
        //  ALUNO: ENVIAR ENTREGA (PDF)
        //  POST /tarefas/{tarefaId}/entrega
        // =========================
        [HttpPost("tarefas/{tarefaId:int}/entrega")]
        [Authorize(Roles = "Aluno")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(10_000_000)] // 10MB
        public async Task<IActionResult> EnviarEntrega(int tarefaId, [FromForm] EnviarEntregaRequest req)
        {
            var file = req.Arquivo;
            var comentario = req.Comentario;

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Arquivo é obrigatório." });

            if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Somente PDF é permitido." });

            var aluno = await GetAlunoLogado();
            if (aluno == null) return Forbid();

            var tarefa = await _ctx.Tarefas
                .Include(t => t.TurmaDisciplina)
                .FirstOrDefaultAsync(t => t.Id == tarefaId);

            if (tarefa == null) return NotFound(new { message = "Tarefa não encontrada." });

            var matriculado = await AlunoMatriculadoNaTurmaDaTurmaDisciplina(aluno.Id, tarefa.TurmaDisciplinaId);
            if (!matriculado) return Forbid();

            var webRoot = _env.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRoot))
            {
                webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
                Directory.CreateDirectory(webRoot);
            }

            var uploadsRoot = Path.Combine(webRoot, "uploads", "tarefas", tarefaId.ToString(), aluno.Id.ToString());
            Directory.CreateDirectory(uploadsRoot);

            var safeName = $"{Guid.NewGuid():N}.pdf";
            var fullPath = Path.Combine(uploadsRoot, safeName);

            using (var stream = System.IO.File.Create(fullPath))
                await file.CopyToAsync(stream);

            var relativePath = $"/uploads/tarefas/{tarefaId}/{aluno.Id}/{safeName}";

            var entrega = await _ctx.EntregasTarefas
                .FirstOrDefaultAsync(e => e.TarefaId == tarefaId && e.AlunoId == aluno.Id);

            if (entrega == null)
            {
                entrega = new EntregaTarefa
                {
                    TarefaId = tarefaId,
                    AlunoId = aluno.Id,
                    ArquivoNome = file.FileName,
                    ArquivoPath = relativePath,
                    ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/pdf" : file.ContentType,
                    SizeBytes = file.Length,
                    ComentarioAluno = comentario?.Trim(),
                    EnviadoEm = DateTime.UtcNow
                };
                _ctx.EntregasTarefas.Add(entrega);
            }
            else
            {
                entrega.ArquivoNome = file.FileName;
                entrega.ArquivoPath = relativePath;
                entrega.ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/pdf" : file.ContentType;
                entrega.SizeBytes = file.Length;
                entrega.ComentarioAluno = comentario?.Trim();
                entrega.EnviadoEm = DateTime.UtcNow;

                entrega.Nota = null;
                entrega.FeedbackProfessor = null;
                entrega.AvaliadoEm = null;
            }

            await _ctx.SaveChangesAsync();
            return Ok(new { message = "Entrega enviada.", url = relativePath });
        }

        // =========================
        //  PROF/ADMIN: AVALIAR ENTREGA
        //  PUT /entregas/{entregaId}/avaliar
        // =========================
        [HttpPut("entregas/{entregaId:int}/avaliar")]
        [Authorize(Roles = "Admin,Professor")]
        public async Task<IActionResult> AvaliarEntrega(int entregaId, [FromBody] AvaliarEntregaRequest req)
        {
            if (req.Nota < 0) return BadRequest(new { message = "Nota inválida." });

            var entrega = await _ctx.EntregasTarefas
                .Include(e => e.Tarefa)
                .FirstOrDefaultAsync(e => e.Id == entregaId);

            if (entrega == null) return NotFound(new { message = "Entrega não encontrada." });

            var tarefa = entrega.Tarefa!;
            if (User.IsInRole("Professor"))
            {
                if (!await ProfessorDonoTurmaDisciplina(tarefa.TurmaDisciplinaId)) return Forbid();
            }

            var max = tarefa.NotaMaxima <= 0 ? 10m : tarefa.NotaMaxima;
            var nota = req.Nota > max ? max : req.Nota;

            entrega.Nota = Math.Round(nota, 2);
            entrega.FeedbackProfessor = req.FeedbackProfessor?.Trim();
            entrega.AvaliadoEm = DateTime.UtcNow;

            await _ctx.SaveChangesAsync();

            var (updated, warning) = await SyncNotaFinalFromAtividades(entrega.AlunoId, tarefa.TurmaDisciplinaId);

            return Ok(new
            {
                message = "Entrega avaliada.",
                notaRegistrada = entrega.Nota,
                notaFinalAtualizada = updated,
                warning
            });
        }

        private async Task<(bool updated, string? warning)> SyncNotaFinalFromAtividades(int alunoId, int turmaDisciplinaId)
        {
            var entregas = await _ctx.EntregasTarefas
                .Include(e => e.Tarefa)
                .Where(e =>
                    e.AlunoId == alunoId &&
                    e.Tarefa!.TurmaDisciplinaId == turmaDisciplinaId &&
                    e.Nota != null &&
                    e.Tarefa.Ativa)
                .ToListAsync();

            if (entregas.Count == 0)
                return (false, "Nenhuma atividade corrigida para sincronizar.");

            var somaPesos = entregas.Sum(e => e.Tarefa!.Peso);
            if (somaPesos <= 0) somaPesos = 1;

            decimal total = 0m;
            foreach (var e in entregas)
            {
                var t = e.Tarefa!;
                var max = t.NotaMaxima <= 0 ? 10m : t.NotaMaxima;

                var notaNorm = (e.Nota!.Value / max) * 10m;
                total += notaNorm * t.Peso;
            }

            var notaFinal = Math.Round(total / somaPesos, 2);
            if (notaFinal < 0) notaFinal = 0;
            if (notaFinal > 10) notaFinal = 10;

            var avaliacao = await _ctx.Avaliacoes
                .FirstOrDefaultAsync(a => a.AlunoId == alunoId && a.TurmaDisciplinaId == turmaDisciplinaId);

            if (avaliacao == null)
                return (false, "Avaliacao (nota final/frequência) ainda não existe para este aluno. Crie pelo PainelProfessor para o boletim refletir.");

            avaliacao.Nota = notaFinal;
            await _ctx.SaveChangesAsync();

            return (true, null);
        }
    }
}
