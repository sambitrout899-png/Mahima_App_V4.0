using Mahima.Api.v3.clean.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RolePermissionsController : ControllerBase
    {
        private readonly MahimaDbContext _db;
        public RolePermissionsController(MahimaDbContext db) { _db = db; }

        // GET /api/role-permissions  -> returns array of { roleId, page_key }
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var rows = await _db.RolePermissions
                .Select(rp => new {
                    roleId = rp.RoleId,
                    page_key = rp.PageKey
                })
                .ToListAsync();
            return Ok(rows);
        }

        // GET /api/role-permissions/roles -> returns aggregated roles with pages
        [HttpGet("roles")]
        public async Task<IActionResult> GetRolesWithPages()
        {
            var rolesWithPages = await _db.Roles
                .Select(r => new {
                    id = r.Id,
                    name = r.Name,
                    pages = _db.RolePermissions
                             .Where(rp => rp.RoleId == r.Id)
                             .Select(rp => rp.PageKey)
                             .ToList()
                })
                .ToListAsync();
            return Ok(rolesWithPages);
        }

        // GET /api/roles/{id}/pages  -> returns array of page keys (if frontend tries it)
        [HttpGet("/api/roles/{id}/pages")]
        public async Task<IActionResult> GetPagesForRole(int id)
        {
            var pages = await _db.RolePermissions
                .Where(rp => rp.RoleId == id)
                .Select(rp => rp.PageKey)
                .ToListAsync();
            return Ok(pages);
        }
    }
}
