using System.Security.Claims;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Mahima.Api.v3.clean.Controllers;

[ApiController]
[Route("api/live-broadcast/youtube")]
public sealed class YouTubeLiveAuthController : ControllerBase
{
    private readonly YouTubeLiveAuthService _service;
    private readonly IConfiguration _configuration;
    public YouTubeLiveAuthController(YouTubeLiveAuthService service, IConfiguration configuration) { _service = service; _configuration = configuration; }

    [Authorize(Roles = "admin")]
    [HttpGet("status")]
    public ActionResult<YouTubeConnectionStatus> Status() => Ok(_service.Status(UserId));

    [Authorize(Roles = "admin")]
    [HttpPost("authorize")]
    public IActionResult AuthorizeChannel()
    {
        try { return Ok(new { authorizationUrl = _service.CreateAuthorizationUrl(UserId) }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [AllowAnonymous]
    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string? state, [FromQuery] string? code, [FromQuery] string? error, CancellationToken cancellationToken)
    {
        var appUrl = (_configuration["App:PublicUrl"] ?? "/").TrimEnd('/') + "/home/admin/live-broadcast";
        if (!string.IsNullOrWhiteSpace(error)) return Redirect(appUrl + "?youtube=denied");
        if (string.IsNullOrWhiteSpace(state) || string.IsNullOrWhiteSpace(code)) return Redirect(appUrl + "?youtube=invalid");
        try { await _service.CompleteAsync(state, code, cancellationToken); return Redirect(appUrl + "?youtube=connected"); }
        catch { return Redirect(appUrl + "?youtube=failed"); }
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("connection")]
    public IActionResult Disconnect() { _service.Disconnect(UserId); return NoContent(); }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
}
