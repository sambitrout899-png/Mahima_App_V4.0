using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/app-releases")]
    public class AppReleasesController : ControllerBase
    {
        private const long MaxApkBytes = 2L * 1024L * 1024L * 1024L;

        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;
        private readonly MahimaDbContext _db;
        private readonly ILogger<AppReleasesController> _logger;

        public AppReleasesController(
            IConfiguration config,
            IWebHostEnvironment env,
            MahimaDbContext db,
            ILogger<AppReleasesController> logger)
        {
            _config = config;
            _env = env;
            _db = db;
            _logger = logger;
        }

        [AllowAnonymous]
        [HttpGet("latest")]
        public IActionResult Latest()
        {
            var writableManifestPath = GetWritableVersionManifestPath();
            if (System.IO.File.Exists(writableManifestPath))
                return PhysicalFile(writableManifestPath, "application/json");

            var publicManifestPath = GetPublicVersionManifestPath();
            if (System.IO.File.Exists(publicManifestPath))
                return PhysicalFile(publicManifestPath, "application/json");

            var baseUrl = PublicBaseUrl();
            return Ok(new
            {
                latestVersion = _config["AppReleases:DefaultVersion"] ?? "0.1.0",
                minSupportedVersion = _config["AppReleases:MinSupportedVersion"] ?? "0.1.0",
                message = "New version of the Mahima App is available - Please upgrade now",
                downloadPageUrl = $"{baseUrl}/#/app-downloads",
                android = new
                {
                    latestVersion = _config["AppReleases:DefaultVersion"] ?? "0.1.0",
                    minSupportedVersion = _config["AppReleases:MinSupportedVersion"] ?? "0.1.0",
                    build = "Latest APK",
                    apkUrl = $"{baseUrl}/downloads/mahima-app.apk",
                    downloadUrl = $"{baseUrl}/api/app-releases/android/download",
                    releaseDate = "Current"
                }
            });
        }


        [AllowAnonymous]
        [HttpGet("android/download")]
        public IActionResult DownloadAndroid()
        {
            var latestPath = FindLatestApkPath();
            if (string.IsNullOrWhiteSpace(latestPath) || !System.IO.File.Exists(latestPath))
                return NotFound("The Mahima Android APK has not been published yet.");

            Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
            Response.Headers["Pragma"] = "no-cache";
            Response.Headers["X-Content-Type-Options"] = "nosniff";
            return PhysicalFile(
                latestPath,
                "application/vnd.android.package-archive",
                "mahima-app.apk",
                enableRangeProcessing: true);
        }
        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("android")]
        [RequestSizeLimit(MaxApkBytes)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxApkBytes)]
        public async Task<IActionResult> UploadAndroid(
            [FromForm] IFormFile file,
            [FromForm] string version,
            [FromForm] string? build,
            [FromForm] string? minSupportedVersion,
            [FromForm] string? releaseNotes,
            [FromForm] bool forceUpgrade = false)
        {
            if (file == null || file.Length == 0)
                return BadRequest("APK file is required.");

            if (file.Length > MaxApkBytes)
                return BadRequest("APK is too large. Maximum size is 2 GB.");

            if (string.IsNullOrWhiteSpace(version))
                return BadRequest("Version is required.");

            var extension = Path.GetExtension(file.FileName);
            if (!extension.Equals(".apk", StringComparison.OrdinalIgnoreCase))
                return BadRequest("Only Android .apk files are allowed.");

            var downloadsRoot = GetWritableDownloadsRoot();
            var publicDownloadsRoot = GetPublicDownloadsRoot();

            var cleanVersion = CleanForFileName(version);
            var cleanBuild = CleanForFileName(string.IsNullOrWhiteSpace(build) ? DateTime.UtcNow.ToString("yyyyMMddHHmmss") : build);
            var versionedFileName = $"mahima-app-{cleanVersion}-{cleanBuild}.apk";
            var versionedPath = Path.Combine(downloadsRoot, versionedFileName);
            var latestPath = Path.Combine(downloadsRoot, "mahima-app.apk");
            var publicVersionedPath = Path.Combine(publicDownloadsRoot, versionedFileName);
            var publicLatestPath = Path.Combine(publicDownloadsRoot, "mahima-app.apk");
            var tempPath = Path.Combine(downloadsRoot, $".{Guid.NewGuid():N}.upload");

            try
            {
                await using (var stream = System.IO.File.Create(tempPath))
                {
                    await file.CopyToAsync(stream, HttpContext.RequestAborted);
                }

                System.IO.File.Move(tempPath, versionedPath, overwrite: true);
                System.IO.File.Copy(versionedPath, latestPath, overwrite: true);
                TryMirrorFile(versionedPath, publicVersionedPath);
                TryMirrorFile(latestPath, publicLatestPath);

                var now = DateTime.UtcNow;
                var baseUrl = PublicBaseUrl();
                var apkUrl = $"{baseUrl}/downloads/mahima-app.apk";
                var downloadUrl = $"{baseUrl}/api/app-releases/android/download";
                var versionedApkUrl = $"{baseUrl}/downloads/{Uri.EscapeDataString(versionedFileName)}";
                var normalizedMinVersion = string.IsNullOrWhiteSpace(minSupportedVersion) ? version : minSupportedVersion.Trim();
                var message = forceUpgrade
                    ? "A required Mahima App update is available - Please upgrade now"
                    : "New version of the Mahima App is available - Please upgrade now";

                var manifest = new
                {
                    latestVersion = version.Trim(),
                    minSupportedVersion = normalizedMinVersion,
                    message,
                    downloadPageUrl = $"{baseUrl}/#/app-downloads",
                    updatedAtUtc = now,
                    android = new
                    {
                        latestVersion = version.Trim(),
                        minSupportedVersion = normalizedMinVersion,
                        build = string.IsNullOrWhiteSpace(build) ? cleanBuild : build.Trim(),
                        releaseDate = now.ToString("yyyy-MM-dd"),
                        apkUrl,
                        downloadUrl,
                        versionedApkUrl,
                        fileName = "mahima-app.apk",
                        versionedFileName,
                        sizeBytes = file.Length,
                        forceUpgrade,
                        releaseNotes = releaseNotes ?? ""
                    },
                    ios = new
                    {
                        latestVersion = _config["AppReleases:IosVersion"] ?? version.Trim(),
                        minSupportedVersion = _config["AppReleases:IosMinSupportedVersion"] ?? normalizedMinVersion,
                        url = _config["AppReleases:IosUrl"] ?? $"{baseUrl}/#/app-downloads"
                    }
                };

                var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
                var json = JsonSerializer.Serialize(manifest, jsonOptions);
                await System.IO.File.WriteAllTextAsync(GetWritableVersionManifestPath(), json, HttpContext.RequestAborted);

                try
                {
                    await System.IO.File.WriteAllTextAsync(GetPublicVersionManifestPath(), json, HttpContext.RequestAborted);
                    await System.IO.File.WriteAllTextAsync(Path.Combine(publicDownloadsRoot, "app-release-manifest.json"), json, HttpContext.RequestAborted);
                }
                catch (Exception manifestEx)
                {
                    _logger.LogWarning(manifestEx, "Could not mirror app release manifest to public web root. API manifest was saved.");
                }

                _db.AuditLogs.Add(new AuditLog
                {
                    ActorId = CurrentUserId(),
                    Action = "UploadAndroidApk",
                    EntityType = "AppRelease",
                    EntityId = version.Trim(),
                    Details = $"Uploaded {versionedFileName}; durable latest updated and public /downloads/mahima-app.apk mirror refreshed",
                    CreatedAt = now
                });
                await _db.SaveChangesAsync(HttpContext.RequestAborted);

                return Ok(manifest);
            }
            catch (Exception ex)
            {
                try
                {
                    if (System.IO.File.Exists(tempPath)) System.IO.File.Delete(tempPath);
                }
                catch {}

                _logger.LogError(ex, "Failed to upload Android APK {FileName}", file.FileName);
                return StatusCode(500, "Could not upload Android APK.");
            }
        }

        private Guid? CurrentUserId()
        {
            var raw =
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub") ??
                User.FindFirstValue("nameid");
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        private string GetPublicRoot()
        {
            var configured =
                _config["AppReleases:PublicRoot"] ??
                Environment.GetEnvironmentVariable("MAHIMA_WEB_ROOT");

            if (string.IsNullOrWhiteSpace(configured))
            {
                configured = OperatingSystem.IsLinux()
                    ? "/var/www/mahima"
                    : (_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"));
            }

            Directory.CreateDirectory(configured);
            return Path.GetFullPath(configured);
        }

        private string GetPublicVersionManifestPath() =>
            Path.Combine(GetPublicRoot(), "app-version.json");

        private string GetPublicDownloadsRoot()
        {
            var root = Path.Combine(GetPublicRoot(), "downloads");
            Directory.CreateDirectory(root);
            return root;
        }

        private string GetWritableReleaseRoot()
        {
            var configured =
                _config["AppReleases:WritableRoot"] ??
                Environment.GetEnvironmentVariable("MAHIMA_RELEASE_ROOT");

            if (string.IsNullOrWhiteSpace(configured))
            {
                configured = OperatingSystem.IsLinux()
                    ? "/var/lib/mahima/app-releases"
                    : Path.Combine(_env.ContentRootPath, "App_Data", "app-releases");
            }

            Directory.CreateDirectory(configured);
            return Path.GetFullPath(configured);
        }

        private string GetWritableVersionManifestPath() =>
            Path.Combine(GetWritableReleaseRoot(), "app-version.json");

        private string GetWritableDownloadsRoot()
        {
            var root = Path.Combine(GetWritableReleaseRoot(), "downloads");
            Directory.CreateDirectory(root);
            return root;
        }

        private string? FindLatestApkPath()
        {
            var publicDownloadsRoot = GetPublicDownloadsRoot();
            var writableDownloadsRoot = GetWritableDownloadsRoot();
            var publicLatestPath = Path.Combine(publicDownloadsRoot, "mahima-app.apk");
            var writableLatestPath = Path.Combine(writableDownloadsRoot, "mahima-app.apk");

            if (System.IO.File.Exists(publicLatestPath))
                return publicLatestPath;

            if (System.IO.File.Exists(writableLatestPath))
            {
                TryMirrorFile(writableLatestPath, publicLatestPath);
                return writableLatestPath;
            }

            var manifestVersionedFile = TryReadVersionedApkFileName(GetWritableVersionManifestPath()) ??
                                        TryReadVersionedApkFileName(GetPublicVersionManifestPath());
            if (!string.IsNullOrWhiteSpace(manifestVersionedFile))
            {
                var writableVersionedPath = Path.Combine(writableDownloadsRoot, manifestVersionedFile);
                var publicVersionedPath = Path.Combine(publicDownloadsRoot, manifestVersionedFile);

                if (System.IO.File.Exists(writableVersionedPath))
                {
                    TryMirrorFile(writableVersionedPath, publicVersionedPath);
                    TryMirrorFile(writableVersionedPath, publicLatestPath);
                    return writableVersionedPath;
                }

                if (System.IO.File.Exists(publicVersionedPath))
                {
                    TryMirrorFile(publicVersionedPath, publicLatestPath);
                    return publicVersionedPath;
                }
            }

            return null;
        }

        private string? TryReadVersionedApkFileName(string manifestPath)
        {
            try
            {
                if (!System.IO.File.Exists(manifestPath)) return null;

                using var stream = System.IO.File.OpenRead(manifestPath);
                using var document = JsonDocument.Parse(stream);
                if (!document.RootElement.TryGetProperty("android", out var android)) return null;

                if (android.TryGetProperty("versionedFileName", out var versionedFileName))
                    return versionedFileName.GetString();

                if (android.TryGetProperty("fileName", out var fileName))
                    return fileName.GetString();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not read APK file name from app release manifest {ManifestPath}", manifestPath);
            }

            return null;
        }

        private void TryMirrorFile(string sourcePath, string destinationPath)
        {
            try
            {
                var destinationDirectory = Path.GetDirectoryName(destinationPath);
                if (!string.IsNullOrWhiteSpace(destinationDirectory))
                    Directory.CreateDirectory(destinationDirectory);

                if (System.IO.File.Exists(sourcePath))
                    System.IO.File.Copy(sourcePath, destinationPath, overwrite: true);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not mirror file {SourcePath} to {DestinationPath}", sourcePath, destinationPath);
            }
        }

        private string PublicBaseUrl()
        {
            var configured =
                _config["AppReleases:PublicBaseUrl"] ??
                Environment.GetEnvironmentVariable("MAHIMA_PUBLIC_BASE_URL");
            if (!string.IsNullOrWhiteSpace(configured))
                return configured.TrimEnd('/');

            var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
            var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
            return $"{scheme}://{host}".TrimEnd('/');
        }

        private static string CleanForFileName(string value)
        {
            var clean = string.Join("-", (value ?? "").Trim().Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries));
            clean = clean.Replace(' ', '-').Replace('/', '-').Replace('\\', '-');
            return string.IsNullOrWhiteSpace(clean) ? DateTime.UtcNow.ToString("yyyyMMddHHmmss") : clean;
        }
    }
}

