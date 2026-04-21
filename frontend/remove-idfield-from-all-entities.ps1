<#
remove-idfield-from-all-entities.ps1

Place in project root and run:
  .\remove-idfield-from-all-entities.ps1

This script will:
 - search for Page.jsx files under src/features/**
 - remove any IdField component usage like: <IdField ... />
 - remove label blocks that contain "id" as the label text: <label ...>id ...</label>
 - remove import lines that import IdField
 - backup each edited file to <file>.bak_yyyyMMdd_HHmmss

It is conservative: it will only modify files that match the patterns.
If you have custom non-standard markup for the id input, paste the snippet here and I will update the script.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path ".").Path
Write-Host "Project root:`t$projectRoot"

$featuresDir = Join-Path $projectRoot "src\features"
if (-not (Test-Path $featuresDir)) {
    Write-Host "No src/features directory found. Exiting."
    exit 0
}

# Find Page.jsx files under src/features
$pages = Get-ChildItem -Path $featuresDir -Recurse -Filter "Page.jsx" -File -ErrorAction SilentlyContinue

if (-not $pages -or $pages.Count -eq 0) {
    Write-Host "No Page.jsx files found under src/features. Nothing to do."
    exit 0
}

# Regex patterns:
# 1) IdField component usage (self-closing or with closing tag)
#    e.g. <IdField form={form} /> or <IdField ...>...</IdField>
$idFieldPattern = '(?is)<\s*IdField\b[^>]*?(?:\/>|>(?:[\s\S]*?)<\/\s*IdField\s*>)'

# 2) label blocks where the visible label text starts with 'id' or exactly 'id'
#    Matches: <label ...> id ... </label>  (non-greedy)
$labelIdPattern = '(?is)<\s*label\b[^>]*>\s*id\b[\s\S]*?<\/\s*label\s*>'

# 3) import lines that import IdField (any relative path)
$importIdFieldPattern = '(?im)^\s*import\s+.*\bIdField\b.*;[ \t]*$'

$modifiedFiles = @()
$skippedFiles = @()

foreach ($page in $pages) {
    $path = $page.FullName
    $rel = $path.Substring($projectRoot.Length).TrimStart('\','/')
    Write-Host "Processing: $rel"

    try {
        $orig = Get-Content -Raw -Path $path -Encoding UTF8
    } catch {
        Write-Host "  Failed to read $rel - skipping."
        $skippedFiles += $rel
        continue
    }

    $changed = $false
    $new = $orig

    # Remove IdField usages
    if ([regex]::IsMatch($new, $idFieldPattern)) {
        $new = [regex]::Replace($new, $idFieldPattern, '')
        $changed = $true
        Write-Host "  Removed IdField component usage."
    }

    # Remove <label>...id...</label> blocks commonly used for id input
    if ([regex]::IsMatch($new, $labelIdPattern)) {
        $new = [regex]::Replace($new, $labelIdPattern, '')
        $changed = $true
        Write-Host "  Removed id <label>...</label> block(s)."
    }

    # Remove import IdField lines if any
    if ([regex]::IsMatch($new, $importIdFieldPattern)) {
        $new = [regex]::Replace($new, $importIdFieldPattern, '')
        # also tidy up potential extra blank lines created at top:
        $new = $new -replace "(`r?`n){2,}", "`r`n`r`n"
        $changed = $true
        Write-Host "  Removed import lines for IdField."
    }

    if (-not $changed) {
        Write-Host "  No id patterns found in $rel - skipped."
        $skippedFiles += $rel
        continue
    }

    # Backup original
    $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $bakPath = "$path.bak_$ts"
    try {
        Copy-Item -Path $path -Destination $bakPath -Force
        Write-Host "  Backup: $(Split-Path $bakPath -Leaf)"
    } catch {
        Write-Host "  Failed to create backup for $rel - aborting changes to this file."
        $skippedFiles += $rel
        continue
    }

    # Write the new content
    try {
        $new | Set-Content -Path $path -Encoding UTF8
        Write-Host "  Written patched file: $rel"
        $modifiedFiles += $rel
    } catch {
        Write-Host "  Failed to write modified file for $rel - restoring backup."
        Copy-Item -Path $bakPath -Destination $path -Force
        $skippedFiles += $rel
    }
}

Write-Host "`nSummary:"
Write-Host "  Modified files: $($modifiedFiles.Count)"
foreach ($f in $modifiedFiles) { Write-Host "   - $f" }

Write-Host "  Skipped files: $($skippedFiles.Count)"
foreach ($f in $skippedFiles) { Write-Host "   - $f" }

Write-Host ""
Write-Host "Done. Restart dev server: npm run dev"
Write-Host "If some pages still show the id input, open that Page.jsx and paste the small snippet (the label/input lines or the modal form portion) into the chat so I can tune the script to match it."
