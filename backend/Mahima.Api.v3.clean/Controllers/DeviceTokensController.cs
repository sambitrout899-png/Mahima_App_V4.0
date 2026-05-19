using System;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/device-tokens")]
    public class DeviceTokensController : ControllerBase
    {
        private const string KeyPrefix = "DeviceToken:";
        private readonly MahimaDbContext _db;

        public DeviceTokensController(MahimaDbContext db)
        {
            _db = db;
        }

        public class RegisterDeviceTokenDto
        {
            public string Token { get; set; } = string.Empty;
            public string? Platform { get; set; }
            public string? AppVersion { get; set; }
            public string? UserId { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> Register([FromBody] RegisterDeviceTokenDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Token))
                return BadRequest("Device token is required.");

            var userId = CurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized();

            var tokenHash = Hash(dto.Token);
            var key = $"{KeyPrefix}{userId}:{tokenHash}";
            var value = JsonSerializer.Serialize(new
            {
                userId,
                token = dto.Token.Trim(),
                platform = string.IsNullOrWhiteSpace(dto.Platform) ? "mobile" : dto.Platform.Trim(),
                appVersion = string.IsNullOrWhiteSpace(dto.AppVersion) ? "unknown" : dto.AppVersion.Trim(),
                updatedAtUtc = DateTime.UtcNow
            });

            var existing = await _db.MinistryAutomationSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (existing == null)
            {
                _db.MinistryAutomationSettings.Add(new MinistryAutomationSetting
                {
                    Key = key,
                    Value = value,
                    UpdatedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                existing.Value = value;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return Ok(new { saved = true });
        }

        [HttpGet]
        [Authorize(Roles = "admin,ADMIN")]
        public async Task<IActionResult> List()
        {
            var rows = await _db.MinistryAutomationSettings
                .Where(s => s.Key.StartsWith(KeyPrefix))
                .OrderByDescending(s => s.UpdatedAtUtc)
                .ToListAsync();

            return Ok(rows.Select(s => new
            {
                id = s.Key,
                s.UpdatedAtUtc,
                token = MaskToken(ReadString(s.Value, "token")),
                platform = ReadString(s.Value, "platform"),
                appVersion = ReadString(s.Value, "appVersion"),
                userId = ReadString(s.Value, "userId")
            }));
        }

        private Guid CurrentUserId()
        {
            return Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;
        }

        private static string Hash(string value)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(value.Trim()));
            return Convert.ToHexString(bytes).ToLowerInvariant().Substring(0, 32);
        }

        private static string ReadString(string json, string property)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement.TryGetProperty(property, out var prop) ? prop.ToString() : "";
            }
            catch
            {
                return "";
            }
        }

        private static string MaskToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return "";
            return token.Length <= 12 ? "********" : $"{token.Substring(0, 6)}...{token.Substring(token.Length - 6)}";
        }
    }
}
