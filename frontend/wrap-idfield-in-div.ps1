# wrap-idfield-in-div.ps1
# Run from frontend root where src/ exists:
#   ./wrap-idfield-in-div.ps1

$projectRoot = Resolve-Path "."
$entities = @("users","teams","tasks","sermons","prayerRequests","meetings","attachments")

foreach ($e in $entities) {
    $fileRel = "src\features\$e\Page.jsx"
    $filePath = Join-Path $projectRoot $fileRel
    if (-not (Test-Path $filePath)) {
        Write-Host "Skipping (not found): $fileRel" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content -Raw -Path $filePath

    $search = '{/* id field auto-replaced */} <IdField form={form} />'
    if ($content -like "*$search*") {
        $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
        $bakFolder = Join-Path (Split-Path $filePath -Parent) "fix_backups"
        if (-not (Test-Path $bakFolder)) { New-Item -ItemType Directory -Path $bakFolder | Out-Null }
        $bak = Join-Path $bakFolder ("Page.jsx.bak_$ts")
        Copy-Item -Path $filePath -Destination $bak -Force
        Write-Host "Backed up $fileRel -> $bak"

        $replace = '{/* id field auto-replaced */} <div><IdField form={form} /></div>'
        $new = $content -replace [regex]::Escape($search), $replace

        Set-Content -Path $filePath -Value $new -Encoding UTF8
        Write-Host ("Patched ${fileRel}: wrapped injected IdField in <div>.") -ForegroundColor Green
    } else {
        Write-Host "No injected IdField marker found in $fileRel" -ForegroundColor Gray
    }
}

Write-Host "Done. Restart dev server: npm run dev"
