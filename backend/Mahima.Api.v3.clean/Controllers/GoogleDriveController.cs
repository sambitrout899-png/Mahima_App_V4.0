using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Authorize(Roles = "admin,ADMIN")]
    [Route("api/google-drive")]
    public class GoogleDriveController : ControllerBase
    {
        private const string SettingsKey = "GoogleDriveSettings";
        private const string Mask = "********";
        private readonly MahimaDbContext _db;
        private readonly IDataProtector _protector;
        private readonly IHttpClientFactory _httpClientFactory;

        public GoogleDriveController(MahimaDbContext db, IDataProtectionProvider dataProtectionProvider, IHttpClientFactory httpClientFactory)
        {
            _db = db;
            _protector = dataProtectionProvider.CreateProtector("Mahima.GoogleDrive.Settings.v1");
            _httpClientFactory = httpClientFactory;
        }

        public class GoogleDriveSettingsDto
        {
            public string? ClientId { get; set; }
            public string? ClientSecret { get; set; }
            public string? RefreshToken { get; set; }
            public string? DefaultFolderId { get; set; }
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await ReadSettingsAsync();
            return Ok(ToClient(settings));
        }

        [HttpPut("settings")]
        public async Task<IActionResult> SaveSettings([FromBody] GoogleDriveSettingsDto dto)
        {
            var current = await ReadSettingsAsync();
            var settings = new GoogleDriveSettingsDto
            {
                ClientId = dto.ClientId?.Trim(),
                ClientSecret = IsMasked(dto.ClientSecret) ? current.ClientSecret : dto.ClientSecret,
                RefreshToken = IsMasked(dto.RefreshToken) ? current.RefreshToken : dto.RefreshToken,
                DefaultFolderId = dto.DefaultFolderId?.Trim()
            };

            await WriteSettingsAsync(settings);
            return Ok(ToClient(settings));
        }

        [HttpGet("files")]
        public async Task<IActionResult> ListFiles([FromQuery] string? folderId = null)
        {
            var settings = await ReadSettingsAsync();
            var tokenResult = await TryGetAccessTokenAsync(settings);
            if (!string.IsNullOrWhiteSpace(tokenResult.Error)) return BadRequest(tokenResult.Error);
            var accessToken = tokenResult.Token!;
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var folder = string.IsNullOrWhiteSpace(folderId) ? settings.DefaultFolderId : folderId;
            var q = string.IsNullOrWhiteSpace(folder)
                ? "trashed=false"
                : $"'{folder.Replace("'", "\\'")}' in parents and trashed=false";

            var url = "https://www.googleapis.com/drive/v3/files"
                + "?pageSize=50"
                + "&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)"
                + $"&q={Uri.EscapeDataString(q)}";

            using var res = await client.GetAsync(url);
            var body = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode) return StatusCode((int)res.StatusCode, body);
            return Content(body, "application/json");
        }

        [HttpPost("files")]
        public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string? folderId = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest("File is required.");

            var settings = await ReadSettingsAsync();
            var tokenResult = await TryGetAccessTokenAsync(settings);
            if (!string.IsNullOrWhiteSpace(tokenResult.Error)) return BadRequest(tokenResult.Error);
            var accessToken = tokenResult.Token!;
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var folder = string.IsNullOrWhiteSpace(folderId) ? settings.DefaultFolderId : folderId;
            var metadata = new Dictionary<string, object?>
            {
                ["name"] = file.FileName
            };
            if (!string.IsNullOrWhiteSpace(folder))
                metadata["parents"] = new[] { folder };

            using var multipart = new MultipartContent("related");
            multipart.Add(new StringContent(JsonSerializer.Serialize(metadata), Encoding.UTF8, "application/json"));

            using var stream = file.OpenReadStream();
            using var media = new StreamContent(stream);
            media.Headers.ContentType = new MediaTypeHeaderValue(string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType);
            multipart.Add(media);

            var url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink";
            using var res = await client.PostAsync(url, multipart);
            var body = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode) return StatusCode((int)res.StatusCode, body);
            return Content(body, "application/json");
        }

        [HttpGet("files/{fileId}/download")]
        public async Task<IActionResult> Download(string fileId)
        {
            if (string.IsNullOrWhiteSpace(fileId))
                return BadRequest("File id is required.");

            var settings = await ReadSettingsAsync();
            var tokenResult = await TryGetAccessTokenAsync(settings);
            if (!string.IsNullOrWhiteSpace(tokenResult.Error)) return BadRequest(tokenResult.Error);
            var accessToken = tokenResult.Token!;
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var metadataUrl = $"https://www.googleapis.com/drive/v3/files/{Uri.EscapeDataString(fileId)}?fields=name,mimeType";
            using var metaRes = await client.GetAsync(metadataUrl);
            var metaJson = await metaRes.Content.ReadAsStringAsync();
            if (!metaRes.IsSuccessStatusCode) return StatusCode((int)metaRes.StatusCode, metaJson);

            using var metaDoc = JsonDocument.Parse(metaJson);
            var name = metaDoc.RootElement.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "google-drive-file" : "google-drive-file";
            var mimeType = metaDoc.RootElement.TryGetProperty("mimeType", out var mimeProp) ? mimeProp.GetString() ?? "application/octet-stream" : "application/octet-stream";

            var downloadUrl = mimeType.StartsWith("application/vnd.google-apps.", StringComparison.OrdinalIgnoreCase)
                ? $"https://www.googleapis.com/drive/v3/files/{Uri.EscapeDataString(fileId)}/export?mimeType=application/pdf"
                : $"https://www.googleapis.com/drive/v3/files/{Uri.EscapeDataString(fileId)}?alt=media";

            using var res = await client.GetAsync(downloadUrl);
            var bytes = await res.Content.ReadAsByteArrayAsync();
            if (!res.IsSuccessStatusCode) return StatusCode((int)res.StatusCode, Encoding.UTF8.GetString(bytes));

            if (mimeType.StartsWith("application/vnd.google-apps.", StringComparison.OrdinalIgnoreCase))
            {
                name = name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? name : $"{name}.pdf";
                mimeType = "application/pdf";
            }

            return File(bytes, mimeType, name);
        }

        private async Task<string> GetAccessTokenAsync(GoogleDriveSettingsDto settings)
        {
            if (string.IsNullOrWhiteSpace(settings.ClientId) ||
                string.IsNullOrWhiteSpace(settings.ClientSecret) ||
                string.IsNullOrWhiteSpace(settings.RefreshToken))
            {
                throw new InvalidOperationException("Google Drive client id, client secret, and refresh token are required.");
            }

            var client = _httpClientFactory.CreateClient();
            using var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = settings.ClientId!,
                ["client_secret"] = settings.ClientSecret!,
                ["refresh_token"] = settings.RefreshToken!,
                ["grant_type"] = "refresh_token"
            });

            using var res = await client.PostAsync("https://oauth2.googleapis.com/token", form);
            var body = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
                throw new InvalidOperationException(body);

            using var doc = JsonDocument.Parse(body);
            return doc.RootElement.TryGetProperty("access_token", out var token)
                ? token.GetString() ?? throw new InvalidOperationException("Google token response did not contain access_token.")
                : throw new InvalidOperationException("Google token response did not contain access_token.");
        }

        private async Task<(string? Token, string? Error)> TryGetAccessTokenAsync(GoogleDriveSettingsDto settings)
        {
            try
            {
                return (await GetAccessTokenAsync(settings), null);
            }
            catch (Exception ex)
            {
                return (null, ex.Message);
            }
        }

        private async Task<GoogleDriveSettingsDto> ReadSettingsAsync()
        {
            var row = await _db.MinistryAutomationSettings.FirstOrDefaultAsync(s => s.Key == SettingsKey);
            if (row == null || string.IsNullOrWhiteSpace(row.Value))
                return new GoogleDriveSettingsDto();

            try
            {
                var stored = JsonSerializer.Deserialize<GoogleDriveSettingsDto>(row.Value, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                             ?? new GoogleDriveSettingsDto();
                stored.ClientSecret = Unprotect(stored.ClientSecret);
                stored.RefreshToken = Unprotect(stored.RefreshToken);
                return stored;
            }
            catch
            {
                return new GoogleDriveSettingsDto();
            }
        }

        private async Task WriteSettingsAsync(GoogleDriveSettingsDto settings)
        {
            var stored = new GoogleDriveSettingsDto
            {
                ClientId = settings.ClientId,
                ClientSecret = Protect(settings.ClientSecret),
                RefreshToken = Protect(settings.RefreshToken),
                DefaultFolderId = settings.DefaultFolderId
            };

            var json = JsonSerializer.Serialize(stored);
            var row = await _db.MinistryAutomationSettings.FirstOrDefaultAsync(s => s.Key == SettingsKey);
            if (row == null)
            {
                _db.MinistryAutomationSettings.Add(new MinistryAutomationSetting
                {
                    Key = SettingsKey,
                    Value = json,
                    UpdatedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                row.Value = json;
                row.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
        }

        private GoogleDriveSettingsDto ToClient(GoogleDriveSettingsDto settings)
        {
            return new GoogleDriveSettingsDto
            {
                ClientId = settings.ClientId,
                ClientSecret = string.IsNullOrWhiteSpace(settings.ClientSecret) ? "" : Mask,
                RefreshToken = string.IsNullOrWhiteSpace(settings.RefreshToken) ? "" : Mask,
                DefaultFolderId = settings.DefaultFolderId
            };
        }

        private string Protect(string? value) =>
            string.IsNullOrWhiteSpace(value) ? "" : _protector.Protect(value);

        private string Unprotect(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";
            try { return _protector.Unprotect(value); }
            catch { return value; }
        }

        private static bool IsMasked(string? value) =>
            string.IsNullOrWhiteSpace(value) || value.Trim() == Mask;
    }
}
