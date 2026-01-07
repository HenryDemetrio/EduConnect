using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using EduConnect.API.Data;

namespace EduConnect.API.Services;

public class AccessProvisioningService
{
    private readonly EduConnectContext _ctx;

    public AccessProvisioningService(EduConnectContext ctx)
    {
        _ctx = ctx;
    }

    public async Task<string> GenerateInstitutionalEmailFromNameAsync(string fullName)
    {
        var (first, last) = PickFirstLastName(fullName);
        var baseLocal = $"{first}.{last}";
        baseLocal = Slugify(baseLocal);

        if (string.IsNullOrWhiteSpace(baseLocal))
            baseLocal = "user";

        var domain = "educonnect.com";
        var candidate = $"{baseLocal}@{domain}";

        // garante unicidade
        var suffix = 2;
        while (await _ctx.Usuarios.AnyAsync(u => u.Email == candidate))
        {
            candidate = $"{baseLocal}.{suffix}@{domain}";
            suffix++;
        }

        return candidate;
    }

    public string GenerateTempPassword(int length = 10)
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#!";
        var rng = new Random();
        var sb = new StringBuilder();
        for (var i = 0; i < length; i++)
            sb.Append(chars[rng.Next(chars.Length)]);
        return sb.ToString();
    }

    private static (string first, string last) PickFirstLastName(string fullName)
    {
        var parts = (fullName ?? "")
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Trim())
            .ToList();

        // remove conectores comuns
        var stop = new HashSet<string>(new[] { "de", "da", "do", "das", "dos", "e" }, StringComparer.OrdinalIgnoreCase);
        parts = parts.Where(p => !stop.Contains(p)).ToList();

        if (parts.Count == 0) return ("user", "educonnect");
        if (parts.Count == 1) return (parts[0], parts[0]);

        return (parts.First(), parts.Last());
    }

    private static string Slugify(string input)
    {
        var normalized = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();

        foreach (var ch in normalized)
        {
            var uc = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (uc == UnicodeCategory.NonSpacingMark) continue;

            var c = char.ToLowerInvariant(ch);

            if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '.')
                sb.Append(c);
            else if (char.IsWhiteSpace(c) || c == '-' || c == '_')
                sb.Append('.');
        }

        // colapsa ".."
        var s = sb.ToString();
        while (s.Contains("..")) s = s.Replace("..", ".");
        return s.Trim('.');
    }
}
