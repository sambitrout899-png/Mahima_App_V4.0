# move-idfield-into-modal.ps1
# Usage:
#   cd C:\Users\Administrator\projects\mahima-frontend
#   ./move-idfield-into-modal.ps1

$projectRoot = Resolve-Path "."
Write-Host "Project root: $projectRoot"

$entities = @("users","teams","tasks","sermons","prayerRequests","meetings","attachments")

# Regex options
$opts = [System.Text.RegularExpressions.RegexOptions]::Singleline -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase

# Capture patterns
$capPat1 = '(\{\s*/\*\s*id field auto-replaced\s*\*/\s*\}\s*<IdField\s+form=\{form\}\s*/>)(\s*<div\s+style=\{modalOverlay\})'
$capPat2 = '(<IdField\s+form=\{form\}\s*/>)(\s*<div\s+style=\{modalOverlay\})'

foreach ($e in $entities) {
    $rel = "src\features\$e\Page.jsx"
    $path = Join-Path $projectRoot $rel
    if (-not (Test-Path $path)) {
        Write-Host "Skipping (not found): $rel" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content -Raw -Path $path
    $changed = $false
    $new = $content

    if ([regex]::IsMatch($new, $capPat1, $opts)) {
        $new = [regex]::Replace($new, $capPat1, '${2}' + "`r`n    " + '<IdField form={form} />', $opts)
        $changed = $true
        Write-Host "Applied pattern capPat1 to ${rel}"
    } elseif ([regex]::IsMatch($new, $capPat2, $opts)) {
        $new = [regex]::Replace($new, $capPat2, '${2}' + "`r`n    " + '<IdField form={form} />', $opts)
        $changed = $true
        Write-Host "Applied pattern capPat2 to ${rel}"
    } else {
        Write-Host "No inline IdField+modal pattern found in ${rel}" -ForegroundColor Gray
    }

    if ($changed) {
        # backup
        $bakFolder = Join-Path (Split-Path $path -Parent) "fix_backups"
        if (-not (Test-Path $bakFolder)) { New-Item -ItemType Directory -Path $bakFolder | Out-Null }
        $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
        $bak = Join-Path $bakFolder ("Page.jsx.bak_$ts")
        Copy-Item -Path $path -Destination $bak -Force
        Write-Host "Backed up ${rel} -> ${bak}"

        Set-Content -Path $path -Value $new -Encoding UTF8
        Write-Host "Patched ${rel}: moved IdField into modal overlay." -ForegroundColor Green
    }
}

Write-Host "Done. Restart dev server: npm run dev"
