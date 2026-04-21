# hide-id-in-add-forms.ps1
# Robust: determines repo root from the script file location (so you can run from any cwd)
# Usage: powershell -ExecutionPolicy Bypass -File .\hide-id-in-add-forms.ps1
# Backups are created next to each modified file with .bak_YYYYMMDD_HHMMSS

# Find the folder the script lives in (works even if run from another directory)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) {
    # fallback to current location
    $scriptDir = (Get-Location).Path
}

$repoRoot = Resolve-Path $scriptDir
$featurePath = Join-Path $repoRoot "src\features"

if (-not (Test-Path $featurePath)) {
    Write-Error "Cannot find $featurePath - ensure you placed this script in the project root (where src\features exists). Current script dir: $scriptDir"
    exit 1
}

Write-Host "Repository root determined as: $repoRoot"
Write-Host "Scanning features under: $featurePath"

$files = Get-ChildItem -Path $featurePath -Recurse -Filter Page.jsx -File -ErrorAction SilentlyContinue

if (-not $files) {
    Write-Host "No Page.jsx files found under src/features/*"
    exit 0
}

# Pattern that finds the DetectFields(...).map( sequence (singleline)
$pattern = [regex] 'DetectFields\s*\(\s*(?:editing\s*\|\|\s*items\[0\]\s*\|\|\s*\{[^\}]*\}|editing\s*\|\|\s*items\[0\]|items\[0\]|\{[^\}]*\})\s*\)\s*\.map\s*\('

# Replacement text: insert a .filter(...) that removes id/*Id when not editing (Add mode).
# Using a here-string to avoid PowerShell delimiting problems with quotes.
$replacement = @'
DetectFields($1).filter(key => {
  // hide id-like fields when adding (editing is falsy)
  if (!editing && (key.toLowerCase() === 'id' || key.toLowerCase().endsWith('id'))) return false;
  return true;
}).map(
'@

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

    # Insert .filter(...) between DetectFields(...) and .map(
    # We capture the whole DetectFields(...) argument as group 1 by using a look for the (...) itself.
    # Use Singleline so the regex can cross newlines.
    try {
        $new = [regex]::Replace($content, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    } catch {
        Write-Host "  [Error] regex replace failed for $rel : $_"
        continue
    }

    if ($new -ne $content) {
        Set-Content -Path $rel -Value $new -Encoding UTF8
        Write-Host "  [Patched] $rel"
    } else {
        Write-Host "  [NoChange] $rel"
    }
}

Write-Host "Done. Restart dev server (npm run dev) and test Add Record modal(s)."
