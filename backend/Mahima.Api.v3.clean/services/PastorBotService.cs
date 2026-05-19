using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Services
{
    public class PastorBotService : IPastorBotService
    {
        public const string BotUsername = "pastor.bot";
        public const string BotUserCode = "BOTPASTOR";
        public const string JaiMasihChatName = "Jai Masih";

        private readonly MahimaDbContext _db;
        private readonly IChatService _chatService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<PastorBotService> _logger;

        public PastorBotService(
            MahimaDbContext db,
            IChatService chatService,
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            ILogger<PastorBotService> logger)
        {
            _db = db;
            _chatService = chatService;
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        public async Task<Guid> EnsurePastorBotUserAsync(CancellationToken ct = default)
        {
            var bot = await _db.Users.FirstOrDefaultAsync(u => u.Username == BotUsername || u.UserCode == BotUserCode, ct);
            if (bot != null) return bot.Id;

            bot = new User
            {
                Username = BotUsername,
                UserCode = BotUserCode,
                DisplayName = "AI Pastor",
                Email = "pastor.bot@mahimaministries.local",
                Role = "admin",
                JoinDate = DateTime.UtcNow
            };

            _db.Users.Add(bot);
            await _db.SaveChangesAsync(ct);
            return bot.Id;
        }

        public async Task<Chat> EnsureJaiMasihChatAsync(CancellationToken ct = default)
        {
            var botUserId = await EnsurePastorBotUserAsync(ct);

            var chat = await _db.Chats
                .FirstOrDefaultAsync(c => c.IsGroup && c.Name != null && c.Name.ToLower() == JaiMasihChatName.ToLower(), ct);

            if (chat == null)
            {
                chat = new Chat
                {
                    Name = JaiMasihChatName,
                    IsGroup = true,
                    CreatedBy = botUserId,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Chats.Add(chat);
                await _db.SaveChangesAsync(ct);
            }

            var allUserIds = await _db.Users
                .AsNoTracking()
                .Select(u => u.Id)
                .ToListAsync(ct);

            if (!allUserIds.Contains(botUserId))
                allUserIds.Add(botUserId);

            var existingMembers = await _db.ChatMembers
                .Where(cm => cm.ChatId == chat.Id)
                .Select(cm => cm.UserId)
                .ToListAsync(ct);

            var existing = existingMembers.ToHashSet();
            var missingMembers = allUserIds
                .Where(id => !existing.Contains(id))
                .Distinct()
                .Select(id => new ChatMember
                {
                    ChatId = chat.Id,
                    UserId = id,
                    Role = id == botUserId ? "admin" : "member",
                    JoinedAt = DateTime.UtcNow
                })
                .ToList();

            if (missingMembers.Count > 0)
            {
                _db.ChatMembers.AddRange(missingMembers);
                await _db.SaveChangesAsync(ct);
            }

            return chat;
        }

        public async Task<MessageDto> SendJaiMasihMessageAsync(string content, CancellationToken ct = default)
        {
            var chat = await EnsureJaiMasihChatAsync(ct);
            var botUserId = await EnsurePastorBotUserAsync(ct);
            return await _chatService.AddMessageAsync(chat.Id, botUserId, content, "text");
        }

        public async Task<PastorBotReplyDto> AskAsync(Guid userId, string question, bool sendToJaiMasih = false, string? language = null, string? persona = null, IReadOnlyList<PastorBotMessageDto>? conversation = null, CancellationToken ct = default)
        {
            var trimmed = (question ?? string.Empty).Trim();
            var normalizedLanguage = NormalizeLanguage(language);
            var normalizedPersona = NormalizePersona(persona, normalizedLanguage);

            if (string.IsNullOrWhiteSpace(trimmed))
            {
                return new PastorBotReplyDto
                {
                    Answer = normalizedLanguage switch
                    {
                        "hi" => "कृपया बताइए कि आपको किस बात के लिए प्रार्थना या मार्गदर्शन चाहिए।",
                        "pa" => "ਕਿਰਪਾ ਕਰਕੇ ਦੱਸੋ ਕਿ ਤੁਹਾਨੂੰ ਕਿਸ ਗੱਲ ਲਈ ਪ੍ਰਾਰਥਨਾ ਜਾਂ ਮਾਰਗਦਰਸ਼ਨ ਚਾਹੀਦਾ ਹੈ।",
                        _ => "Please share what you would like prayer or guidance for."
                    },
                    Language = normalizedLanguage,
                    Persona = normalizedPersona
                };
            }

            var answer = await TryAskConfiguredAiAsync(userId, trimmed, normalizedLanguage, normalizedPersona, conversation, ct);
            var source = string.IsNullOrWhiteSpace(answer) ? "fallback" : "ai";
            answer ??= BuildFallbackPastoralAnswer(trimmed, normalizedLanguage);

            var reply = new PastorBotReplyDto
            {
                Answer = answer,
                Source = source,
                Language = normalizedLanguage,
                Persona = normalizedPersona
            };

            if (sendToJaiMasih)
            {
                var message = await SendJaiMasihMessageAsync(answer, ct);
                reply.ChatId = message.ChatId;
                reply.MessageId = message.Id;
            }

            return reply;
        }

        public async Task<PastorBotReplyDto> ReadMeAsync(Guid userId, string imageDataUrl, string? note = null, string? language = null, string? persona = null, CancellationToken ct = default)
        {
            var normalizedLanguage = NormalizeLanguage(language);
            var normalizedPersona = NormalizePersona(persona, normalizedLanguage);
            var userNote = (note ?? string.Empty).Trim();
            var image = (imageDataUrl ?? string.Empty).Trim();

            var answer = await TryAskConfiguredVisionAsync(userId, image, userNote, normalizedLanguage, normalizedPersona, ct);
            var source = string.IsNullOrWhiteSpace(answer) ? "fallback" : "ai";
            answer ??= BuildReadMeFallbackAnswer(userNote, normalizedLanguage);

            return new PastorBotReplyDto
            {
                Answer = answer,
                Source = source,
                Language = normalizedLanguage,
                Persona = normalizedPersona
            };
        }

        public async Task<MessageDto?> TryReplyInChatAsync(Guid chatId, Guid userId, string? userMessage, CancellationToken ct = default)
        {
            var text = (userMessage ?? string.Empty).Trim();
            if (!ShouldPastorReply(text)) return null;

            var botUserId = await EnsurePastorBotUserAsync(ct);
            await EnsureBotIsChatMemberAsync(chatId, botUserId, ct);

            var prompt = text.StartsWith("@pastor", StringComparison.OrdinalIgnoreCase)
                ? text.Substring("@pastor".Length).Trim()
                : text.StartsWith("/pastor", StringComparison.OrdinalIgnoreCase)
                    ? text.Substring("/pastor".Length).Trim()
                    : text.Trim();

            if (string.IsNullOrWhiteSpace(prompt))
                prompt = "Please give me today's spiritual guidance.";

            var answer = (await AskAsync(userId, prompt, false, null, null, null, ct)).Answer;
            return await _chatService.AddMessageAsync(chatId, botUserId, answer, "text");
        }

        private static bool ShouldPastorReply(string text) =>
            text.StartsWith("@pastor", StringComparison.OrdinalIgnoreCase)
            || text.StartsWith("/pastor", StringComparison.OrdinalIgnoreCase);

        private async Task EnsureBotIsChatMemberAsync(Guid chatId, Guid botUserId, CancellationToken ct)
        {
            var exists = await _db.ChatMembers.AnyAsync(cm => cm.ChatId == chatId && cm.UserId == botUserId, ct);
            if (exists) return;

            _db.ChatMembers.Add(new ChatMember
            {
                ChatId = chatId,
                UserId = botUserId,
                Role = "pastor-bot",
                JoinedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);
        }

        private static string NormalizeLanguage(string? language)
        {
            var value = (language ?? "en").Trim().ToLowerInvariant();
            if (value.StartsWith("hi") || value.Contains("hindi")) return "hi";
            if (value.StartsWith("pa") || value.StartsWith("pun") || value.Contains("punjabi")) return "pa";
            return "en";
        }

        private static string NormalizePersona(string? persona, string language)
        {
            var value = (persona ?? string.Empty).Trim().ToLowerInvariant();
            if (language == "hi") return "hindi-pastoral-guide";
            if (language == "pa") return "punjabi-pastoral-guide";
            return value.Contains("teaching") ? "english-teaching-guide" : "english-evangelist";
        }

        private static string BuildSystemPrompt(string language, string persona)
        {
            var basePrompt = @"You are Mahima Ministry's AI Pastor assistant. Give warm, biblical, practical, non-judgmental guidance. Encourage prayer, church community, and contacting a real pastor for crisis, abuse, self-harm, legal, medical, or emergency issues. Do not claim to replace a human pastor. Never claim to be, imitate, or speak as a real public figure.";

            if (language == "hi")
            {
                return basePrompt + " Reply in natural Hindi. Use simple pastoral Hindi, short paragraphs, and include one Bible-based encouragement, one practical next step, and a short prayer. Do not imitate any specific pastor or celebrity.";
            }

            if (language == "pa")
            {
                return basePrompt + " Reply in natural Punjabi. Use simple pastoral Punjabi, short paragraphs, and include one Bible-based encouragement, one practical next step, and a short prayer. Do not imitate any specific pastor or celebrity.";
            }

            if (persona == "english-teaching-guide")
            {
                return basePrompt + " Reply in English like a thoughtful pastoral teacher: clear, structured, conversational, and practical. Include a Bible verse, reflection, next step, and short prayer.";
            }

            return basePrompt + " Reply in English with a warm classic evangelistic tone: compassionate, hopeful, direct, and reverent, without imitating any specific preacher. Include a Bible verse, practical encouragement, and a short prayer.";
        }

        private static string BuildReadMeSystemPrompt(string language, string persona)
        {
            var basePrompt = BuildSystemPrompt(language, persona) + @"

You are handling a consent-based ReadMe camera session. Use the camera image only as user-shared context. You may mention simple visible, non-sensitive observations such as posture, lighting, setting, facial expression if clearly visible, or signs that the user seems tired or thoughtful, but state them gently as possibilities. Do not identify the person. Do not infer or mention age, gender, ethnicity, caste, religion, health status, mental health diagnosis, disability, income, private relationships, or hidden emotions as facts. Do not judge appearance. Do not provide medical, legal, or crisis diagnosis. If the note suggests self-harm, abuse, or emergency danger, encourage immediate help from local emergency services and a trusted human pastor/counsellor.

Respond as a pastoral counsellor using this shape:
1. A warm greeting.
2. One or two careful observations from the image and note, framed with humility.
3. Biblical encouragement with 2-3 verse references.
4. Practical next steps for the next hour or day.
5. A short prayer.";

            if (language == "hi")
                return basePrompt + " Reply completely in natural Hindi.";

            if (language == "pa")
                return basePrompt + " Reply completely in natural Punjabi.";

            return basePrompt + " Reply completely in English.";
        }

        private static string BuildReadMeVisionPrompt(string note, string language)
        {
            var safeNote = string.IsNullOrWhiteSpace(note)
                ? "The user did not type a specific concern. Please offer gentle pastoral guidance from the camera context only."
                : note;

            return language switch
            {
                "hi" => $"Read this user-shared camera image with care and consent. User note: {safeNote}. Give biblical pastoral counsel in Hindi only.",
                "pa" => $"Read this user-shared camera image with care and consent. User note: {safeNote}. Give biblical pastoral counsel in Punjabi only.",
                _ => $"Read this user-shared camera image with care and consent. User note: {safeNote}. Give biblical pastoral counsel in English only."
            };
        }

        private static object[] BuildAiInput(string system, string question, IReadOnlyList<PastorBotMessageDto>? conversation)
        {
            var input = new List<object> { new { role = "system", content = system } };
            foreach (var message in (conversation ?? Array.Empty<PastorBotMessageDto>()).TakeLast(12))
            {
                var text = (message.Text ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(text)) continue;

                var role = string.Equals(message.Role, "pastor", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(message.Role, "assistant", StringComparison.OrdinalIgnoreCase)
                    ? "assistant"
                    : "user";

                input.Add(new { role, content = text });
            }

            input.Add(new { role = "user", content = question });
            return input.ToArray();
        }

        private async Task<string?> TryAskConfiguredAiAsync(Guid userId, string question, string language, string persona, IReadOnlyList<PastorBotMessageDto>? conversation, CancellationToken ct)
        {
            var apiKey = _config["PastorBot:OpenAiApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey)) return null;

            try
            {
                var model = _config["PastorBot:Model"] ?? "gpt-4.1";
                var endpoint = _config["PastorBot:Endpoint"] ?? "https://api.openai.com/v1/responses";
                var client = _httpClientFactory.CreateClient("PastorBot");
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

                var system = BuildSystemPrompt(language, persona);
                var payload = new
                {
                    model,
                    input = BuildAiInput(system, question, conversation)
                };

                using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                using var response = await client.PostAsync(endpoint, content, ct);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("PastorBot AI provider failed with {StatusCode}", response.StatusCode);
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);

                if (doc.RootElement.TryGetProperty("output_text", out var outputText))
                    return outputText.GetString();

                if (doc.RootElement.TryGetProperty("output", out var output) && output.ValueKind == JsonValueKind.Array)
                {
                    var parts = new List<string>();
                    foreach (var item in output.EnumerateArray())
                    {
                        if (!item.TryGetProperty("content", out var contentArray) || contentArray.ValueKind != JsonValueKind.Array) continue;
                        foreach (var part in contentArray.EnumerateArray())
                        {
                            if (part.TryGetProperty("text", out var text))
                                parts.Add(text.GetString() ?? string.Empty);
                        }
                    }

                    var joined = string.Join("\n", parts.Where(p => !string.IsNullOrWhiteSpace(p))).Trim();
                    return string.IsNullOrWhiteSpace(joined) ? null : joined;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "PastorBot AI provider failed; using fallback guidance.");
            }

            return null;
        }

        private async Task<string?> TryAskConfiguredVisionAsync(Guid userId, string imageDataUrl, string note, string language, string persona, CancellationToken ct)
        {
            var apiKey = _config["PastorBot:OpenAiApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey)) return null;
            if (!IsSupportedImageDataUrl(imageDataUrl)) return null;

            try
            {
                var model = _config["PastorBot:VisionModel"] ?? _config["PastorBot:Model"] ?? "gpt-4.1";
                var endpoint = _config["PastorBot:Endpoint"] ?? "https://api.openai.com/v1/responses";
                var client = _httpClientFactory.CreateClient("PastorBot");
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

                var system = BuildReadMeSystemPrompt(language, persona);
                var question = BuildReadMeVisionPrompt(note, language);
                var payload = new
                {
                    model,
                    input = new object[]
                    {
                        new { role = "system", content = system },
                        new
                        {
                            role = "user",
                            content = new object[]
                            {
                                new { type = "input_text", text = question },
                                new { type = "input_image", image_url = imageDataUrl }
                            }
                        }
                    }
                };

                using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                using var response = await client.PostAsync(endpoint, content, ct);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("PastorBot ReadMe provider failed with {StatusCode}", response.StatusCode);
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                return ExtractAiResponseText(doc);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "PastorBot ReadMe provider failed; using fallback guidance.");
            }

            return null;
        }

        private static bool IsSupportedImageDataUrl(string value) =>
            !string.IsNullOrWhiteSpace(value) &&
            (value.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase) ||
             value.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase) ||
             value.StartsWith("data:image/webp;base64,", StringComparison.OrdinalIgnoreCase));

        private static string? ExtractAiResponseText(JsonDocument doc)
        {
            if (doc.RootElement.TryGetProperty("output_text", out var outputText))
                return outputText.GetString();

            if (doc.RootElement.TryGetProperty("output", out var output) && output.ValueKind == JsonValueKind.Array)
            {
                var parts = new List<string>();
                foreach (var item in output.EnumerateArray())
                {
                    if (!item.TryGetProperty("content", out var contentArray) || contentArray.ValueKind != JsonValueKind.Array) continue;
                    foreach (var part in contentArray.EnumerateArray())
                    {
                        if (part.TryGetProperty("text", out var text))
                            parts.Add(text.GetString() ?? string.Empty);
                    }
                }

                var joined = string.Join("\n", parts.Where(p => !string.IsNullOrWhiteSpace(p))).Trim();
                return string.IsNullOrWhiteSpace(joined) ? null : joined;
            }

            return null;
        }

        private static string BuildReadMeFallbackAnswer(string note, string language)
        {
            if (language == "hi")
            {
                return "Jai Masih. ReadMe abhi AI vision se connect nahi ho paya, lekin Prabhu aapko dekhta aur sambhalta hai. Bhajan 139:23-24 me Daud prarthana karta hai: Hey Parmeshwar, mujhe jaanch aur mere man ko jaan. Aaj ek shaant pal lijiye, apni baat Yeshu ko seedhe kahiye, aur ek vishwasi pastor ya leader ke saath baat share kijiye. Prarthana: Prabhu Yeshu, apni shanti, buddhi aur sahas is vyakti ko dijiye. Amen.";
            }

            if (language == "pa")
            {
                return "Jai Masih. ReadMe is vele AI vision naal connect nahi ho paya, par Prabhu tuhanu vekhda ate sambhalda hai. Zaboor 139:23-24 vich prarthana hai: Hey Parmeshwar, mainu jaanch ate mere dil nu jaan. Aaj ik shaant pal lao, apni gal Yeshu nu daso, ate kise bharosemand pastor ja leader naal gal karo. Prarthana: Prabhu Yeshu, apni shanti, buddhi ate himmat is vyakti nu deo. Amen.";
            }

            return "Jai Masih. ReadMe could not connect to AI vision right now, but the Lord still sees you with love and care. Psalm 139:23-24 invites us to pray, 'Search me, God, and know my heart.' Take one quiet minute, tell Jesus honestly what is on your heart, and share the burden with a trusted pastor or leader. Prayer: Lord Jesus, give this person peace, wisdom, courage, and the next faithful step. Amen.";
        }

        private static string BuildFallbackPastoralAnswer(string question, string language)
        {
            var lower = question.ToLowerInvariant();

            if (language == "hi")
            {
                if (lower.Contains("fear") || lower.Contains("worry") || lower.Contains("anxiety") || lower.Contains("dar") || lower.Contains("chinta"))
                {
                    return "Jai Masih. फिलिप्पियों 4:6-7 हमें याद दिलाता है कि हम अपनी चिंता प्रभु को प्रार्थना में दें। अभी एक शांत पल लीजिए और कहिए: प्रभु यीशु, मैं अपना डर आपको देता हूं, मुझे अपनी शांति दीजिए। अगर बात बहुत भारी या असुरक्षित लग रही है, तो कृपया आज ही किसी पास्टर या भरोसेमंद अगुवे से बात करें।";
                }

                if (lower.Contains("prayer") || lower.Contains("pray") || lower.Contains("prarthana"))
                {
                    return "Jai Masih. आइए प्रार्थना करें: प्रभु यीशु, अपने इस बच्चे को बुद्धि, सुरक्षा, शांति और विश्वास दीजिए। सही दरवाजे खोलिए और हर बोझ में अपनी उपस्थिति महसूस कराइए। आमीन।";
                }

                return "Jai Masih. आज का मार्गदर्शन: यीशु के पास बने रहिए, प्रेम से अगला सही कदम उठाइए, और अपने शब्दों में अनुग्रह रखिए। भजन संहिता 119:105 कहता है कि परमेश्वर का वचन हमारे पांव के लिए दीपक है। आज एक बोझ प्रभु को प्रार्थना में दीजिए और एक व्यक्ति को आशीष दीजिए।";
            }

            if (language == "pa")
            {
                if (lower.Contains("fear") || lower.Contains("worry") || lower.Contains("anxiety") || lower.Contains("dar") || lower.Contains("chinta"))
                {
                    return "Jai Masih. ਫਿਲਿੱਪੀਆਂ 4:6-7 ਸਾਨੂੰ ਯਾਦ ਦਿਵਾਉਂਦਾ ਹੈ ਕਿ ਅਸੀਂ ਆਪਣੀ ਚਿੰਤਾ ਪ੍ਰਭੂ ਨੂੰ ਪ੍ਰਾਰਥਨਾ ਵਿੱਚ ਦੇਈਏ। ਹੁਣ ਇੱਕ ਸ਼ਾਂਤ ਪਲ ਲਓ ਅਤੇ ਕਹੋ: ਪ੍ਰਭੂ ਯਿਸੂ, ਮੈਂ ਆਪਣਾ ਡਰ ਤੁਹਾਨੂੰ ਦੇਂਦਾ ਹਾਂ, ਮੈਨੂੰ ਆਪਣੀ ਸ਼ਾਂਤੀ ਦਿਓ। ਜੇ ਗੱਲ ਬਹੁਤ ਭਾਰੀ ਜਾਂ ਅਸੁਰੱਖਿਅਤ ਲੱਗ ਰਹੀ ਹੈ, ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਅੱਜ ਹੀ ਕਿਸੇ ਪਾਸਟਰ ਜਾਂ ਭਰੋਸੇਯੋਗ ਅਗੂ ਨਾਲ ਗੱਲ ਕਰੋ।";
                }

                if (lower.Contains("prayer") || lower.Contains("pray") || lower.Contains("prarthana"))
                {
                    return "Jai Masih. ਆਓ ਪ੍ਰਾਰਥਨਾ ਕਰੀਏ: ਪ੍ਰਭੂ ਯਿਸੂ, ਆਪਣੇ ਇਸ ਬੱਚੇ ਨੂੰ ਬੁੱਧੀ, ਸੁਰੱਖਿਆ, ਸ਼ਾਂਤੀ ਅਤੇ ਵਿਸ਼ਵਾਸ ਦਿਓ। ਸਹੀ ਦਰਵਾਜ਼ੇ ਖੋਲ੍ਹੋ ਅਤੇ ਹਰ ਬੋਝ ਵਿੱਚ ਆਪਣੀ ਹਾਜ਼ਰੀ ਮਹਿਸੂਸ ਕਰਾਓ। ਆਮੀਨ।";
                }

                return "Jai Masih. ਅੱਜ ਦਾ ਮਾਰਗਦਰਸ਼ਨ: ਯਿਸੂ ਦੇ ਨੇੜੇ ਰਹੋ, ਪਿਆਰ ਨਾਲ ਅਗਲਾ ਸਹੀ ਕਦਮ ਚੁੱਕੋ, ਅਤੇ ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਕਿਰਪਾ ਰੱਖੋ। ਜ਼ਬੂਰ 119:105 ਕਹਿੰਦਾ ਹੈ ਕਿ ਪਰਮੇਸ਼ੁਰ ਦਾ ਵਚਨ ਸਾਡੇ ਪੈਰਾਂ ਲਈ ਦੀਵਾ ਹੈ। ਅੱਜ ਇੱਕ ਬੋਝ ਪ੍ਰਭੂ ਨੂੰ ਪ੍ਰਾਰਥਨਾ ਵਿੱਚ ਦਿਓ ਅਤੇ ਇੱਕ ਵਿਅਕਤੀ ਨੂੰ ਆਸੀਸ ਦਿਓ।";
            }

            if (lower.Contains("fear") || lower.Contains("worry") || lower.Contains("anxiety"))
            {
                return "Jai Masih. Remember Philippians 4:6-7: bring every worry to God in prayer. Take one quiet minute now, breathe slowly, and say: Lord Jesus, I give You this fear and receive Your peace. If this feels heavy or unsafe, please speak with a pastor or trusted leader today.";
            }

            if (lower.Contains("forgive") || lower.Contains("anger") || lower.Contains("hurt"))
            {
                return "Jai Masih. Forgiveness is a journey, not a switch. Ask Jesus for grace for the next faithful step: pray honestly, release revenge, and seek wise counsel if the hurt is deep. Colossians 3:13 reminds us to forgive as the Lord forgave us.";
            }

            if (lower.Contains("prayer") || lower.Contains("pray"))
            {
                return "Jai Masih. Let us pray: Lord Jesus, guide this child of God today. Give wisdom, protection, peace, and a heart that hears Your voice. Open the right doors and strengthen faith. Amen.";
            }

            return "Jai Masih. Today's guidance: stay close to Jesus, do the next right thing with love, and let your words carry grace. Psalm 119:105 says God's word is a lamp to our feet and a light to our path. Share one burden with God in prayer, and bless one person practically today.";
        }
    }
}
