using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.services.Marriage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MarriageController : ControllerBase
    {
        private readonly IMarriageService _service;

        public MarriageController(IMarriageService service)
        {
            _service = service;
        }

        // ---- Step 1: Anyone can raise a marriage application ----
        [HttpPost("applications")]
        [AllowAnonymous] // change to [Authorize] if you prefer
        public async Task<ActionResult<MarriageApplicationSummaryDto>> Create(
            [FromBody] CreateMarriageApplicationDto dto,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _service.CreateAsync(dto, ct);
            return Ok(result);
        }

        // ---- Admin view: filter by status: PendingReview / Approved / Scheduled / Completed ----
        [HttpGet("admin/applications")]
        [Authorize]
        public async Task<ActionResult<IReadOnlyList<MarriageApplicationSummaryDto>>> Get(
            [FromQuery] string? status,
            CancellationToken ct)
        {
            var list = await _service.GetAsync(status, ct);
            return Ok(list);
        }

        // ---- Step 2: Approve + generate token ----
        [HttpPost("admin/applications/{id:guid}/approve")]
        [Authorize]
        public async Task<ActionResult<MarriageApplicationSummaryDto>> Approve(
            Guid id,
            [FromBody] ApproveMarriageDto dto,
            CancellationToken ct)
        {
            string? approverId =
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub");

            var result = await _service.ApproveAsync(id, dto, approverId, ct);
            return Ok(result);
        }

        // ---- Step 3: Schedule ceremony ----
        [HttpPost("admin/applications/{id:guid}/schedule")]
        [Authorize]
        public async Task<ActionResult<MarriageApplicationSummaryDto>> Schedule(
            Guid id,
            [FromBody] ScheduleMarriageDto dto,
            CancellationToken ct)
        {
            var result = await _service.ScheduleAsync(id, dto, ct);
            return Ok(result);
        }

        // ---- Step 4: Mark completed ----
        [HttpPost("admin/applications/{id:guid}/complete")]
        [Authorize]
        public async Task<IActionResult> Complete(
            Guid id,
            [FromBody] CompleteMarriageDto dto,
            CancellationToken ct)
        {
            await _service.CompleteAsync(id, dto, ct);
            return NoContent();
        }

        // ---- Admin delete existing record ----
        [HttpDelete("admin/applications/{id:guid}")]
        [Authorize(Roles = "ADMIN,Admin,admin")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            await _service.DeleteAsync(id, ct);
            return NoContent();
        }
    }
}
