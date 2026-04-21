using Mahima.Api.v3.clean.Data;
# CONFIG
$ProjectRoot   = "C:\projects\mahima.api\mahima.api"   # adjust if different
$ControllerRel = "Controllers\UsersController.cs"
$BackupFolder  = Join-Path $ProjectRoot "fix_backups"

# Ensure backup folder exists
if (!(Test-Path $BackupFolder)) { New-Item -ItemType Directory $BackupFolder | Out-Null }

$ControllerPath = Join-Path $ProjectRoot $ControllerRel

# Backup old controller
if (Test-Path $ControllerPath) {
    $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
    Copy-Item $ControllerPath (Join-Path $BackupFolder "UsersController.cs.bak_$ts") -Force
    Write-Host "Backed up UsersController.cs"
}

# New controller content
$controllerContent = @"
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System;
using System.Threading.Tasks;

using Mahima.Api.v3.clean.Models;   // User entity
using Mahima.Api.v3.clean;          // MahimaDbContext

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly MahimaDbContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(MahimaDbContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // CREATE
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] User u)
        {
            u.Id = default; // let DB generate UUID
            try
            {
                _context.Users.Add(u);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetById), new { id = u.Id }, u);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23505")
            {
                _logger.LogWarning(ex, "Duplicate key on Users insert");
                return Conflict(new { message = "A user with that id already exists." });
            }
        }

        // UPDATE
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] User u)
        {
            if (id != u.Id) return BadRequest(new { message = "Id mismatch." });

            var existing = await _context.Users.FindAsync(id);
            if (existing == null) return NotFound(new { message = "User not found." });

            existing.DisplayName = u.DisplayName;
            existing.Role = u.Role;
            existing.JoinDate = u.JoinDate;
            existing.LastLogin = u.LastLogin;
            existing.Teams = u.Teams;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(existing);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23505")
            {
                _logger.LogWarning(ex, "Duplicate key on Users update");
                return Conflict(new { message = "Duplicate constraint violation." });
            }
        }

        // GET by id
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            return Ok(user);
        }
    }
}
"@

# Write new controller
$controllerContent | Out-File -Encoding utf8 -FilePath $ControllerPath -Force
Write-Host "Replaced UsersController.cs with fixed version"
Write-Host "Done ✅. Now run: dotnet clean; dotnet build; dotnet run --urls http://localhost:5001"
