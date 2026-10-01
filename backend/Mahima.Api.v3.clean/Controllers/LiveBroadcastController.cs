using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Mahima.Api.v3.clean.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/live-broadcast")]
public sealed class LiveBroadcastController : ControllerBase
{
    private readonly LiveBroadcastService _service;
    public LiveBroadcastController(LiveBroadcastService service) => _service = service;

    [HttpGet("status")]
    public ActionResult<LiveBroadcastStatus> Status() => Ok(_service.GetStatus());

    [HttpGet("preflight")]
    public async Task<ActionResult<BroadcastPreflight>> Preflight(CancellationToken cancellationToken) =>
        Ok(await _service.PreflightAsync(cancellationToken));

    [HttpPost("start")]
    public ActionResult<LiveBroadcastStatus> Start([FromBody] LiveBroadcastStartRequest request)
    {
        try { return Ok(_service.Start(request)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPost("stop")]
    public ActionResult<LiveBroadcastStatus> Stop() => Ok(_service.Stop());

    [HttpPost("switch")]
    public async Task<ActionResult<LiveBroadcastStatus>> Switch([FromBody] LiveBroadcastSwitchRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _service.SwitchAsync(request, cancellationToken)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }
}
