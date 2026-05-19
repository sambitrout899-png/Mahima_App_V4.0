using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UploadsController : ControllerBase
    {
        private static readonly HashSet<string> AllowedContentTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "audio/mpeg",
            "audio/mp4",
            "audio/ogg",
            "audio/webm",
            "audio/wav",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
            "application/zip"
        };

        private const long MaxBytes = 100L * 1024L * 1024L;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<UploadsController> _logger;

        public UploadsController(IConfiguration config, IWebHostEnvironment env, ILogger<UploadsController> logger)
        {
            _config = config ?? throw new ArgumentNullException(nameof(config));
            _env = env ?? throw new ArgumentNullException(nameof(env));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpPost]
        [RequestSizeLimit(MaxBytes)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxBytes)]
        public async Task<IActionResult> Upload([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("file is required.");

            if (file.Length > MaxBytes)
                return BadRequest("File too large. Maximum size is 100 MB.");

            var contentType = file.ContentType?.Trim() ?? "";
            if (!AllowedContentTypes.Contains(contentType))
                return BadRequest("Only image, video, audio, and document uploads are supported.");

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension))
                extension = contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ? ".jpg"
                    : contentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase) ? ".mp4"
                    : contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase) ? ".mp3"
                    : ".bin";

            extension = new string(extension.Where(ch => char.IsLetterOrDigit(ch) || ch == '.').ToArray());
            if (string.IsNullOrWhiteSpace(extension)) extension = ".bin";

            var uploadRoot = _config["Uploads:Root"]
                ?? Environment.GetEnvironmentVariable("MAHIMA_UPLOADS_ROOT");
            if (string.IsNullOrWhiteSpace(uploadRoot))
            {
                var linuxUploadRoot = "/var/www/mahima-uploads";
                if (OperatingSystem.IsLinux())
                {
                    uploadRoot = linuxUploadRoot;
                }
                else
                {
                    var webRoot = _env.WebRootPath;
                    if (string.IsNullOrWhiteSpace(webRoot))
                        webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
                    uploadRoot = Path.Combine(webRoot, "uploads");
                }
            }

            var relativeFolder = Path.Combine("chat", DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"));
            var targetFolder = Path.Combine(uploadRoot, relativeFolder);
            Directory.CreateDirectory(targetFolder);

            var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var fullPath = Path.Combine(targetFolder, fileName);

            try
            {
                await using var stream = System.IO.File.Create(fullPath);
                await file.CopyToAsync(stream);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Chat upload failed for {FileName}", file.FileName);
                return StatusCode(StatusCodes.Status500InternalServerError, "Upload failed.");
            }

            var publicPath = "/uploads/" + Path.Combine(relativeFolder, fileName).Replace('\\', '/');
            var absoluteUrl = $"{Request.Scheme}://{Request.Host}{publicPath}";

            return Ok(new
            {
                url = publicPath,
                absoluteUrl,
                contentType,
                size = file.Length,
                fileName
            });
        }
    }
}
