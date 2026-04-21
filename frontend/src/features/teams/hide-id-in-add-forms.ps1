# hide-id-in-add-forms.ps1
# Run from repo root: C:\users\Administrator\projects\mahima-frontend
# Backs up each Page.jsx it edits. Uses verbatim here-strings so embedded JS isn't parsed by PowerShell.

$featurePath = ".\src\features\"
if (-not (Test-Path $featurePath)) {
    Write-Error "Cannot find $featurePath - run this from project root."
    exit 1
}

$files = Get-ChildItem -Path $featurePath -Recurse -Filter Page.jsx -File -ErrorAction SilentlyContinue

if (-not $files) {
    Write-Host "No Page.jsx files found under src/features/*"
    exit 0
}

# Regex to find the DetectFields(...).map( pattern (captures the argument expression)
$pattern = [regex] 'DetectFields\s*\(\s*(editing\s*\|\|\s*items\[0\]\s*\|\|\s*\{[^\}]*\})\s*\)\s*\.map\s*\('

# Replacement: call DetectFields(...).filter(...).map(
# Use a here-string so the JavaScript text containing quotes is not interpreted by PowerShell
$replacement = @'
DetectFields($1).filter(key => !( !editing && (key.toLowerCase() === 'id' || key.toLowerCase().endsWith('id')) )).map(
'@

# This regex will try to make readonly logic for isId/readOnly safer if pattern exists nearby.
# We'll replace a common pattern: const isId = ...; const readonly = ...;
$readonlyPattern = [regex] 'const\s+isId\s*=\s*([^\r\n;]+);\s*const\s+readonly\s*=\s*([^\r\n;]+);'
$readonlyReplacement = "const isId = $1; const readonly = isId ? !!editing : $2;"

foreach ($f in $files) {
    $rel = $f.FullName
    Write-Host "Processing: $rel"
    $content = Get-Content -Raw -Encoding UTF8 $rel

    if ($content -notmatch 'DetectFields\s*\(' -or $content -notmatch '\.map\s*\(') {
        Write-Host "  [NoDetectPattern] skipping (no DetectFields(...).map(...))"
        continue
    }

    # backup
    $bak = "$rel.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
    Copy-Item -Path $rel -Destination $bak -Force
    Write-Host "  [Backup] $bak"

    # 1) Inject .filter(...) between DetectFields(...) and .map(
    $new = [regex]::Replace($content, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)

    # 2) Attempt to harden readonly handling where a common pattern exists
    $new = [regex]::Replace($new, $readonlyPattern, $readonlyReplacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)

    if ($new -ne $content) {
        Set-Content -Path $rel -Value $new -Encoding UTF8
        Write-Host "  [Patched] $rel"
    } else {
        Write-Host "  [NoChange] $rel"
    }
}

Write-Host "Done. Restart dev server (npm run dev) and test Add Record modal(s)."
