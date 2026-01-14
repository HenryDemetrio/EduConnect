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

        private static string NormalizeTipo(string? raw)
        {
            var tipo = (raw ?? "Tarefa").Trim();
            return tipo;
        }

        private static bool TipoValido(string tipo) => tipo == "Tarefa" || tipo == "Avaliacao";

        private static bool NumeroValido(string tipo, int numero)
        {
            if (!TipoValido(tipo)) return false;
            // aqui ambos são 1..3 (P1/P2/P3 e T1/T2/T3)
            return numero is >= 1 and <= 3;
        }

        private (string webRoot, string uploadsRoot) EnsureUploadsRoot(params string[] parts)
        {
            var webRoot = _env.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRoot))
            {
                webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
                Directory.CreateDirectory(webRoot);
            }

            var uploadsRoot = Path.Combine(new[] { webRoot, "uploads" }.Concat(parts).ToArray());
            Directory.CreateDirectory(uploadsRoot);

            return (webRoot, uploadsRoot);
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

            var query = _ctx.Tarefas
                .Include(t => t.TurmaDisciplina)!.ThenInclude(td => td.Turma)
                .Include(t => t.TurmaDisciplina)!.ThenInclude(td => td.Disciplina)
                .Where(t => t.TurmaDisciplinaId == turmaDisciplinaId);

            // ✅ aluno só vê o que está publicado (ativa + com enunciado)
            if (User.IsInRole("Aluno"))
            {
                query = query.Where(t => t.Ativa && t.EnunciadoArquivoPath != null);
            }

            var lista = await query
                .OrderBy(t => t.Tipo) // Avaliacao/Tarefa
                .ThenBy(t => t.Numero)
                .ThenBy(t => t.DataEntrega)
                .Select(t => new TarefaResponse
                {
                    Id = t.Id,
                    TurmaDisciplinaId = t.TurmaDisciplinaId,
                    Tipo = t.Tipo,
                    Numero = t.Numero, // ✅ novo DTO
                    Titulo = t.Titulo,
                    Descricao = t.Descricao,
                    DataEntrega = t.DataEntrega,
                    Peso = t.Peso,
                    NotaMaxima = t.NotaMaxima,
                    CriadaEm = t.CriadaEm,
                    Ativa = t.Ativa,

                    // ✅ novo DTO
                    EnunciadoUrl = t.EnunciadoArquivoPath,

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
        //  (cria como Ativa=false; publica ao subir enunciado)
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

            var tipo = NormalizeTipo(req.Tipo);
            if (!TipoValido(tipo))
                return BadRequest(new { message = "Tipo inválido (use 'Tarefa' ou 'Avaliacao')." });

            // ✅ Numero obrigatório pra regra P1/P2/P3 e T1/T2/T3
            if (!NumeroValido(tipo, req.Numero))
                return BadRequest(new { message = "Número é obrigatório e deve ser 1, 2 ou 3." });

            // ✅ impede duplicado TD+Tipo+Numero
            var jaExiste = await _ctx.Tarefas.AnyAsync(t =>
                t.TurmaDisciplinaId == req.TurmaDisciplinaId &&
                t.Tipo == tipo &&
                t.Numero == req.Numero);

            if (jaExiste)
                return BadRequest(new { message = $"Já existe {tipo} {req.Numero} cadastrada para esta matéria." });

            var tarefa = new Tarefa
            {
                TurmaDisciplinaId = req.TurmaDisciplinaId,
                Tipo = tipo,
                Numero = req.Numero,
                Titulo = req.Titulo.Trim(),
                Descricao = req.Descricao?.Trim(),
                DataEntrega = req.DataEntrega,
                Peso = req.Peso,
                NotaMaxima = req.NotaMaxima,
                CriadaEm = DateTime.UtcNow,

                // ✅ só publica quando anexar enunciado
                Ativa = false
            };

            _ctx.Tarefas.Add(tarefa);
            await _ctx.SaveChangesAsync();

            return Created($"/tarefas/{tarefa.Id}", new { id = tarefa.Id, publicada = tarefa.Ativa });
        }

        // =========================
        //  UPLOAD ENUNCIADO (PDF) - PROF/ADMIN
        //  POST /tarefas/{id}/enunciado
        // =========================
        [HttpPost("tarefas/{id:int}/enunciado")]
        [Authorize(Roles = "Admin,Professor")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(10_000_000)] // 10MB
        public async Task<IActionResult> UploadEnunciado(int id, [FromForm] UploadEnunciadoRequest req)
        {
            var arquivo = req.Arquivo;
            if (arquivo == null || arquivo.Length == 0)
                return BadRequest(new { message = "Arquivo (PDF) é obrigatório." });

            if (!arquivo.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Somente PDF é permitido." });

            var t = await _ctx.Tarefas.FirstOrDefaultAsync(x => x.Id == id);
            if (t == null) return NotFound(new { message = "Tarefa não encontrada." });

            if (User.IsInRole("Professor"))
            {
                if (!await ProfessorDonoTurmaDisciplina(t.TurmaDisciplinaId)) return Forbid();
            }

            var (_, uploadsRoot) = EnsureUploadsRoot("tarefas", "enunciados", id.ToString());

            var safeName = $"{Guid.NewGuid():N}.pdf";
            var fullPath = Path.Combine(uploadsRoot, safeName);

            using (var stream = System.IO.File.Create(fullPath))
                await arquivo.CopyToAsync(stream);

            var relativePath = $"/uploads/tarefas/enunciados/{id}/{safeName}";

            t.EnunciadoArquivoNome = arquivo.FileName;
            t.EnunciadoArquivoPath = relativePath;
            t.EnunciadoContentType = string.IsNullOrWhiteSpace(arquivo.ContentType) ? "application/pdf" : arquivo.ContentType;
            t.EnunciadoSizeBytes = arquivo.Length;

            // ✅ publicar
            t.Ativa = true;

            await _ctx.SaveChangesAsync();

            return Ok(new { message = "Enunciado publicado.", enunciadoUrl = relativePath, ativa = t.Ativa });
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

                // ✅ aluno só acessa se publicado
                if (!t.Ativa || t.EnunciadoArquivoPath == null)
                    return NotFound(new { message = "Atividade ainda não foi publicada." });
            }

            return Ok(new TarefaResponse
            {
                Id = t.Id,
                TurmaDisciplinaId = t.TurmaDisciplinaId,
                Tipo = t.Tipo,
                Numero = t.Numero,
                Titulo = t.Titulo,
                Descricao = t.Descricao,
                DataEntrega = t.DataEntrega,
                Peso = t.Peso,
                NotaMaxima = t.NotaMaxima,
                CriadaEm = t.CriadaEm,
                Ativa = t.Ativa,
                EnunciadoUrl = t.EnunciadoArquivoPath,
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

            var tipo = NormalizeTipo(req.Tipo);
            if (!TipoValido(tipo))
                return BadRequest(new { message = "Tipo inválido (use 'Tarefa' ou 'Avaliacao')." });

            if (!NumeroValido(tipo, req.Numero))
                return BadRequest(new { message = "Número é obrigatório e deve ser 1, 2 ou 3." });

            // ✅ impede conflito TD+Tipo+Numero com outra tarefa
            var conflita = await _ctx.Tarefas.AnyAsync(x =>
                x.Id != id &&
                x.TurmaDisciplinaId == t.TurmaDisciplinaId &&
                x.Tipo == tipo &&
                x.Numero == req.Numero);

            if (conflita)
                return BadRequest(new { message = $"Já existe {tipo} {req.Numero} cadastrada para esta matéria." });

            if (req.Peso <= 0) req.Peso = 1m;
            if (req.NotaMaxima <= 0) req.NotaMaxima = 10m;

            // ✅ se tentar ativar sem enunciado, bloqueia
            if (req.Ativa && string.IsNullOrWhiteSpace(t.EnunciadoArquivoPath))
                return BadRequest(new { message = "Para publicar, anexe o enunciado (PDF) primeiro." });

            t.Tipo = tipo;
            t.Numero = req.Numero;
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

            // ✅ só pode entregar se publicado
            if (!tarefa.Ativa || string.IsNullOrWhiteSpace(tarefa.EnunciadoArquivoPath))
                return BadRequest(new { message = "Atividade ainda não foi publicada pelo professor." });

            var matriculado = await AlunoMatriculadoNaTurmaDaTurmaDisciplina(aluno.Id, tarefa.TurmaDisciplinaId);
            if (!matriculado) return Forbid();

            var (_, uploadsRoot) = EnsureUploadsRoot("tarefas", tarefaId.ToString(), aluno.Id.ToString());

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

        // ✅ agora sincroniza só se tiver P1,P2,T1,T2,T3 (usa 70/30 e P3 se existir)
        private async Task<(bool updated, string? warning)> SyncNotaFinalFromAtividades(int alunoId, int turmaDisciplinaId)
        {
            var entregas = await _ctx.EntregasTarefas
                .Include(e => e.Tarefa)
                .Where(e =>
                    e.AlunoId == alunoId &&
                    e.Tarefa!.TurmaDisciplinaId == turmaDisciplinaId &&
                    e.Nota != null &&
                    e.Tarefa.Ativa &&
                    e.Tarefa.Numero > 0)
                .ToListAsync();

            if (entregas.Count == 0)
                return (false, "Nenhuma atividade corrigida para sincronizar.");

            decimal? GetNota(string tipo, int numero)
            {
                return entregas
                    .Where(e => e.Tarefa!.Tipo == tipo && e.Tarefa.Numero == numero)
                    .Select(e => e.Nota)
                    .FirstOrDefault();
            }

            var p1 = GetNota("Avaliacao", 1);
            var p2 = GetNota("Avaliacao", 2);
            var t1 = GetNota("Tarefa", 1);
            var t2 = GetNota("Tarefa", 2);
            var t3 = GetNota("Tarefa", 3);
            var p3 = GetNota("Avaliacao", 3); // recuperação (opcional)

            // só calcula final quando base completa
            if (p1 == null || p2 == null || t1 == null || t2 == null || t3 == null)
                return (false, "Base incompleta (precisa P1, P2, T1, T2, T3 corrigidos).");

            var mediaProvas = (p1.Value + p2.Value) / 2m;
            var mediaTarefas = (t1.Value + t2.Value + t3.Value) / 3m;

            var mediaFinal = (0.7m * mediaProvas) + (0.3m * mediaTarefas);
            mediaFinal = Math.Round(mediaFinal, 2);

            decimal notaParaGravar = mediaFinal;

            // se tiver recuperação, melhora a nota final gravada (pro dashboard/boletim)
            if (p3 != null)
            {
                var mediaPosRec = Math.Max(mediaFinal, (mediaFinal + p3.Value) / 2m);
                notaParaGravar = Math.Round(mediaPosRec, 2);
            }

            if (notaParaGravar < 0) notaParaGravar = 0;
            if (notaParaGravar > 10) notaParaGravar = 10;

            var avaliacao = await _ctx.Avaliacoes
                .FirstOrDefaultAsync(a => a.AlunoId == alunoId && a.TurmaDisciplinaId == turmaDisciplinaId);

            if (avaliacao == null)
                return (false, "Avaliacao (nota final/frequência) ainda não existe para este aluno. Crie no fluxo do professor para o boletim refletir.");

            avaliacao.Nota = notaParaGravar;
            await _ctx.SaveChangesAsync();

            return (true, null);
        }
    }
}
