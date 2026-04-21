using Mahima.Api.v3.clean.Data;
﻿// Mahima.Api/Services/ChatService.Full.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Models;

namespace Mahima.Api.v3.clean.Services
{
    public class ChatService : IChatService
    {
        private readonly MahimaDbContext _db;
        private readonly ILogger<ChatService> _logger;

        public ChatService(MahimaDbContext db, ILogger<ChatService> logger)
        {
            _db = db ?? throw new ArgumentNullException(nameof(db));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        // ---------- helpers ----------
        private async Task<bool> IsUserParticipantAsync(Guid chatId, Guid userId)
        {
            return await _db.ChatMembers
                .AsNoTracking()
                .AnyAsync(cm => cm.ChatId == chatId && cm.UserId == userId);
        }

        private Task<bool> IsUserAdminAsync(Guid userId)
        {
            // Implement your own admin check here if needed.
            return Task.FromResult(false);
        }

        // ---------- IChatService implementation ----------

        public async Task<IEnumerable<ChatSummaryDto>> GetUserChatsAsync(Guid userId)
        {
            // get chat ids for the user (ChatId is Guid)
            var chatIds = await _db.ChatMembers
                .AsNoTracking()
                .Where(cm => cm.UserId == userId)
                .Select(cm => cm.ChatId)
                .ToListAsync();

            if (chatIds == null || chatIds.Count == 0)
                return Array.Empty<ChatSummaryDto>();

            var chats = await _db.Chats
                .AsNoTracking()
                .Where(c => chatIds.Contains(c.Id))
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            var result = new List<ChatSummaryDto>(chats.Count);
            foreach (var c in chats)
            {
                // last message (Message.Id is Guid)
                var lastMsg = await _db.Messages
                    .AsNoTracking()
                    .Where(m => m.ChatId == c.Id)
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => new MessageDto(
                        m.Id,            // Guid
                        m.ChatId,        // Guid
                        m.SenderId,      // Guid
                        m.Content,
                        m.CreatedAt))
                    .FirstOrDefaultAsync();

                // unread count: compare MessageRead.MessageId (Guid) with Message.Id (Guid)
                var unreadCount = await _db.Messages
                    .AsNoTracking()
                    .Where(m => m.ChatId == c.Id)
                    .Where(m => !_db.MessageReads.Any(r => r.MessageId == m.Id && r.UserId == userId))
                    .CountAsync();

                result.Add(new ChatSummaryDto(c.Id, c.Name, c.IsGroup, lastMsg, unreadCount));
            }

            return result;
        }

        public async Task<PaginatedResult<MessageDto>> GetMessagesAsync(Guid chatId, int page = 1, int size = 50)
        {
            if (page < 1) page = 1;
            if (size < 1) size = 50;

            var baseQuery = _db.Messages
                .AsNoTracking()
                .Where(m => m.ChatId == chatId)
                .OrderByDescending(m => m.CreatedAt);

            var total = await baseQuery.CountAsync();

            var items = await baseQuery
                .Skip((page - 1) * size)
                .Take(size)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new MessageDto(
                    m.Id,          // Guid
                    m.ChatId,      // Guid
                    m.SenderId,    // Guid
                    m.Content,
                    m.CreatedAt))
                .ToListAsync();

            return new PaginatedResult<MessageDto>(items, total, page, size);
        }

        public async Task<MessageDto> AddMessageAsync(
            Guid chatId,
            Guid senderId,
            string content,
            string contentType = "text",
            string? attachmentUrl = null,
            List<AttachmentDto>? attachments = null)
        {
            // Ensure the sender is a member of the chat
            var isMember = await _db.ChatMembers
                .AsNoTracking()
                .AnyAsync(cm => cm.ChatId == chatId && cm.UserId == senderId);

            if (!isMember)
                throw new UnauthorizedAccessException("User is not a member of the chat.");

            var msg = new Message
            {
                ChatId = chatId,        // Guid
                SenderId = senderId,    // Guid
                Content = content ?? string.Empty,
                ContentType = contentType ?? "text",
                AttachmentUrl = attachmentUrl,
                CreatedAt = DateTime.UtcNow
            };

            _db.Messages.Add(msg);
            await _db.SaveChangesAsync(); // populates msg.Id (Guid)

            // Build DTO via object initializer to avoid ctor arity mismatches
            var dto = new MessageDto(
                msg.Id,
                msg.ChatId,
                msg.SenderId,
                msg.Content,
                msg.CreatedAt)
            {
                ContentType = msg.ContentType ?? "text",
                AttachmentUrl = msg.AttachmentUrl,
                Attachments = attachments
            };

            return dto;
        }

        // Matches IChatService exactly (Guid, Guid, Guid)
        public async Task MarkReadAsync(Guid chatId, Guid userId, Guid lastMessageId)
        {
            // lastMessageId corresponds to Message.Id (Guid)
            var lastMessage = await _db.Messages
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == lastMessageId && m.ChatId == chatId);

            if (lastMessage == null)
            {
                _logger.LogWarning("MarkRead called with unknown message id {LastMessageId} for chat {ChatId}", lastMessageId, chatId);
                return;
            }

            // collect message ids up to timestamp of lastMessage
            var messagesToMark = await _db.Messages
                .Where(m => m.ChatId == chatId && m.CreatedAt <= lastMessage.CreatedAt)
                .Select(m => m.Id) // Guid
                .ToListAsync();

            if (messagesToMark == null || messagesToMark.Count == 0)
                return;

            var now = DateTime.UtcNow;
            var toInsert = new List<MessageRead>();

            foreach (var messageId in messagesToMark)
            {
                var exists = await _db.MessageReads.AnyAsync(r => r.MessageId == messageId && r.UserId == userId);
                if (!exists)
                {
                    toInsert.Add(new MessageRead { MessageId = messageId, UserId = userId, ReadAt = now });
                }
            }

            if (toInsert.Count > 0)
            {
                _db.MessageReads.AddRange(toInsert);
                await _db.SaveChangesAsync();
            }
        }

        public async Task<Chat> CreateOrGetDirectChatAsync(Guid userId, string usernameOrEmail)
        {
            if (string.IsNullOrWhiteSpace(usernameOrEmail))
                throw new ArgumentException("usernameOrEmail is required", nameof(usernameOrEmail));

            var normalized = usernameOrEmail.Trim().ToLowerInvariant();

            var other = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u =>
                    (u.Username != null && u.Username.ToLower() == normalized) ||
                    (u.Email != null && u.Email.ToLower() == normalized));

            if (other == null)
                throw new ArgumentException($"User not found: {usernameOrEmail}");

            if (other.Id == userId)
                throw new ArgumentException("Cannot create a chat with yourself.");

            var existingChat = await _db.Chats
                .Include(c => c.Members)
                .Where(c => !c.IsGroup)
                .Where(c => c.Members.Any(cm => cm.UserId == userId))
                .Where(c => c.Members.Any(cm => cm.UserId == other.Id))
                .FirstOrDefaultAsync();

            if (existingChat != null)
            {
                if (string.IsNullOrWhiteSpace(existingChat.Name))
                {
                    existingChat.Name = $"{other.Username ?? other.Email} - {existingChat.CreatedAt:yyyy-MM-dd HH:mm}";
                    try
                    {
                        _db.Chats.Update(existingChat);
                        await _db.SaveChangesAsync();
                    }
                    catch (Exception saveEx)
                    {
                        _logger.LogWarning(saveEx, "Failed to persist generated name for existing chat {ChatId}", existingChat.Id);
                    }
                }
                return existingChat;
            }

            var chat = new Chat
            {
                Name = $"{other.Username ?? other.Email}",
                IsGroup = false,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _db.Chats.Add(chat);
            await _db.SaveChangesAsync(); // chat.Id (Guid) populated

            var members = new[]
            {
                new ChatMember { ChatId = chat.Id, UserId = userId, Role = "member", JoinedAt = DateTime.UtcNow },
                new ChatMember { ChatId = chat.Id, UserId = other.Id, Role = "member", JoinedAt = DateTime.UtcNow }
            };

            _db.ChatMembers.AddRange(members);
            await _db.SaveChangesAsync();
            return chat;
        }

        public async Task<Chat> CreateOrGetDirectChatAsync(Guid userA, Guid userB)
        {
            if (userA == Guid.Empty || userB == Guid.Empty)
                throw new ArgumentException("User ids are required");

            if (userA == userB)
                throw new ArgumentException("Cannot create a chat with yourself.");

            var smaller = userA.CompareTo(userB) <= 0 ? userA : userB;
            var larger  = userA.CompareTo(userB) <= 0 ? userB : userA;

            var existing = await _db.Chats
                .Include(c => c.Members)
                .Where(c => !c.IsGroup)
                .Where(c => c.Members.Count == 2 &&
                            c.Members.Any(m => m.UserId == smaller) &&
                            c.Members.Any(m => m.UserId == larger))
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                if (string.IsNullOrWhiteSpace(existing.Name))
                {
                    try
                    {
                        var otherMember = existing.Members.FirstOrDefault(m => m.UserId != userA);
                        if (otherMember != null)
                        {
                            var otherUser = await _db.Users.AsNoTracking()
                                .FirstOrDefaultAsync(u => u.Id == otherMember.UserId);

                            // Avoid ternary parsing edge cases
                            var generatedName = otherUser?.Username ?? otherUser?.Email
                                ?? $"Direct:{existing.CreatedAt:yyyy-MM-dd}";
                            existing.Name = generatedName;
                            _db.Chats.Update(existing);
                            await _db.SaveChangesAsync();
                        }
                    }
                    catch { /* non-fatal */ }
                }

                return existing;
            }

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync();
                try
                {
                    var chat = new Chat
                    {
                        Name = null,
                        IsGroup = false,
                        CreatedBy = userA,
                        CreatedAt = DateTime.UtcNow
                    };

                    _db.Chats.Add(chat);
                    await _db.SaveChangesAsync(); // chat.Id populated

                    var members = new[]
                    {
                        new ChatMember { ChatId = chat.Id, UserId = userA, Role = "member", JoinedAt = DateTime.UtcNow },
                        new ChatMember { ChatId = chat.Id, UserId = userB, Role = "member", JoinedAt = DateTime.UtcNow }
                    };

                    _db.ChatMembers.AddRange(members);
                    await _db.SaveChangesAsync();

                    await tx.CommitAsync();

                    return chat;
                }
                catch
                {
                    try { await tx.RollbackAsync(); } catch { }
                    throw;
                }
            });
        }

        public async Task<IEnumerable<Guid>> GetChatMemberIdsAsync(Guid chatId)
        {
            var list = await _db.ChatMembers
                .AsNoTracking()
                .Where(cm => cm.ChatId == chatId)
                .Select(cm => cm.UserId)
                .ToListAsync();

            return list;
        }

        public async Task<Chat> CreateGroupChatAsync(Guid userId, string name, Guid[] memberIds)
        {
            var chat = new Chat
            {
                Name = name,
                IsGroup = true,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _db.Chats.Add(chat);
            await _db.SaveChangesAsync();

            // Replace collection-initializer (can cause parse errors in some contexts)
            var ids = new HashSet<Guid>(memberIds ?? Array.Empty<Guid>());
            ids.Add(userId);

            var members = ids.Select(id => new ChatMember
            {
                ChatId = chat.Id,
                UserId = id,
                Role = id == userId ? "admin" : "member",
                JoinedAt = DateTime.UtcNow
            }).ToList();

            _db.ChatMembers.AddRange(members);
            await _db.SaveChangesAsync();

            return chat;
        }

        public async Task DeleteChatAsync(Guid chatId, Guid requestedBy)
        {
            var isParticipant = await IsUserParticipantAsync(chatId, requestedBy);
            var isAdmin = await IsUserAdminAsync(requestedBy);

            var chat = await _db.Chats.FirstOrDefaultAsync(c => c.Id == chatId);
            if (chat == null)
                throw new ArgumentException("Chat not found", nameof(chatId));

            if (!isParticipant && !isAdmin && chat.CreatedBy != requestedBy)
                throw new UnauthorizedAccessException("User is not allowed to delete this chat.");

            var strategy = _db.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync();
                try
                {
                    // 1) fetch message ids for the chat (Guid)
                    var messageIds = await _db.Messages
                        .Where(m => m.ChatId == chatId)
                        .Select(m => m.Id)
                        .ToListAsync();

                    if (messageIds != null && messageIds.Count > 0)
                    {
                        var reads = _db.MessageReads.Where(r => messageIds.Contains(r.MessageId));
                        _db.MessageReads.RemoveRange(reads);
                    }

                    // 2) Delete messages
                    var messages = _db.Messages.Where(m => m.ChatId == chatId);
                    _db.Messages.RemoveRange(messages);

                    // 3) Delete chat members
                    var members = _db.ChatMembers.Where(cm => cm.ChatId == chatId);
                    _db.ChatMembers.RemoveRange(members);

                    // 4) Finally delete the chat
                    _db.Chats.Remove(chat);

                    await _db.SaveChangesAsync();
                    await tx.CommitAsync();
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task SoftDeleteChatAsync(Guid chatId, Guid requestedBy)
        {
            var isParticipant = await IsUserParticipantAsync(chatId, requestedBy);
            var isAdmin = await IsUserAdminAsync(requestedBy);

            var chat = await _db.Chats.FirstOrDefaultAsync(c => c.Id == chatId);
            if (chat == null)
                throw new ArgumentException("Chat not found", nameof(chatId));

            if (!isParticipant && !isAdmin && chat.CreatedBy != requestedBy)
                throw new UnauthorizedAccessException("User is not allowed to delete this chat.");

            var chatType = typeof(Chat);
            var deletedAtProp = chatType.GetProperty("DeletedAt");
            var deletedByProp = chatType.GetProperty("DeletedBy");

            if (deletedAtProp == null || deletedByProp == null)
            {
                await DeleteChatAsync(chatId, requestedBy);
                return;
            }

            deletedAtProp.SetValue(chat, DateTime.UtcNow);
            deletedByProp.SetValue(chat, requestedBy);
            _db.Chats.Update(chat);
            await _db.SaveChangesAsync();
        }
    }
}
