using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MeetingsController : ControllerBase
    {
        private readonly MahimaDbContext _db;
        private readonly ILogger<MeetingsController> _logger;
        private readonly ITenantContextService _tenantContext;
        private static readonly Guid RootTenantId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public MeetingsController(MahimaDbContext db, ILogger<MeetingsController> logger, ITenantContextService tenantContext)
        {
            _db = db;
            _logger = logger;
            _tenantContext = tenantContext;
        }

        private async Task<Guid> GetCurrentTenantIdAsync()
        {
            var tenant = await _tenantContext.GetCurrentTenantAsync(HttpContext.RequestAborted);
            return tenant?.Id ?? RootTenantId;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var tenantId = await GetCurrentTenantIdAsync();
                var meetings = await _db.Meetings
                    .AsNoTracking()
                    .Where(m => m.TenantId == tenantId)
                    .OrderBy(m => m.StartTime)
                    .ToListAsync();

                return Ok(meetings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load meetings");
                return StatusCode(500, "Error loading meetings.");
            }
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> Get(long id)
        {
            try
            {
                var tenantId = await GetCurrentTenantIdAsync();
                var meeting = await _db.Meetings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId);

                if (meeting == null) return NotFound();
                return Ok(meeting);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load meeting {Id}", id);
                return StatusCode(500, "Error loading meeting.");
            }
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] MeetingCreateDto dto)
        {
            if (dto == null) return BadRequest("Missing payload.");
            if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");
            if (dto.StartTime == default) return BadRequest("StartTime is required.");

            var entity = new Meeting
            {
                TenantId = await GetCurrentTenantIdAsync(),
                Title = dto.Title.Trim(),
                Description = dto.Description,
                Location = dto.Location,
                LocationLat = dto.LocationLat,
                LocationLng = dto.LocationLng,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                RsvpRequired = dto.RsvpRequired
            };

            try
            {
                _db.Meetings.Add(entity);
                await _db.SaveChangesAsync();

                _logger.LogInformation("Meeting {Id} created", entity.Id);
                return CreatedAtAction(nameof(Get), new { id = entity.Id }, entity);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating meeting");
                return StatusCode(500, "Error creating meeting.");
            }
        }

        [HttpPut("{id:long}")]
        [Authorize]
        public async Task<IActionResult> Update(long id, [FromBody] MeetingUpdateDto dto)
        {
            if (dto == null) return BadRequest("Missing payload.");
            if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");
            if (dto.StartTime == default) return BadRequest("StartTime is required.");

            try
            {
                var tenantId = await GetCurrentTenantIdAsync();
                var meeting = await _db.Meetings.FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId);
                if (meeting == null) return NotFound();

                meeting.Title = dto.Title.Trim();
                meeting.Description = dto.Description;
                meeting.Location = dto.Location;
                meeting.LocationLat = dto.LocationLat;
                meeting.LocationLng = dto.LocationLng;
                meeting.StartTime = dto.StartTime;
                meeting.EndTime = dto.EndTime;
                meeting.RsvpRequired = dto.RsvpRequired;

                await _db.SaveChangesAsync();

                _logger.LogInformation("Meeting {Id} updated", id);
                return Ok(meeting);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating meeting {Id}", id);
                return StatusCode(500, "Error updating meeting.");
            }
        }

        [HttpPatch("{id:long}")]
        [Authorize]
        public async Task<IActionResult> Patch(long id, [FromBody] MeetingPatchDto dto)
        {
            if (dto == null) return BadRequest("Missing payload.");

            try
            {
                var tenantId = await GetCurrentTenantIdAsync();
                var meeting = await _db.Meetings.FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId);
                if (meeting == null) return NotFound();

                if (dto.Title != null) meeting.Title = dto.Title.Trim();
                if (dto.Description != null) meeting.Description = dto.Description;
                if (dto.Location != null) meeting.Location = dto.Location;
                if (dto.LocationLat.HasValue) meeting.LocationLat = dto.LocationLat;
                if (dto.LocationLng.HasValue) meeting.LocationLng = dto.LocationLng;
                if (dto.StartTime.HasValue) meeting.StartTime = dto.StartTime.Value;
                if (dto.EndTime.HasValue) meeting.EndTime = dto.EndTime;
                if (dto.RsvpRequired.HasValue) meeting.RsvpRequired = dto.RsvpRequired.Value;

                await _db.SaveChangesAsync();

                _logger.LogInformation("Meeting {Id} patched", id);
                return Ok(meeting);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error patching meeting {Id}", id);
                return StatusCode(500, "Error patching meeting.");
            }
        }

        [HttpDelete("{id:long}")]
        [Authorize]
        public async Task<IActionResult> Delete(long id)
        {
            try
            {
                var tenantId = await GetCurrentTenantIdAsync();
                var meeting = await _db.Meetings.FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId);
                if (meeting == null) return NotFound();

                _db.Meetings.Remove(meeting);
                await _db.SaveChangesAsync();

                _logger.LogInformation("Meeting {Id} deleted", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting meeting {Id}", id);
                return StatusCode(500, "Error deleting meeting.");
            }
        }

        public class MeetingCreateDto
        {
            public string Title { get; set; } = "";
            public string? Description { get; set; }
            public string? Location { get; set; }
            public decimal? LocationLat { get; set; }
            public decimal? LocationLng { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime? EndTime { get; set; }
            public bool RsvpRequired { get; set; } = false;
        }

        public class MeetingUpdateDto : MeetingCreateDto { }

        public class MeetingPatchDto
        {
            public string? Title { get; set; }
            public string? Description { get; set; }
            public string? Location { get; set; }
            public decimal? LocationLat { get; set; }
            public decimal? LocationLng { get; set; }
            public DateTime? StartTime { get; set; }
            public DateTime? EndTime { get; set; }
            public bool? RsvpRequired { get; set; }
        }
    }
}
