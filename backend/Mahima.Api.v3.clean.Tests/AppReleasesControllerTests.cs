using Mahima.Api.v3.clean.Controllers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Mahima.Api.v3.clean.Tests;

public sealed class AppReleasesControllerTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "mahima-releases-" + Guid.NewGuid().ToString("N"));

    public AppReleasesControllerTests() => Directory.CreateDirectory(_root);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void DownloadWorksWhenOtherStorageRootCannotBeCreated(bool usePublic)
    {
        var available = Path.Combine(_root, "available");
        var blocked = Path.Combine(_root, "file-blocks-directory");
        File.WriteAllText(blocked, "This is a file, so a directory cannot be created here.");
        var apk = WriteApk(available, "mahima-app.apk");
        var controller = CreateController(usePublic ? available : blocked, usePublic ? blocked : available);

        var result = Assert.IsType<PhysicalFileResult>(controller.DownloadAndroid());

        Assert.Equal(apk, result.FileName);
        Assert.Equal("mahima-app.apk", result.FileDownloadName);
        Assert.True(result.EnableRangeProcessing);
        Assert.Equal("application/vnd.android.package-archive", result.ContentType);
    }

    [Fact]
    public void MissingReleaseReturnsNotFoundWithoutCreatingDirectories()
    {
        var publicRoot = Path.Combine(_root, "public");
        var writableRoot = Path.Combine(_root, "writable");
        var controller = CreateController(publicRoot, writableRoot);

        Assert.IsType<NotFoundObjectResult>(controller.DownloadAndroid());
        Assert.IsType<OkObjectResult>(controller.Latest());
        Assert.False(Directory.Exists(publicRoot));
        Assert.False(Directory.Exists(writableRoot));
    }

    [Fact]
    public void VersionedFallbackDoesNotCreatePublicMirror()
    {
        var publicRoot = Path.Combine(_root, "public");
        var writableRoot = Path.Combine(_root, "writable");
        var apk = WriteApk(writableRoot, "mahima-app-2.apk");
        File.WriteAllText(Path.Combine(writableRoot, "app-version.json"),
            "{\"android\":{\"versionedFileName\":\"mahima-app-2.apk\"}}");
        var controller = CreateController(publicRoot, writableRoot);

        Assert.Equal(apk, Assert.IsType<PhysicalFileResult>(controller.DownloadAndroid()).FileName);
        Assert.False(Directory.Exists(publicRoot));
    }

    [Fact]
    public void LatestFallsBackToPublicManifestWhenWritableRootIsBlocked()
    {
        var publicRoot = Path.Combine(_root, "public");
        Directory.CreateDirectory(publicRoot);
        var manifest = Path.Combine(publicRoot, "app-version.json");
        File.WriteAllText(manifest, "{}");
        var blocked = Path.Combine(_root, "blocked");
        File.WriteAllText(blocked, "file");

        Assert.Equal(manifest, Assert.IsType<PhysicalFileResult>(CreateController(publicRoot, blocked).Latest()).FileName);
    }

    private string WriteApk(string root, string name)
    {
        Directory.CreateDirectory(Path.Combine(root, "downloads"));
        var path = Path.Combine(root, "downloads", name);
        File.WriteAllBytes(path, new byte[] { 0x50, 0x4b, 0x03, 0x04 });
        return path;
    }

    private AppReleasesController CreateController(string publicRoot, string writableRoot)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AppReleases:PublicRoot"] = publicRoot,
            ["AppReleases:WritableRoot"] = writableRoot,
            ["AppReleases:PublicBaseUrl"] = "https://example.test"
        }).Build();
        return new AppReleasesController(config, new TestEnvironment { ContentRootPath = _root }, null!,
            NullLogger<AppReleasesController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private sealed class TestEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Tests";
        public string EnvironmentName { get; set; } = "Testing";
        public string WebRootPath { get; set; } = "";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
