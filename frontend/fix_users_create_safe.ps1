# fix_users_create_safe.ps1
# Safely patch frontend users Page.jsx so create() strips id and coerces date fields.
# Backups created with .bak_TIMESTAMP
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ask($prompt,$default='') {
  if ($default -ne '') { $r = Read-Host "$prompt [$default]" } else { $r = Read-Host $prompt }
  if ($r -eq '') { return $default } else { return $r }
}
function Backup-IfExists($p) {
  if (Test-Path $p) { $b = "$p.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"; Copy-Item $p $b -Force; Write-Host "Backed up $p -> $(Split-Path $b -Leaf)" }
}
function Write-NoBOM($path,$text) {
  $d = Split-Path -Parent $path
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
  [System.IO.File]::WriteAllText($path,$text,(New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Wrote: $path"
}

$defaultFrontend = "C:\Users\Administrator\projects\mahima-frontend"
$frontend = Ask "Frontend project root" $defaultFrontend

$usersPage = Join-Path $frontend 'src\features\users\Page.jsx'
if (-not (Test-Path $usersPage)) {
  Write-Host "Could not find $usersPage. Please provide full path to users Page.jsx"
  $usersPage = Ask "Full path to users Page.jsx" ""
}
if (-not (Test-Path $usersPage)) { Write-Error "users Page.jsx not found. Aborting."; exit 1 }

# backup
Backup-IfExists $usersPage

# read file
$text = Get-Content -Raw -Path $usersPage -ErrorAction Stop

# 1) add prepareForCreate function after import block if missing
if ($text -notmatch 'function\s+prepareForCreate\s*\(') {
  # find last import line index
  $lines = $text -split "`r?`n"
  $lastImportIndex = -1
  for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^\s*import\b') { $lastImportIndex = $i }
  }
  $helper = @"
function prepareForCreate(p) {
  // clone and clean payload: remove id fields and normalize dates
  const payload = Object.assign({}, p || {});
  if ('id' in payload) delete payload.id;
  if ('Id' in payload) delete payload.Id;
  // coerce joinDate/lastLogin to ISO or remove if empty
  if (payload.joinDate) {
    try { payload.joinDate = new Date(payload.joinDate).toISOString(); } catch (e) { delete payload.joinDate; }
  } else {
    // if you want server to set JoinDate, leave it absent; otherwise set to now:
    // payload.joinDate = new Date().toISOString();
  }
  if (payload.lastLogin) {
    try { payload.lastLogin = new Date(payload.lastLogin).toISOString(); } catch (e) { delete payload.lastLogin; }
  }
  return payload;
}
"@

  if ($lastImportIndex -ge 0) {
    # insert after the last import line
    $newLines = @()
    $newLines += $lines[0..$lastImportIndex]
    $newLines += $helper
    if ($lastImportIndex + 1 -le $lines.Length - 1) { $newLines += $lines[($lastImportIndex+1)..($lines.Length-1)] }
    $newText = ($newLines -join "`n")
  } else {
    # no imports found; just prepend helper
    $newText = $helper + "`n" + $text
  }
  $text = $newText
  Write-Host "Inserted prepareForCreate helper into Page.jsx"
} else {
  Write-Host "prepareForCreate already present — skipping insert."
}

# 2) Replace occurrences of usersApi.create(form) and await usersApi.create(form)
# Use simple string replace (case-sensitive)
$replacements = @(
  'await usersApi.create(form)',
  'usersApi.create(form)'
)
$changed = $false
foreach ($r in $replacements) {
  if ($text.Contains($r)) {
    $text = $text.Replace($r, $r -replace '\(form\)','(prepareForCreate(form))')
    $changed = $true
  }
}

# Also replace small variations like usersApi.create( form )
if (-not $changed) {
  # try a few tolerant patterns manually
  $patterns = @('await usersApi.create( form )','usersApi.create( form )')
  foreach ($patt in $patterns) {
    if ($text.Contains($patt)) {
      $text = $text.Replace($patt, $patt -replace '\( form \)','(prepareForCreate(form))')
      $changed = $true
    }
  }
}

if (-not $changed) {
  Write-Host "No direct usersApi.create(form) call found — no create-call replacement performed. You may have other call variants; review Page.jsx manually."
} else {
  Write-NoBOM $usersPage $text
  Write-Host "Patched create() calls to use prepareForCreate(form)."
}

Write-Host "`nDone. Restart frontend (npm run dev) and test creating a user. If you still get errors, copy the failing network request (Request body) and the server response body or backend log."
