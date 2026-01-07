using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace EduConnect.API.Services;

public class PowerAutomateOptions
{
    public string ProvisionAccessUrl { get; set; } = "";
}

public class PowerAutomateService
{
    private readonly HttpClient _http;
    private readonly PowerAutomateOptions _opt;

    public PowerAutomateService(HttpClient http, IOptions<PowerAutomateOptions> opt)
    {
        _http = http;
        _opt = opt.Value;

        // opcional: timeout razoável pra não travar request
        _http.Timeout = TimeSpan.FromSeconds(15);
    }

    public async Task SendProvisioningEmailAsync(object payload)
    {
        if (string.IsNullOrWhiteSpace(_opt.ProvisionAccessUrl))
            throw new InvalidOperationException("PowerAutomate ProvisionAccessUrl não configurado.");

        using var resp = await _http.PostAsJsonAsync(_opt.ProvisionAccessUrl, payload);

        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"PowerAutomate falhou ({(int)resp.StatusCode}) {resp.ReasonPhrase}. Body: {body}");
        }
    }
}
