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
    [Route("notificacoes")]
    public class NotificacoesController : ControllerBase
    {
        private readonly EduConnectContext _ctx;
        public NotificacoesController(EduConnectContext ctx) => _ctx = ctx;

        private int GetUserId()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(sub) || !int.TryParse(sub, out var userId))
                throw new UnauthorizedAccessException("Token inválido (sub).");

            return userId;
        }

        // POST /notificacoes (Admin) -> cria global ou para um usuário
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateNotificacaoRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Titulo) || string.IsNullOrWhiteSpace(req.Mensagem))
                return BadRequest(new { message = "Título e mensagem são obrigatórios." });

            if (req.UsuarioId.HasValue)
            {
                var userExiste = await _ctx.Usuarios.AnyAsync(u => u.Id == req.UsuarioId.Value);
                if (!userExiste) return BadRequest(new { message = "UsuarioId inválido." });
            }

            var n = new Notificacao
            {
                Titulo = req.Titulo.Trim(),
                Mensagem = req.Mensagem.Trim(),
                UsuarioId = req.UsuarioId,
                Lida = false,
                LidaEmUtc = null
            };

            _ctx.Notificacoes.Add(n);
            await _ctx.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = n.Id }, new { id = n.Id });
        }

        // GET /notificacoes/{id}
        [HttpGet("{id:int}")]
        [Authorize]
        public async Task<IActionResult> GetById(int id)
        {
            var userId = GetUserId();

            var n = await _ctx.Notificacoes.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (n == null) return NotFound();

            // só permite ver se é global ou do próprio usuário (admin pode tudo)
            if (!User.IsInRole("Admin") && n.UsuarioId.HasValue && n.UsuarioId.Value != userId)
                return Forbid();

            return Ok(n);
        }

        // GET /notificacoes/me  -> lista globais + do usuário
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> ListMe()
        {
            var userId = GetUserId();

            var list = await _ctx.Notificacoes.AsNoTracking()
                .Where(n => n.UsuarioId == null || n.UsuarioId == userId)
                .OrderByDescending(n => n.CriadoEmUtc)
                .ToListAsync();

            return Ok(list);
        }

        // PUT /notificacoes/{id}/ler
        [HttpPut("{id:int}/ler")]
        [Authorize]
        public async Task<IActionResult> MarcarComoLida(int id)
        {
            var userId = GetUserId();

            var n = await _ctx.Notificacoes.FirstOrDefaultAsync(x => x.Id == id);
            if (n == null) return NotFound();

            if (!User.IsInRole("Admin") && n.UsuarioId.HasValue && n.UsuarioId.Value != userId)
                return Forbid();

            n.Lida = true;
            n.LidaEmUtc = DateTime.UtcNow;

            await _ctx.SaveChangesAsync();
            return NoContent();
        }
    }
}
