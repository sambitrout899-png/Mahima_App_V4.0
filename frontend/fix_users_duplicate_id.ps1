<#
fix_users_duplicate_id.ps1

Backs up and patches backend UsersController.Create to avoid duplicate PK errors,
and patches frontend users Page.jsx to stop sending id on create and to make id readonly.

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
$defaultBackend = "C:\projects\mahima.api"  # change if different
$backend = Ask "Backend project folder (where Controllers folder is)" $defaultBackend
$usersCtrlCandidates = Get-ChildItem -Path (Join-Path $backend 'Controllers') -Filter "*UsersController*.cs" -File -ErrorAction SilentlyContinue

if (-not $usersCtrlCandidates -or $usersCtrlCandidates.Count -eq 0) {
  Write-Host "Could not find UsersController in $backend\Controllers. Please provide the full path to UsersController.cs"
  $usersCtrlPath = Ask "Full path to UsersController.cs" ""
} else {
  $usersCtrlPath = $usersCtrlCandidates[0].FullName
  Write-Host "Found UsersController: $usersCtrlPath"
}

if (-not (Test-Path $usersCtrlPath)) {
  Write-Error "UsersController not found at $usersCtrlPath. Aborting."
  exit 1
}

# backup
Backup-IfExists $usersCtrlPath

# read existing content (to try to preserve namespaces)
$orig = Get-Content -Raw -Path $usersCtrlPath

# craft a replacement Create action that avoids duplicate PK and returns 409 if id exists
# We'll replace the first occurrence of 'public async Task<IActionResult> Create(' ... body until the next '}' that closes it.
# Simpler: append a helper method and replace "Create" method content conservatively by searching for "[HttpPost]" above a method named Create.

if ($orig -match '\[HttpPost\]\s*public\s+async\s+Task<IActionResult>\s+Create\s*\(\s*\[FromBody\]\s*User\s+\w+\s*\)') {
  # do a targeted replace: find start index of [HttpPost] for Create
  $pattern = '\[HttpPost\]\s*public\s+async\s+Task<IActionResult>\s+Create\s*\(\s*\[FromBody\]\s*User\s+(\w+)\s*\)\s*\{'
  $m = [regex]::Match($orig,$pattern)
  if ($m.Success) {
    $paramName = $m.Groups[1].Value
    $start = $m.Index
    # find the matching closing brace for this method - naive but works for most controller layouts
    $sub = $orig.Substring($start)
    $braceCount = 0
    $pos = -1
    for ($i=0; $i -lt $sub.Length; $i++) {
      if ($sub[$i] -eq '{') { $braceCount++ }
      if ($sub[$i] -eq '}') {
        $braceCount--
        if ($braceCount -eq 0) { $pos = $i; break }
      }
    }
    if ($pos -lt 0) { Write-Error "Could not locate end of Create method. Aborting."; exit 1 }
    $endIndex = $start + $pos

    $before = $orig.Substring(0,$start)
    $after = $orig.Substring($endIndex+1)

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
        // return a clear conflict if duplicate key still occurs
        if (dbEx.InnerException != null)
        {
            var msg = dbEx.InnerException.Message;
            if (msg != null && msg.Contains(""duplicate"", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = ""Duplicate key error: the Id or unique field already exists."" });
            }
        }
        // unexpected DB error
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
    Write-Host "Patched UsersController Create action to prevent duplicate PK insert and to return Conflict(409) when Id exists."
  } else {
    Write-Error "Could not parse Create method signature. Manual fix required."
    exit 1
  }
} else {
  Write-Error "UsersController Create method not found by pattern. Please open $usersCtrlPath and apply the recommended Create logic manually."
  exit 1
}

# --- patch frontend users Page.jsx to not send id on create and make id readonly ---
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

# make two changes:
# 1) ensure id input has readOnly (replace occurrences of rendering id input)
$text = $text -replace '(<label[^>]*>\s*id\s*[^<]*<\/label>[\s\S]*?<input[^>]*)(>)', '$1 readOnly$2'

# 2) ensure create path deletes id/Id before calling create -- find the create branch of save() or where create called.
# We'll append a small helper function near top: function prepareForCreate(p) { const payload = {...p}; delete payload.id; delete payload.Id; if (payload.joinDate==null) payload.joinDate = new Date().toISOString(); if (payload.lastLogin) payload.lastLogin = new Date(payload.lastLogin).toISOString(); return payload; }
if ($text -notmatch 'function\s+prepareForCreate') {
  # insert after imports
  $text = $text -replace '(import[^\n]+\n(?:import[^\n]+\n)*)', "`$1`nfunction prepareForCreate(p) { const payload = {...(p||{})}; delete payload.id; delete payload.Id; if (!payload.joinDate) payload.joinDate = new Date().toISOString(); if (payload.lastLogin) payload.lastLogin = new Date(payload.lastLogin).toISOString(); return payload; }`n"
}

# replace create call: await usersApi.create(payload) -> ensure payload = prepareForCreate(form)
$text = $text -replace 'await\s+usersApi\.create\(\s*form\s*\)', 'await usersApi.create(prepareForCreate(form))'

Write-NoBOM $usersPage $text
Write-Host "Patched frontend users Page.jsx: id input set readonly (best-effort) and create now uses prepareForCreate(form) to strip id and coerce dates."

Write-Host "`nALL DONE. Please rebuild backend and restart it (dotnet run). Then restart frontend (npm run dev) and test creating a user."
Write-Host "If you still see 409 Conflict or 500, copy the server response body (or the controller log) and paste it here so I can refine."
