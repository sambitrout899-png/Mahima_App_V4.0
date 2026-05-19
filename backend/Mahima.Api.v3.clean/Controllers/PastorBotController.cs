using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Extensions;
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/pastorbot")]
    public class PastorBotController : ControllerBase
    {
        private readonly IPastorBotService _pastorBot;
        private readonly IHubContext<ChatHub> _hub;
        private readonly IWebHostEnvironment _env;
        private readonly MahimaDbContext _db;

        public PastorBotController(IPastorBotService pastorBot, IHubContext<ChatHub> hub, IWebHostEnvironment env, MahimaDbContext db)
        {
            _pastorBot = pastorBot;
            _hub = hub;
            _env = env;
            _db = db;
        }

        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] PastorBotAskDto dto)
        {
            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();
            if (!await CanUsePastorAsync()) return Forbid();

            var reply = await _pastorBot.AskAsync(userId, dto.Question, dto.SendToJaiMasih, dto.Language, dto.Persona, dto.Conversation, HttpContext.RequestAborted);
            if (reply.ChatId.HasValue)
            {
                await _hub.Clients.All.SendAsync("ChatCreated", new { id = reply.ChatId.Value, name = PastorBotService.JaiMasihChatName, isGroup = true });
            }

            return Ok(reply);
        }

        [HttpPost("readme")]
        [RequestSizeLimit(7_000_000)]
        public async Task<IActionResult> ReadMe([FromBody] PastorBotReadMeDto dto)
        {
            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();
            if (!await CanUsePastorAsync()) return Forbid();

            if (dto == null || !dto.ConsentAccepted)
                return BadRequest("Consent is required before using ReadMe.");

            if (string.IsNullOrWhiteSpace(dto.ImageDataUrl))
                return BadRequest("A camera image is required.");

            var image = dto.ImageDataUrl.Trim();
            var supported =
                image.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase) ||
                image.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase) ||
                image.StartsWith("data:image/webp;base64,", StringComparison.OrdinalIgnoreCase);

            if (!supported)
                return BadRequest("ReadMe supports JPEG, PNG, or WEBP camera images.");

            var reply = await _pastorBot.ReadMeAsync(
                userId,
                image,
                dto.Note,
                dto.Language,
                dto.Persona,
                HttpContext.RequestAborted);

            return Ok(reply);
        }

        [HttpPost("ensure-jai-masih")]
        public async Task<IActionResult> EnsureJaiMasih()
        {
            if (!await CanUsePastorAsync()) return Forbid();

            var chat = await _pastorBot.EnsureJaiMasihChatAsync(HttpContext.RequestAborted);
            return Ok(new { chat.Id, chat.Name, chat.IsGroup });
        }

        [HttpPost("voice-sample")]
        [Authorize(Roles = "admin,ADMIN")]
        [RequestSizeLimit(25_000_000)]
        public async Task<IActionResult> UploadVoiceSample([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Audio file is required.");

            var allowed = new[] { ".wav", ".mp3", ".m4a", ".webm", ".ogg" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext))
                return BadRequest("Upload a WAV, MP3, M4A, WEBM, or OGG voice sample.");

            var root = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(root, "uploads", "pastor-voice");
            Directory.CreateDirectory(dir);

            var fileName = $"pastor_voice_sample{ext}";
            var fullPath = Path.Combine(dir, fileName);
            await using (var stream = System.IO.File.Create(fullPath))
            {
                await file.CopyToAsync(stream, HttpContext.RequestAborted);
            }

            return Ok(new
            {
                message = "Voice sample stored. Use it only with explicit consent and label generated audio as AI-created.",
                url = $"/uploads/pastor-voice/{fileName}"
            });
        }

        [HttpGet("voice-sample")]
        [Authorize(Roles = "admin,ADMIN")]
        public IActionResult GetVoiceSample()
        {
            var root = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(root, "uploads", "pastor-voice");
            if (!Directory.Exists(dir)) return NotFound();

            var file = Directory.GetFiles(dir, "pastor_voice_sample.*").FirstOrDefault();
            if (file == null) return NotFound();

            return Ok(new { url = $"/uploads/pastor-voice/{Path.GetFileName(file)}" });
        }

        private async Task<bool> CanUsePastorAsync()
        {
            if (User.IsInRole("admin") || User.IsInRole("ADMIN")) return true;

            var roleName = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
            if (string.IsNullOrWhiteSpace(roleName)) return false;

            var normalizedRole = roleName.Trim().ToLower();
            var roleIds = await _db.Roles
                .AsNoTracking()
                .Where(r => r.Name.ToLower() == normalizedRole)
                .Select(r => r.Id)
                .ToListAsync(HttpContext.RequestAborted);

            if (roleIds.Count == 0) return false;

            return await _db.RolePermissions
                .AsNoTracking()
                .AnyAsync(rp => roleIds.Contains(rp.RoleId) && rp.PageKey.ToUpper() == "PASTOR", HttpContext.RequestAborted);
        }
    }
}
