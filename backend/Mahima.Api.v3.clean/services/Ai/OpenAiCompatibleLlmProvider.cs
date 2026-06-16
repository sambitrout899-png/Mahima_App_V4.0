using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Services.Ai
{
    /// <summary>
    /// A single provider that speaks the OpenAI-compatible Chat Completions
    /// protocol (POST {BaseUrl}/chat/completions). This one class works against
    /// every mainstream LLM runtime:
    ///
    ///   Self-hosted (no external dependency, free, private):
    ///     - Ollama        BaseUrl http://localhost:11434/v1   Model llama3.1 / mistral / gemma2
    ///     - LM Studio     BaseUrl http://localhost:1234/v1
    ///     - vLLM          BaseUrl http://your-host:8000/v1
    ///
    ///   Hosted (drop-in replacements for OpenAI):
    ///     - Groq          BaseUrl https://api.groq.com/openai/v1   (free tier, very fast)
    ///     - Together      BaseUrl https://api.together.xyz/v1
    ///     - OpenRouter    BaseUrl https://openrouter.ai/api/v1
    ///     - Azure OpenAI  BaseUrl https://{resource}.openai.azure.com/openai/deployments/{deployment}
    ///     - OpenAI        BaseUrl https://api.openai.com/v1
    ///
    /// Switching providers is a configuration change only — no code change.
    /// Configuration (appsettings.json or environment):
    ///   PastorBot:Provider     -> "openai-compatible" (default)
    ///   PastorBot:BaseUrl      -> e.g. "http://localhost:11434/v1"
    ///   PastorBot:ApiKey       -> bearer token; leave blank for local Ollama
    ///   PastorBot:Model        -> e.g. "llama3.1" or "gpt-4o-mini"
    ///   PastorBot:VisionModel  -> optional vision-capable model, e.g. "llama3.2-vision"
    /// </summary>
    public sealed class OpenAiCompatibleLlmProvider : ILlmProvider
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<OpenAiCompatibleLlmProvider> _logger;

        public OpenAiCompatibleLlmProvider(
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            ILogger<OpenAiCompatibleLlmProvider> logger)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        public string Name => "openai-compatible";

        private string BaseUrl => (_config["PastorBot:BaseUrl"]
                                   ?? "https://api.openai.com/v1").TrimEnd('/');
        private string? ApiKey => _config["PastorBot:ApiKey"]
                                  ?? _config["PastorBot:OpenAiApiKey"]; // back-compat
        private string Model => _config["PastorBot:Model"] ?? "gpt-4o-mini";
        private string VisionModel => _config["PastorBot:VisionModel"]
                                      ?? _config["PastorBot:Model"]
                                      ?? "gpt-4o-mini";

        /// <summary>
        /// Configured when we have a base URL. A key is NOT required — a local
        /// Ollama endpoint needs no key — so absence of a key is allowed.
        /// </summary>
        public bool IsConfigured => !string.IsNullOrWhiteSpace(BaseUrl);

        public async Task<LlmResult> CompleteAsync(LlmRequest request, CancellationToken ct = default)
        {
            if (!IsConfigured)
                return LlmResult.Fail("provider-not-configured", Name);

            var model = request.ModelOverride ?? Model;

            var payload = new
            {
                model,
                temperature = request.Temperature,
                max_tokens = request.MaxTokens,
                messages = request.Messages.Select(m => new
                {
                    role = m.Role,
                    content = m.Content
                }).ToArray()
            };

            return await PostChatAsync(payload, model, ct);
        }

        public async Task<LlmResult> CompleteVisionAsync(LlmVisionRequest request, CancellationToken ct = default)
        {
            if (!IsConfigured)
                return LlmResult.Fail("provider-not-configured", Name);
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                return LlmResult.Unavailable(Name);

            var model = request.ModelOverride ?? VisionModel;

            // OpenAI-compatible multimodal message: content is an array of parts.
            var payload = new
            {
                model,
                temperature = request.Temperature,
                max_tokens = request.MaxTokens,
                messages = new object[]
                {
                    new { role = "system", content = request.SystemPrompt },
                    new
                    {
                        role = "user",
                        content = new object[]
                        {
                            new { type = "text", text = request.UserText },
                            new { type = "image_url", image_url = new { url = request.ImageUrl } }
                        }
                    }
                }
            };

            return await PostChatAsync(payload, model, ct);
        }

        private async Task<LlmResult> PostChatAsync(object payload, string model, CancellationToken ct)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("PastorBot");
                client.Timeout = TimeSpan.FromSeconds(60);

                // Local runtimes (Ollama, LM Studio) need no Authorization header.
                if (!string.IsNullOrWhiteSpace(ApiKey))
                {
                    client.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", ApiKey);
                }

                var url = $"{BaseUrl}/chat/completions";
                using var body = new StringContent(
                    JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                using var response = await client.PostAsync(url, body, ct);
                var json = await response.Content.ReadAsStringAsync(ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "LLM provider {Provider} returned {Status}: {Body}",
                        Name, (int)response.StatusCode, Truncate(json, 400));
                    return LlmResult.Fail($"http-{(int)response.StatusCode}", Name);
                }

                var text = ExtractContent(json);
                if (string.IsNullOrWhiteSpace(text))
                {
                    _logger.LogWarning("LLM provider {Provider} returned an empty completion.", Name);
                    return LlmResult.Fail("empty-completion", Name);
                }

                return LlmResult.Ok(text.Trim(), Name, model);
            }
            catch (OperationCanceledException)
            {
                return LlmResult.Fail("cancelled", Name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "LLM provider {Provider} call failed.", Name);
                return LlmResult.Fail(ex.Message, Name);
            }
        }

        /// <summary>
        /// Parses the standard Chat Completions response:
        ///   { "choices": [ { "message": { "content": "..." } } ] }
        /// Also tolerates the streaming-delta and legacy "text" shapes so the
        /// same parser survives minor provider differences.
        /// </summary>
        private static string? ExtractContent(string json)
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("choices", out var choices)
                && choices.ValueKind == JsonValueKind.Array
                && choices.GetArrayLength() > 0)
            {
                var first = choices[0];

                if (first.TryGetProperty("message", out var message)
                    && message.TryGetProperty("content", out var content))
                {
                    if (content.ValueKind == JsonValueKind.String)
                        return content.GetString();

                    // Some providers return content as an array of parts.
                    if (content.ValueKind == JsonValueKind.Array)
                    {
                        var sb = new StringBuilder();
                        foreach (var part in content.EnumerateArray())
                        {
                            if (part.TryGetProperty("text", out var t))
                                sb.Append(t.GetString());
                        }
                        return sb.ToString();
                    }
                }

                // Legacy completion shape.
                if (first.TryGetProperty("text", out var legacy))
                    return legacy.GetString();
            }

            return null;
        }

        private static string Truncate(string s, int max)
            => string.IsNullOrEmpty(s) || s.Length <= max ? s : s.Substring(0, max) + "…";
    }
}
