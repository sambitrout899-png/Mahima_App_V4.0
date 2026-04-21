# fix-users-list.ps1
# Auto-fix Page.jsx to use data.items instead of raw data

$PagePath = "C:\Users\Administrator\projects\mahima-frontend\src\features\users\Page.jsx"

if (-not (Test-Path $PagePath)) {
    Write-Host "ERROR: Page.jsx not found at $PagePath" -ForegroundColor Red
    exit 1
}

$backup = "$PagePath.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
Copy-Item $PagePath $backup -Force
Write-Host "Backed up Page.jsx to $backup"

$content = Get-Content -Raw -Path $PagePath

# Replace any setUsers(data) with setUsers(data.items || [])
$content = $content -replace 'setUsers\s*\(\s*data\s*\)', 'setUsers(data.items || [])'

# Also fix cases like res instead of data
$content = $content -replace 'setUsers\s*\(\s*res\s*\)', 'setUsers(res.items || [])'

Set-Content -Path $PagePath -Value $content -Encoding UTF8
Write-Host "Patched Page.jsx ✅"
Write-Host "Restart your dev server: npm run dev"
