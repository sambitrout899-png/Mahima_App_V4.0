# wrap-idfield-with-formid.ps1
# Run from project root:
#   .\wrap-idfield-with-formid.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path ".").Path
$featuresDir = Join-Path $projectRoot "src\features"
if (-not (Test-Path $featuresDir)) {
  Write-Host "src/features not found. Run from project root." -ForegroundColor Yellow
  exit 1
}

$pages = Get-ChildItem -Path $featuresDir -Recurse -Filter "Page.jsx" -File
if ($pages.Count -eq 0) {
  Write-Host "No Page.jsx files found under src/features." -ForegroundColor Yellow
  exit 0
}

# regexes (singleline / case-insensitive)
$selfClosingPattern = '<\s*IdField\b[^>]*?\/\s*>'
$openClosePattern   = '<\s*IdField\b([^>]*)>([\s\S]*?)<\/\s*IdField\s*>'

$modified = @()
$skipped = @()

foreach ($p in $pages) {
  $path = $p.FullName
  $rel = $path.Substring($projectRoot.Length).TrimStart('\','/')
  Write-Host "`nProcessing: $rel"

  $content = Get-Content -Raw -Path $path -Encoding UTF8

  $orig = $content
  $changed = $false

  # Helper: determine if we should wrap this match
  function ShouldWrap($content, $matchIndex) {
    # check preceding 120 characters for an existing conditional referencing form.id or form?.id
    $startProbe = [Math]::Max(0, $matchIndex - 120)
    $context = $content.Substring($startProbe, $matchIndex - $startProbe)
    if ($context -match 'form\s*[\.\?]\s*id' -or $context -match '&&\s*<\s*IdField') {
      return $false
    }
    return $true
  }

  # Process self-closing occurrences first
  $offset = 0
  $matches = [regex]::Matches($content, $selfClosingPattern, "IgnoreCase,Singleline")
  if ($matches.Count -gt 0) {
    # We'll build replacements from last to first so indexes stay valid
    for ($i = $matches.Count - 1; $i -ge 0; $i--) {
      $m = $matches[$i]
      if (-not (ShouldWrap $content $m.Index)) {
        Write-Host "  - Skipping already-wrapped occurrence at pos $($m.Index)"
        continue
      }
      $replacement = "{form && form.id && " + $m.Value.Trim() + "}"
      $content = $content.Substring(0, $m.Index) + $replacement + $content.Substring($m.Index + $m.Length)
      $changed = $true
      Write-Host "  - Wrapped self-closing IdField at pos $($m.Index)"
    }
  }

  # Then process open/close occurrences
  $matches2 = [regex]::Matches($content, $openClosePattern, "IgnoreCase,Singleline")
  if ($matches2.Count -gt 0) {
    for ($i = $matches2.Count - 1; $i -ge 0; $i--) {
      $m = $matches2[$i]
      if (-not (ShouldWrap $content $m.Index)) {
        Write-Host "  - Skipping already-wrapped open/close occurrence at pos $($m.Index)"
        continue
      }
      $full = $m.Value
      $replacement = "{form && form.id && " + $full.Trim() + "}"
      $content = $content.Substring(0, $m.Index) + $replacement + $content.Substring($m.Index + $m.Length)
      $changed = $true
      Write-Host "  - Wrapped open/close IdField at pos $($m.Index)"
    }
  }

  if ($changed) {
    # backup first
    $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $bak = "$path.bak_$ts"
    Copy-Item -Path $path -Destination $bak -Force
    Write-Host "  Backup: $(Split-Path $bak -Leaf)"

    # write file
    $content | Set-Content -Path $path -Encoding UTF8
    Write-Host "  Patched: $rel" -ForegroundColor Green
    $modified += $rel
  } else {
    Write-Host "  No unwrap-needed occurrences found in $rel"
    $skipped += $rel
  }
}

Write-Host "`nSummary:"
Write-Host "  Modified: $($modified.Count)"
$modified | ForEach-Object { Write-Host "   - $_" }
Write-Host "  Skipped: $($skipped.Count)"
$skipped | ForEach-Object { Write-Host "   - $_" }

Write-Host "`nDone. Restart dev server (npm run dev) and verify the Add-record popup no longer shows the id field."
