using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using EduConnect.API.Auth;
using EduConnect.API.Data;
using EduConnect.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EduConnect.API.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly EduConnectContext _ctx;
        private readonly JwtSettings _jwt;

        public AuthController(EduConnectContext ctx, IOptions<JwtSettings> jwt)
        {
            _ctx = ctx;
            _jwt = jwt.Value;
        }

        // POST /auth/login
        [HttpPost("login")]
        [AllowAnonymous]
        public IActionResult Login([FromBody] LoginRequest req)
        {
            var user = _ctx.Usuarios.FirstOrDefault(u => u.Email == req.Email);
            if (user == null) return Unauthorized(new { message = "Credenciais inválidas" });

            var ok = BCrypt.Net.BCrypt.Verify(req.Senha, user.SenhaHash);
            if (!ok) return Unauthorized(new { message = "Credenciais inválidas" });

            var token = TokenService.Generate(user.Id.ToString(), user.Nome, user.Role, _jwt);

            return Ok(new LoginResponse
            {
                Id = user.Id,
                Nome = user.Nome,
                Email = user.Email,
                Role = user.Role,
                Token = token
            });
        }


        [Authorize]
        [HttpPut("password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.CurrentPassword) || string.IsNullOrWhiteSpace(req.NewPassword))
                return BadRequest(new { message = "Informe a senha atual e a nova senha." });

            if (req.NewPassword.Length < 8)
                return BadRequest(new { message = "A nova senha precisa ter pelo menos 8 caracteres." });

            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(sub) || !int.TryParse(sub, out var userId))
                return Unauthorized(new { message = "Token inválido (sub)." });

            var usuario = await _ctx.Usuarios.FirstOrDefaultAsync(u => u.Id == userId);
            if (usuario == null) return Unauthorized(new { message = "Usuário não encontrado." });

            var ok = BCrypt.Net.BCrypt.Verify(req.CurrentPassword, usuario.SenhaHash);
            if (!ok) return BadRequest(new { message = "Senha atual incorreta." });

            usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);

            await _ctx.SaveChangesAsync();
            return Ok(new { message = "Senha alterada com sucesso." });
        }


        // GET /auth/me
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(sub) || !int.TryParse(sub, out var userId))
                return Unauthorized(new { message = "Token inválido (sub)." });

            var user = await _ctx.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return Unauthorized(new { message = "Usuário não encontrado." });

            var aluno = await _ctx.Alunos.AsNoTracking().FirstOrDefaultAsync(a => a.UsuarioId == userId);
            var professor = await _ctx.Professores.AsNoTracking().FirstOrDefaultAsync(p => p.UsuarioId == userId);

            return Ok(new AuthMeResponse
            {
                UserId = user.Id,
                Nome = user.Nome,
                Email = user.Email,
                Role = user.Role,
                AlunoId = aluno?.Id,
                RA = aluno?.RA,
                ProfessorId = professor?.Id,
                Registro = professor?.Registro
            });
        }
    }
}
