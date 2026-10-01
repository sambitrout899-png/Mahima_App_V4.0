using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AttachmentsController : ControllerBase
    {
        private readonly MahimaDbContext _context;
        private static readonly Guid RootTenantId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public AttachmentsController(MahimaDbContext context) => _context = context;

        private Guid GetCurrentTenantId() =>
            Guid.TryParse(User.FindFirstValue("tenant_id"), out var id)
                ? id
                : RootTenantId;

        // GET /api/attachments
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var tenantId = GetCurrentTenantId();
            var items = await _context.Attachments
                .Where(a => a.TenantId == tenantId)
                .OrderBy(a => a.Id)
                .Take(100)
                .ToListAsync();

            return Ok(items);
        }

        // PUT /api/attachments/{id}
        [HttpPut("{id:long}")]
        public async Task<IActionResult> Put([FromRoute] long id, [FromBody] Attachment model)
        {
            if (model == null) return BadRequest("Model missing");

            var tenantId = GetCurrentTenantId();
            var existing = await _context.Attachments
                .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenantId);

            if (existing == null) return NotFound();

            model.Id = existing.Id;
            model.TenantId = tenantId;
            _context.Entry(existing).CurrentValues.SetValues(model);
            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        // DELETE /api/attachments/{id}
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete([FromRoute] long id)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.Attachments
                .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenantId);

            if (existing == null) return NotFound();

            _context.Attachments.Remove(existing);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
