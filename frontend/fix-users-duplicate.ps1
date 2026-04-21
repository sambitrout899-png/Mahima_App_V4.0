# CONFIG
$ProjectRoot = "C:\projects\mahima.api\mahima.api"
$ControllerRelPath = "Controllers\UsersController.cs"
$BackupFolder = Join-Path $ProjectRoot "fix_backups"

# Postgres (edit these)
$PgHost = "localhost"
$PgPort = 5432
$PgDatabase = "postgres"
$PgUser = "postgres"
$PgPassword = "07aeb46bbd32444897558dfd2b0bd6cf"     # put here or leave blank to be prompted
$PsqlPath = "psql"
$TableName = "Users"
$IdColumn = "id"

# ---- Backup existing controller
$ControllerPath = Join-Path $ProjectRoot $ControllerRelPath
if (!(Test-Path $BackupFolder)) { New-Item -ItemType Directory $BackupFolder | Out-Null }
if (Test-Path $ControllerPath) {
    $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
    Copy-Item $ControllerPath (Join-Path $BackupFolder "UsersController.cs.bak_$ts") -Force
    Write-Host "Backed up controller."
}

# ---- Write new controller (literal here-string, no interpolation!)
$controllerContent = @"
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Threading.Tasks;

namespace Mahima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(AppDbContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] User u)
        {
            u.Id = default; // force DB to generate PK
            try
            {
                _context.Users.Add(u);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetById), new { id = u.Id }, u);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23505")
            {
                _logger.LogWarning(ex, "Duplicate key on Users insert for payload");
                return Conflict(new { message = "A user with that id already exists." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] User u)
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
                _logger.LogWarning(ex, "Duplicate key on Users update for payload");
                return Conflict(new { message = "Duplicate constraint violation." });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            return Ok(user);
        }
    }
}
"@

$controllerContent | Out-File -Encoding utf8 -FilePath $ControllerPath -Force
Write-Host "Replaced UsersController.cs"

# ---- Fix Postgres sequence
if (-not $PgPassword) {
    $PgPassword = Read-Host "Enter Postgres password" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PgPassword)
    $PgPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

$env:PGPASSWORD = $PgPassword
$sql = "SELECT setval(pg_get_serial_sequence('public.""$TableName""', '$IdColumn'), (SELECT COALESCE(MAX($IdColumn), 1) FROM ""$TableName"" ));"

& $PsqlPath -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -c $sql

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host "DONE. Rebuild & restart your API."
