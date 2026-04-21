<#
remove-id-from-modals-all-entities.ps1

Place in project root and run:
  .\remove-id-from-modals-all-entities.ps1

What it does:
 - Searches src/features/**/Page.jsx
 - Backs up each file before editing to <file>.bak_yyyyMMdd_HHmmss
 - Removes common variations of id fields:
    * <IdField .../> or <IdField>...</IdField>
    * <label>id ...</label> blocks (common pattern)
    * <input|textarea|select ... name="id" ...> (single-line or multi-line)
    * import lines that reference IdField
 - Cleans up extra blank lines
 - Prints summary of modified and skipped files
Note: script is conservative but broad—if you have unusual markup, paste the snippet and I will update.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path ".").Path
Write-Host "Project root:`t$projectRoot"

$featuresDir = Join-Path $projectRoot "src\features"
if (-not (Test-Path $featuresDir)) {
    Write-Host "No src/features directory found. Exiting."
    exit 1
}

# get all Page.jsx files
$pages = Get-ChildItem -Path $featuresDir -Recurse -Filter "Page.jsx" -File -ErrorAction SilentlyContinue
if (-not $pages -or $pages.Count -eq 0) {
    Write-Host "No Page.jsx files found under src/features. Nothing to do."
    exit 0
}

# Regex patterns (case-insensitive, singleline where needed)
# 1) IdField component usage (self-closing or with closing tag)
$idFieldPattern = '(?is)<\s*IdField\b[^>]*?(?:\/>|>(?:[\s\S]*?)<\/\s*IdField\s*>)'

# 2) import lines that import IdField (any style)
$importIdFieldPattern = '(?im)^\s*import\b.*\bIdField\b.*;[ \t]*$'

# 3) label blocks where the visible label text is "id" (allow whitespace/newlines)
$labelIdPattern = '(?is)<\s*label\b[^>]*>\s*id\b[\s\S]*?<\/\s*label\s*>'

# 4) input/textarea/select tags that have name="id" or name='id' (single or multi-line)
$inputNameIdPattern = '(?is)<\s*(?:input|textarea|select)\b[^>]*\bname\s*=\s*(?:"id"|'+"'id'"+')[^>]*>(?:[\s\S]*?<\/\s*(?:input|textarea|select)\s*>)?'

# 5) input elements with value bound to id e.g. value={form.id} or value={item.id}
$valueIdPattern = '(?is)<\s*(?:input|textarea|select)\b[^>]*\bvalue\s*=\s*\{[^}]*\b\.?id\b[^}]*\}[^>]*\/?>'

$modifiedFiles = @()
$skippedFiles = @()

foreach ($page in $pages) {
    $path = $page.FullName
    $rel = $path.Substring($projectRoot.Length).TrimStart('\','/')
    Write-Host "`nProcessing: $rel"

    try {
        $orig = Get-Content -Raw -Path $path -Encoding UTF8
    } catch {
        Write-Host "  Failed to read $rel - skipping."
        $skippedFiles += $rel
        continue
    }

    $new = $orig
    $changed = $false

    # Remove IdField usage
    if ([regex]::IsMatch($new, $idFieldPattern)) {
        $new = [regex]::Replace($new, $idFieldPattern, '')
        $changed = $true
        Write-Host "  - Removed <IdField .../> or <IdField>...</IdField>"
    }

    # Remove import IdField lines
    if ([regex]::IsMatch($new, $importIdFieldPattern)) {
        $new = [regex]::Replace($new, $importIdFieldPattern, '')
        $changed = $true
        Write-Host "  - Removed import lines that reference IdField"
    }

    # Remove <label> id </label> blocks
    if ([regex]::IsMatch($new, $labelIdPattern)) {
        $new = [regex]::Replace($new, $labelIdPattern, '')
        $changed = $true
        Write-Host "  - Removed <label>..id..</label> blocks"
    }

    # Remove explicit name="id" inputs/selects/textareas
    if ([regex]::IsMatch($new, $inputNameIdPattern)) {
        $new = [regex]::Replace($new, $inputNameIdPattern, '')
        $changed = $true
        Write-Host "  - Removed input/textarea/select elements with name=\"id\""
    }

    # Remove inputs whose value is bound to .id (value={...id...})
    if ([regex]::IsMatch($new, $valueIdPattern)) {
        $new = [regex]::Replace($new, $valueIdPattern, '')
        $changed = $true
        Write-Host "  - Removed input elements whose value was bound to .id"
    }

    # Tidy up: collapse >2 blank lines to 2
    if ($changed) {
        $new = $new -replace "(`r?`n){3,}", "`r`n`r`n"
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
        Write-Host "  Backup created: $(Split-Path $bakPath -Leaf)"
    } catch {
        Write-Host "  Failed to create backup for $rel - aborting changes to this file."
        $skippedFiles += $rel
        continue
    }

    # Write the new content
    try {
        $new | Set-Content -Path $path -Encoding UTF8
        Write-Host "  Patched file: $rel"
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
Write-Host "DONE. Restart dev server: npm run dev"
Write-Host "If you still see id fields in some modals, copy-paste the small JSX snippet (the area around the id label/input) from that Page.jsx and paste it here; I will update the patterns to catch it."
