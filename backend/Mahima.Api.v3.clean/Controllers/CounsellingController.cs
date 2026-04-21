using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.services.Counselling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CounsellingController : ControllerBase
    {
        private readonly ICounsellingService _service;

        public CounsellingController(ICounsellingService service)
        {
            _service = service;
        }

        // Step 1 – raise request (public or auth, your choice)
        [HttpPost("requests")]
        [AllowAnonymous] // change to [Authorize] if you want only logged-in users
        public async Task<ActionResult<CounsellingSessionSummaryDto>> CreateRequest(
            [FromBody] CreateCounsellingRequestDto dto,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _service.CreateRequestAsync(dto, ct);
            return Ok(result);
        }

        // List sessions by status for staff/admin
        [HttpGet("admin/sessions")]
        [Authorize]
        public async Task<ActionResult<IReadOnlyList<CounsellingSessionSummaryDto>>> GetSessions(
            [FromQuery] string? status,
            CancellationToken ct)
        {
            var list = await _service.GetSessionsAsync(status, ct);
            return Ok(list);
        }

        // Step 2 – schedule and token
        [HttpPost("admin/sessions/{sessionId:guid}/schedule")]
        [Authorize]
        public async Task<ActionResult<CounsellingSessionSummaryDto>> Schedule(
            Guid sessionId,
            [FromBody] ScheduleSessionDto dto,
            CancellationToken ct)
        {
            var result = await _service.ScheduleSessionAsync(sessionId, dto, ct);
            return Ok(result);
        }

        // Step 3/4 – complete / escalate
        [HttpPost("admin/sessions/{sessionId:guid}/complete")]
        [Authorize]
        public async Task<IActionResult> Complete(
            Guid sessionId,
            [FromBody] CompleteSessionDto dto,
            CancellationToken ct)
        {
            await _service.CompleteSessionAsync(sessionId, dto, ct);
            return NoContent();
        }
    }
}
