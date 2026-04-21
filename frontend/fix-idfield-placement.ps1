# fix-idfield-placement.ps1
# Run this in mahima-frontend root

$projectRoot = Resolve-Path "."
$entities = @("users","teams","tasks","sermons","prayerRequests","meetings","attachments")

foreach ($e in $entities) {
    $rel = "src/features/$e/Page.jsx"
    $path = Join-Path $projectRoot $rel
    if (-not (Test-Path $path)) { continue }

    $content = Get-Content -Raw -Path $path
    $new = $content

    # Fix misplaced IdField inside modalOverlay div
    $pattern = '<div style=\{modalOverlay\}\s*[\r\n]*\s*<IdField form=\{form\} />>*'
    if ($new -match $pattern) {
        $replacement = '<div style={modalOverlay}>' + "`r`n  <IdField form={form} />"
        $new = [regex]::Replace($new, $pattern, $replacement)

        # Backup first
        $bak = "$path.bak_" + (Get-Date -Format "yyyyMMdd_HHmmss")
        Copy-Item $path $bak -Force
        Set-Content -Path $path -Value $new -Encoding UTF8

        Write-Host "Fixed IdField placement in $rel. Backup at $bak" -ForegroundColor Green
    }
}
Write-Host "Done. Restart dev server with: npm run dev"
