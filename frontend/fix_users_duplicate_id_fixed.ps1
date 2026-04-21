<#
fix_users_duplicate_id_fixed.ps1

Fixed version of the script to:
 - locate UsersController.cs robustly (handles 0/1/many matches)
 - backup and patch the Create action to avoid duplicate PK errors
 - patch frontend users Page.jsx to not send id on create and make id readonly (best-effort)

Run from machine where both frontend and backend code exist.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ask($prompt,$default='') {
  if ($default -ne '') { $res = Read-Host "$prompt [$default]" } else { $res = Read-Host $prompt }
  if ($res -eq '') { return $default } else { return $res }
}

function Backup-IfExists($path) {
  if (Test-Path $path) {
    $bak = "$path.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
    Copy-Item $path $bak -Force
    Write-Host "Backed up $path -> $(Split-Path $bak -Leaf)"
  }
}

function Write-NoBOM($path, $content) {
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Wrote: $path"
}

# --- locate backend UsersController ---
$defaultBackend = "C:\projects\mahima.api"
$backend = Ask "Backend project folder (where Controllers folder is)" $defaultBackend

$controllersFolder = Join-Path $backend 'Controllers'
if (-not (Test-Path $controllersFolder)) {
  Write-Host "Controllers folder not found at $controllersFolder"
  $usersCtrlPath = Ask "Please provide full path to UsersController.cs (or press Enter to abort)" ""
  if ($usersCtrlPath -eq '') { Write-Error "No controller path provided. Aborting."; exit 1 }
} else {
  $matches = Get-ChildItem -Path $controllersFolder -Filter "*UsersController*.cs" -File -ErrorAction SilentlyContinue
  if (-not $matches) { 
    Write-Host "No UsersController*.cs found in $controllersFolder"
    $usersCtrlPath = Ask "Enter full path to UsersController.cs (or press Enter to abort)" ""
    if ($usersCtrlPath -eq '') { Write-Error "No controller path provided. Aborting."; exit 1 }
  } elseif ($matches -is [System.Array] -and $matches.Count -gt 1) {
    Write-Host "Multiple candidates found:"
    $i = 0
    foreach ($m in $matches) { $i++; Write-Host "[$i] $($m.FullName)" }
    $sel = Ask "Enter number of file to patch" "1"
    $idx = [int]$sel - 1
    if ($idx -lt 0 -or $idx -ge $matches.Count) { Write-Error "Invalid selection. Aborting."; exit 1 }
    $usersCtrlPath = $matches[$idx].FullName
  } else {
    # single object or single-element array
    $single = $matches | Select-Object -First 1
    $usersCtrlPath = $single.FullName
    Write-Host "Found UsersController: $usersCtrlPath"
  }
}

if (-not (Test-Path $usersCtrlPath)) {
  Write-Error "UsersController not found at $usersCtrlPath. Aborting."
  exit 1
}

# backup
Backup-IfExists $usersCtrlPath

# read existing content
$orig = Get-Content -Raw -Path $usersCtrlPath

# find Create method pattern
$pattern = '\[HttpPost\]\s*public\s+async\s+Task<IActionResult>\s+Create\s*\(\s*\[FromBody\]\s*User\s+(\w+)\s*\)\s*\{'
$m = [regex]::Match($orig, $pattern)
if (-not $m.Success) {
  Write-Error "Could not locate Create([FromBody] User ...) method by pattern in $usersCtrlPath. Please open the file and either rename or adapt manually."
  exit 1
}

$paramName = $m.Groups[1].Value
$start = $m.Index

# locate end of method by matching braces
$sub = $orig.Substring($start)
$brace = 0
$endPos = -1
for ($i = 0; $i -lt $sub.Length; $i++) {
  if ($sub[$i] -eq '{') { $brace++ }
  if ($sub[$i] -eq '}') { $brace-- }
  if ($brace -eq 0) { $endPos = $i; break }
}
if ($endPos -lt 0) { Write-Error "Could not determine end of Create method. Aborting."; exit 1 }

$before = $orig.Substring(0,$start)
$after = $orig.Substring($start + $endPos + 1)

$newCreate = @"
[HttpPost]
public async Task<IActionResult> Create([FromBody] User $paramName)
{
    if ($paramName == null) return BadRequest(""Missing request body"");

    // If caller did not supply Id, generate one
    if ($paramName.Id == Guid.Empty)
    {
        $paramName.Id = Guid.NewGuid();
    }
    else
    {
        // If Id was supplied and already exists, return Conflict instead of throwing DB 23505
        var exists = await _db.Users.FindAsync($paramName.Id);
        if (exists != null)
        {
            return Conflict(new { message = ""User with given Id already exists."", id = $paramName.Id });
        }
    }

    // Ensure JoinDate set if missing
    if ($paramName.JoinDate == null || $paramName.JoinDate == default(DateTime))
    {
        $paramName.JoinDate = DateTime.UtcNow;
    }

    try
    {
        _db.Users.Add($paramName);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = $paramName.Id }, $paramName);
    }
    catch (DbUpdateException dbEx)
    {
        if (dbEx.InnerException != null)
        {
            var msg = dbEx.InnerException.Message;
            if (msg != null && msg.Contains(""duplicate"", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = ""Duplicate key error: the Id or unique field already exists."" });
            }
        }
        return StatusCode(500, new { message = ""Database error when creating user."", detail = dbEx.Message });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { message = ""Unhandled error when creating user."", detail = ex.Message });
    }
}
"@

$newContent = $before + $newCreate + $after
Write-NoBOM $usersCtrlPath $newContent
Write-Host "Patched UsersController Create action."

# --- patch frontend users Page.jsx ---
$defaultFrontend = "C:\Users\Administrator\projects\mahima-frontend"
$frontend = Ask "Frontend project root" $defaultFrontend
$usersPage = Join-Path $frontend 'src\features\users\Page.jsx'
if (-not (Test-Path $usersPage)) {
  Write-Host "Could not find $usersPage. Provide full path to users Page.jsx"
  $usersPage = Ask "Full path to users Page.jsx" ""
}
if (-not (Test-Path $usersPage)) { Write-Error "users Page not found. Aborting frontend patch."; exit 1 }
Backup-IfExists $usersPage
$text = Get-Content -Raw -Path $usersPage

# 1) best-effort: make id inputs readonly by adding readOnly attribute for input elements that reference id
$text = $text -replace '(<input\b[^>]*name\s*=\s*[\'"]?(id|Id)[\'"]?[^>]*)(>)', '$1 readOnly$3'

# 2) ensure prepareForCreate helper exists; add after imports if missing
if ($text -notmatch 'function\s+prepareForCreate\s*\(') {
  $text = $text -replace '((?:import[^\n]*\n)+)', "`$1`nfunction prepareForCreate(p) { const payload = {...(p||{})}; delete payload.id; delete payload.Id; if (!payload.joinDate) payload.joinDate = new Date().toISOString(); if (payload.lastLogin) payload.lastLogin = new Date(payload.lastLogin).toISOString(); return payload; }`n"
}

# 3) replace create call occurrences await usersApi.create(form) -> await usersApi.create(prepareForCreate(form))
$text = $text -replace 'await\s+usersApi\.create\(\s*form\s*\)', 'await usersApi.create(prepareForCreate(form))'

Write-NoBOM $usersPage $text
Write-Host "Patched frontend users Page.jsx (readonly id inputs, create uses prepareForCreate)."

Write-Host "`nDONE. Please rebuild backend and restart it (dotnet run). Then restart frontend (npm run dev) and test creating a user."
Write-Host "If you see a 409 Conflict, the response will contain a helpful message. If you still get a 500, paste the backend log and I will refine."
