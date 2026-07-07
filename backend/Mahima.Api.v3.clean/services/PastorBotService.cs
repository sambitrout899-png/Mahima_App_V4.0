using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Models;
using Mahima.Api.v3.clean.Services.Ai;
using Microsoft.EntityFrameworkCore;
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
        private readonly ILlmProvider _llm;
        private readonly IScriptureService _scripture;
        private readonly ILogger<PastorBotService> _logger;

        public PastorBotService(
            MahimaDbContext db,
            IChatService chatService,
            ILlmProvider llm,
            IScriptureService scripture,
            ILogger<PastorBotService> logger)
        {
            _db = db;
            _chatService = chatService;
            _llm = llm;
            _scripture = scripture;
            _logger = logger;
        }

        public async Task<Guid> EnsurePastorBotUserAsync(CancellationToken ct = default)
        {
            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync(ct);

            static void AddParam(System.Data.Common.DbCommand cmd, string name, object value)
            {
                var p = cmd.CreateParameter();
                p.ParameterName = name;
                p.Value = value;
                cmd.Parameters.Add(p);
            }

            await using (var find = conn.CreateCommand())
            {
                find.CommandText = @"
SELECT id
FROM public.users
WHERE username = @username OR ""UserCode"" = @userCode
LIMIT 1";
                AddParam(find, "@username", BotUsername);
                AddParam(find, "@userCode", BotUserCode);

                var existing = await find.ExecuteScalarAsync(ct);
                if (existing is Guid existingId)
                {
                    await using var update = conn.CreateCommand();
                    update.CommandText = @"
UPDATE public.users
SET username = COALESCE(NULLIF(username, ''), @username),
    ""UserCode"" = COALESCE(NULLIF(""UserCode"", ''), @userCode),
    displayname = @displayName,
    email = COALESCE(NULLIF(email, ''), @email),
    role = COALESCE(NULLIF(role, ''), @role)
WHERE id = @id";
                    AddParam(update, "@id", existingId);
                    AddParam(update, "@username", BotUsername);
                    AddParam(update, "@userCode", BotUserCode);
                    AddParam(update, "@displayName", "AI Pastor");
                    AddParam(update, "@email", "pastor.bot@mahimaministries.local");
                    AddParam(update, "@role", "admin");
                    await update.ExecuteNonQueryAsync(ct);
                    return existingId;
                }
            }

            var botId = Guid.NewGuid();
            await using (var insert = conn.CreateCommand())
            {
                insert.CommandText = @"
INSERT INTO public.users (id, username, ""UserCode"", displayname, email, role, joindate)
VALUES (@id, @username, @userCode, @displayName, @email, @role, @joinDate)";
                AddParam(insert, "@id", botId);
                AddParam(insert, "@username", BotUsername);
                AddParam(insert, "@userCode", BotUserCode);
                AddParam(insert, "@displayName", "AI Pastor");
                AddParam(insert, "@email", "pastor.bot@mahimaministries.local");
                AddParam(insert, "@role", "admin");
                AddParam(insert, "@joinDate", DateTime.UtcNow);
                await insert.ExecuteNonQueryAsync(ct);
            }

            return botId;
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

            var allUserIds = new List<Guid>();
            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync(ct);
            await using (var usersCmd = conn.CreateCommand())
            {
                usersCmd.CommandText = "SELECT id FROM public.users";
                await using var reader = await usersCmd.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    if (!reader.IsDBNull(0)) allUserIds.Add(reader.GetGuid(0));
                }
            }

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
                var shared = await ShareConversationToJaiMasihAsync(userId, trimmed, answer, ct);
                reply.SharedMessages = shared.ToList();
                var last = shared.LastOrDefault();
                if (last != null)
                {
                    reply.ChatId = last.ChatId;
                    reply.MessageId = last.Id;
                }
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

        public async Task<IReadOnlyList<MessageDto>> TryReplyInChatAsync(Guid chatId, Guid userId, string? userMessage, CancellationToken ct = default)
        {
            _logger.LogInformation("AI Pastor chat reply requested. ChatId={ChatId} UserId={UserId} HasMessage={HasMessage}",
                chatId, userId, !string.IsNullOrWhiteSpace(userMessage));
            var canonicalBotUserId = await EnsurePastorBotUserAsync(ct);
            var botUserId = await ResolvePastorBotUserForChatAsync(chatId, userId, canonicalBotUserId, ct);
            if (userId == botUserId) return Array.Empty<MessageDto>();

            var text = CleanChatText(userMessage);
            if (string.IsNullOrWhiteSpace(text))
            {
                _logger.LogInformation("AI Pastor chat reply skipped because message was empty after cleanup. ChatId={ChatId}", chatId);
                return Array.Empty<MessageDto>();
            }

            var shouldReply = await ShouldPastorReplyAsync(chatId, text, botUserId, ct);
            if (!shouldReply)
            {
                _logger.LogInformation("AI Pastor chat reply skipped because chat/message did not match pastor rules. ChatId={ChatId}", chatId);
                return Array.Empty<MessageDto>();
            }

            await EnsureBotIsChatMemberAsync(chatId, botUserId, ct);

            var prompt = text.StartsWith("@pastor", StringComparison.OrdinalIgnoreCase)
                ? text.Substring("@pastor".Length).Trim()
                : text.StartsWith("@ai pastor", StringComparison.OrdinalIgnoreCase)
                    ? text.Substring("@ai pastor".Length).Trim()
                    : text.StartsWith("/pastor", StringComparison.OrdinalIgnoreCase)
                        ? text.Substring("/pastor".Length).Trim()
                        : text.Trim();

            if (string.IsNullOrWhiteSpace(prompt))
                prompt = "Please give me today's spiritual guidance.";

            var history = await BuildChatConversationAsync(chatId, botUserId, ct);
            using var replyTimeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            replyTimeout.CancelAfter(TimeSpan.FromSeconds(60));

            string answer;
            try
            {
                var pastorReply = await AskAsync(userId, prompt, false, null, "pastor-chat", history, replyTimeout.Token);
                _logger.LogInformation("AI Pastor chat AskAsync completed. ChatId={ChatId} Source={Source} Persona={Persona}",
                    chatId, pastorReply.Source, pastorReply.Persona);

                if (!string.Equals(pastorReply.Source, "ai", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("AI Pastor chat reply skipped because LLM returned fallback for chat {ChatId}.", chatId);
                    return Array.Empty<MessageDto>();
                }

                answer = pastorReply.Answer;
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("AI Pastor chat reply timed out for chat {ChatId}.", chatId);
                return Array.Empty<MessageDto>();
            }

            var messagesToBroadcast = new List<MessageDto>();
            var reply = await _chatService.AddMessageAsync(chatId, botUserId, answer, "text");
            messagesToBroadcast.Add(reply);

            return messagesToBroadcast;
        }

        private async Task<bool> ShouldPastorReplyAsync(Guid chatId, string text, Guid botUserId, CancellationToken ct)
        {
            var isMention =
                text.StartsWith("@pastor", StringComparison.OrdinalIgnoreCase)
                || text.StartsWith("@ai pastor", StringComparison.OrdinalIgnoreCase)
                || text.StartsWith("/pastor", StringComparison.OrdinalIgnoreCase);

            var chat = await _db.Chats
                .AsNoTracking()
                .Where(c => c.Id == chatId)
                .Select(c => new { c.Name, c.IsGroup })
                .FirstOrDefaultAsync(ct);
            if (chat == null) return false;

            if (chat.IsGroup && isMention)
                return true;

            if (IsPastorChatName(chat.Name))
                return true;

            var members = await _db.ChatMembers
                .AsNoTracking()
                .Where(cm => cm.ChatId == chatId)
                .Select(cm => new
                {
                    cm.UserId,
                    Username = cm.User != null ? cm.User.Username : null,
                    UserCode = cm.User != null ? cm.User.UserCode : null,
                    DisplayName = cm.User != null ? cm.User.DisplayName : null,
                    Email = cm.User != null ? cm.User.Email : null
                })
                .ToListAsync(ct);

            return !chat.IsGroup && members.Any(m =>
                m.UserId == botUserId || IsPastorIdentity(m.Username, m.UserCode, m.DisplayName, m.Email));
        }

        private async Task<IReadOnlyList<MessageDto>> ShareConversationToJaiMasihAsync(Guid userId, string question, string answer, CancellationToken ct)
        {
            var botUserId = await EnsurePastorBotUserAsync(ct);
            var jaiMasih = await EnsureJaiMasihChatAsync(ct);
            var messages = new List<MessageDto>();

            var cleanQuestion = CleanChatText(question);
            if (!string.IsNullOrWhiteSpace(cleanQuestion))
                messages.Add(await _chatService.AddMessageAsync(jaiMasih.Id, userId, cleanQuestion, "text"));

            if (!string.IsNullOrWhiteSpace(answer))
                messages.Add(await _chatService.AddMessageAsync(jaiMasih.Id, botUserId, answer, "text"));

            return messages;
        }

        private async Task<bool> IsDirectPastorChatAsync(Guid chatId, Guid botUserId, CancellationToken ct)
        {
            var chat = await _db.Chats
                .AsNoTracking()
                .Where(c => c.Id == chatId)
                .Select(c => new { c.IsGroup, c.Name })
                .FirstOrDefaultAsync(ct);
            if (chat == null || chat.IsGroup) return false;

            return await _db.ChatMembers
                .AsNoTracking()
                .AnyAsync(cm => cm.ChatId == chatId && cm.UserId == botUserId, ct);
        }

        private async Task<Guid> ResolvePastorBotUserForChatAsync(Guid chatId, Guid senderId, Guid canonicalBotUserId, CancellationToken ct)
        {
            var chat = await _db.Chats
                .AsNoTracking()
                .Where(c => c.Id == chatId)
                .Select(c => new { c.IsGroup, c.Name })
                .FirstOrDefaultAsync(ct);
            if (chat == null || chat.IsGroup) return canonicalBotUserId;

            var members = await _db.ChatMembers
                .AsNoTracking()
                .Where(cm => cm.ChatId == chatId)
                .Select(cm => new
                {
                    cm.UserId,
                    Username = cm.User != null ? cm.User.Username : null,
                    UserCode = cm.User != null ? cm.User.UserCode : null,
                    DisplayName = cm.User != null ? cm.User.DisplayName : null,
                    Email = cm.User != null ? cm.User.Email : null
                })
                .ToListAsync(ct);

            if (members.Any(m => m.UserId == canonicalBotUserId)) return canonicalBotUserId;

            var pastorMember = members.FirstOrDefault(m =>
                m.UserId != senderId &&
                IsPastorIdentity(m.Username, m.UserCode, m.DisplayName, m.Email));
            if (pastorMember != null) return pastorMember.UserId;

            if (IsPastorChatName(chat.Name))
            {
                var otherMember = members.FirstOrDefault(m => m.UserId != senderId);
                if (otherMember != null) return otherMember.UserId;
            }

            return canonicalBotUserId;
        }

        private static bool IsPastorIdentity(string? username, string? userCode, string? displayName, string? email)
        {
            var combined = $"{username} {userCode} {displayName} {email}".ToLowerInvariant();
            var normalized = new string(combined.Where(char.IsLetterOrDigit).ToArray());
            return normalized.Contains("pastorbot")
                || normalized.Contains("botpastor")
                || normalized.Contains("aipastor")
                || normalized.Contains("aicounseller")
                || normalized.Contains("aicounselor")
                || normalized.Contains("pastorbotmahimaministrieslocal");
        }

        private async Task<IReadOnlyList<PastorBotMessageDto>> BuildChatConversationAsync(Guid chatId, Guid botUserId, CancellationToken ct)
        {
            var recent = await _chatService.GetMessagesAsync(chatId, page: 1, size: 14);

            return recent.Items
                .Select(m => new PastorBotMessageDto
                {
                    Role = m.SenderId == botUserId ? "assistant" : "user",
                    Text = CleanChatText(m.Content)
                })
                .Where(m => !string.IsNullOrWhiteSpace(m.Text))
                .ToList();
        }

        private static string CleanChatText(string? text)
        {
            var value = (text ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;

            value = Regex.Replace(value, @"\s*\[jm-attachment:[A-Za-z0-9+/=]+\]", string.Empty, RegexOptions.IgnoreCase);
            value = Regex.Replace(value, @"\s*\[jm-message-meta:[A-Za-z0-9+/=]+\]", string.Empty, RegexOptions.IgnoreCase);
            return value.Trim();
        }

        private static bool IsPastorChatName(string? name)
        {
            var normalized = new string((name ?? string.Empty)
                .ToLowerInvariant()
                .Where(char.IsLetterOrDigit)
                .ToArray());

            return normalized == "jaimasih"
                || normalized == "aipastor"
                || normalized == "pastorbot"
                || normalized.Contains("jaimasih")
                || normalized.Contains("aipastor");
        }

        private async Task EnsureBotIsChatMemberAsync(Guid chatId, Guid botUserId, CancellationToken ct)
        {
            var exists = await _db.ChatMembers.AnyAsync(cm => cm.ChatId == chatId && cm.UserId == botUserId, ct);
            if (exists) return;

            var chat = await _db.Chats
                .AsNoTracking()
                .Where(c => c.Id == chatId)
                .Select(c => new { c.IsGroup })
                .FirstOrDefaultAsync(ct);
            if (chat == null || !chat.IsGroup) return;

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
            if (value.Contains("pastor-chat")) return "pastor-chat";
            return value.Contains("teaching") ? "english-teaching-guide" : "english-evangelist";
        }

        private static string BuildSystemPrompt(string language, string persona)
        {
            var basePrompt = @"You are Mahima Ministry's AI Counseller assistant. Give warm, biblical, practical, non-judgmental guidance. Encourage prayer, church community, and contacting a real pastor for crisis, abuse, self-harm, legal, medical, or emergency issues. Do not claim to replace a human pastor. Never claim to be, imitate, or speak as a real public figure.";

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

            if (persona == "pastor-chat")
            {
                return basePrompt + " Reply like a one-to-one chat conversation, not a sermon or announcement. Be natural, specific to the user's latest message, and keep most replies to 3-6 short sentences. Use the recent conversation context, ask at most one gentle follow-up question when helpful, and do not always include a full prayer or Bible verse unless the user asks or the moment clearly needs it.";
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

        /// <summary>
        /// Builds the Scripture-grounding block appended to the system prompt.
        /// The model is told to cite ONLY these retrieved verses, which keeps the
        /// autonomous pastor from inventing chapter/verse numbers.
        /// </summary>
        private static string BuildScriptureGrounding(IReadOnlyList<ScriptureVerse> verses)
        {
            if (verses == null || verses.Count == 0) return string.Empty;

            var sb = new StringBuilder();
            sb.AppendLine("SCRIPTURE GROUNDING — the verses below have been retrieved as relevant to this conversation.");
            sb.AppendLine("When you cite Scripture, quote ONLY from these verses and use their exact references.");
            sb.AppendLine("Do not invent chapter or verse numbers. If none fit, speak biblically without a citation rather than guessing.");
            foreach (var v in verses)
                sb.AppendLine($"- {v.Reference}: \"{v.Text}\"");
            return sb.ToString().Trim();
        }

        private async Task<string?> TryAskConfiguredAiAsync(Guid userId, string question, string language, string persona, IReadOnlyList<PastorBotMessageDto>? conversation, CancellationToken ct)
        {
            // No external API key needed — the configured ILlmProvider may be a
            // self-hosted model (Ollama / vLLM) or any OpenAI-compatible endpoint.
            if (!_llm.IsConfigured) return null;

            // System prompt + retrieved Scripture grounding (RAG-lite).
            var system = BuildSystemPrompt(language, persona);
            var verses = _scripture.FindRelevant(question, language, 3);
            var grounding = BuildScriptureGrounding(verses);
            if (grounding.Length > 0)
                system += "\n\n" + grounding;

            var request = new LlmRequest { Temperature = 0.6, MaxTokens = 700 };
            request.Messages.Add(LlmMessage.System(system));

            // Carry recent conversation turns for context.
            foreach (var message in (conversation ?? Array.Empty<PastorBotMessageDto>()).TakeLast(12))
            {
                var text = (message.Text ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(text)) continue;

                var role = string.Equals(message.Role, "pastor", StringComparison.OrdinalIgnoreCase)
                           || string.Equals(message.Role, "assistant", StringComparison.OrdinalIgnoreCase)
                    ? "assistant"
                    : "user";

                request.Messages.Add(new LlmMessage(role, text));
            }

            request.Messages.Add(LlmMessage.User(question));

            var result = await _llm.CompleteAsync(request, ct);
            if (!result.Success)
            {
                _logger.LogWarning("AI Counseller LLM call failed ({Provider}/{Model}): {Error}",
                    result.Provider, result.Model, result.Error);
                return null;
            }

            return result.Text;
        }

        private async Task<string?> TryAskConfiguredVisionAsync(Guid userId, string imageDataUrl, string note, string language, string persona, CancellationToken ct)
        {
            if (!_llm.IsConfigured) return null;
            if (!IsSupportedImageDataUrl(imageDataUrl)) return null;

            var request = new LlmVisionRequest
            {
                SystemPrompt = BuildReadMeSystemPrompt(language, persona),
                UserText = BuildReadMeVisionPrompt(note, language),
                ImageUrl = imageDataUrl,
                Temperature = 0.6,
                MaxTokens = 700
            };

            var result = await _llm.CompleteVisionAsync(request, ct);
            if (!result.Success)
            {
                // capability-unavailable just means the configured model is text-only;
                // that is expected for many self-hosted setups — fall back quietly.
                if (result.Error != "capability-unavailable")
                    _logger.LogWarning("AI Counseller vision call failed ({Provider}/{Model}): {Error}",
                        result.Provider, result.Model, result.Error);
                return null;
            }

            return result.Text;
        }

        private static bool IsSupportedImageDataUrl(string value) =>
            !string.IsNullOrWhiteSpace(value) &&
            (value.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase) ||
             value.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase) ||
             value.StartsWith("data:image/webp;base64,", StringComparison.OrdinalIgnoreCase));

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
