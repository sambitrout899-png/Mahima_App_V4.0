using Mahima.Api.v3.clean.Data;
﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using System.Linq;
using Mahima.Api.v3.clean;
using Mahima.Api.v3.clean.Models;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AttachmentsController : ControllerBase
    {
        private readonly MahimaDbContext _context;
        public AttachmentsController(MahimaDbContext context) => _context = context;

        // GET /api/attachments
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var items = await _context.Attachments
                .OrderBy(a => a.Id)
                .Take(100)
                .ToListAsync();
            return Ok(items);
        }

        // PUT /api/attachments/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Put([FromRoute] string id, [FromBody] Attachment model)
        {
            if (model == null) return BadRequest("Model missing");

            // Try to parse id into Guid or int, else keep string
            object key;
            if (Guid.TryParse(id, out var g)) key = g;
            else if (int.TryParse(id, out var i)) key = i;
            else key = id;

            var dbSet = _context.Set<Attachment>();
            var existing = await dbSet.FindAsync(new object[] { key });
            if (existing == null) return NotFound();

            _context.Entry(existing).CurrentValues.SetValues(model);
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        // DELETE /api/attachments/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete([FromRoute] string id)
        {
            object key;
            if (Guid.TryParse(id, out var g)) key = g;
            else if (int.TryParse(id, out var i)) key = i;
            else key = id;

            var dbSet = _context.Set<Attachment>();
            var existing = await dbSet.FindAsync(new object[] { key });
            if (existing == null) return NotFound();

            dbSet.Remove(existing);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
