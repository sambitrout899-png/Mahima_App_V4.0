# fix-frontend-name-field.ps1
# Usage: run in your frontend project folder
#   cd C:\Users\Administrator\projects\mahima-frontend
#   ./fix-frontend-name-field.ps1

# -------- CONFIG - edit if your Page.jsx lives elsewhere ----------
$PagePath = "C:\Users\Administrator\projects\mahima-frontend\src\features\users\Page.jsx"
# -----------------------------------------------------------------

if (-not (Test-Path $PagePath)) {
    Write-Host "ERROR: Page.jsx not found at $PagePath" -ForegroundColor Red
    Write-Host "Edit the script variable \$PagePath to point to your Page.jsx and re-run."
    exit 1
}

$backupFolder = Join-Path (Split-Path $PagePath -Parent) "fix_backups"
if (-not (Test-Path $backupFolder)) { New-Item -ItemType Directory -Path $backupFolder | Out-Null }

$ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
$bak = Join-Path $backupFolder ("Page.jsx.bak_$ts")
Copy-Item -Path $PagePath -Destination $bak -Force
Write-Host "Backed up $PagePath -> $bak"

# Read file
$content = Get-Content -Raw -Path $PagePath

# Replacement patterns:
# 1) row.name -> (row.displayName || row.username || row.name)
$content = $content -replace '\brow\.name\b', '((row.displayName) || (row.username) || row.name)'

# 2) row["name"] or row['name']
$content = $content -replace 'row\[\s*["'']name["'']\s*\]', '((row.displayName) || (row.username) || row.name)'

# 3) d => d.name  (common shorthand)
$content = $content -replace '(\=\>\s*)\s*d\.name\b', '$1((d.displayName) || (d.username) || d.name)'

# 4) (row) => row.name or row => row.name
$content = $content -replace '(\=\>\s*)\s*row\.name\b', '$1((row.displayName) || (row.username) || row.name)'

# 5) accessor: 'name'  -> accessor: row => row.displayName || row.username || row.name
#    Matches accessor: 'name' or accessor: "name" (simple heuristic)
$content = $content -replace 'accessor\s*:\s*["'']name["'']', 'accessor: row => ((row.displayName) || (row.username) || row.name)'

# 6) "accessor": "name" (for JSON-like column defs)
$content = $content -replace '"accessor"\s*:\s*["'']name["'']', '"accessor": (row => ((row.displayName) || (row.username) || row.name))'

# 7) header labels left as-is; if your table expects `name` field label it's fine.

# Write updated file
Set-Content -Path $PagePath -Value $content -Encoding UTF8

Write-Host "Patched $PagePath. Changes applied:"
Write-Host " - Replaced row.name, row['name'], d.name, accessor: 'name' usages to use displayName || username fallback."
Write-Host "`nNEXT STEPS:"
Write-Host " 1) Restart your dev server if running: stop npm run dev and start again."
Write-Host " 2) Open http://localhost:5173/users and refresh the page."
Write-Host "`nIf you see rendering issues, you can restore the backup:"
Write-Host "  Restore: Copy-Item -Path '$bak' -Destination '$PagePath' -Force"
