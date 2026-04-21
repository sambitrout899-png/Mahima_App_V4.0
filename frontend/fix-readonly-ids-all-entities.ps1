<#
fix-readonly-ids-all-entities.ps1

Place in your frontend root (where src/ is) and run:
  ./fix-readonly-ids-all-entities.ps1

What it does:
 - Processes a list of entity page files (Page.jsx) under src/features/<entity>/Page.jsx
 - Creates backups for each file before modifying
 - Injects a small IdField helper component after imports if not present
 - Replaces any explicit "ID" label blocks with <IdField form={form} />
 - If no explicit ID label is found, attempts to insert <IdField form={form} /> at the top of the modal form
 - Makes any input with name="id" readonly

This is conservative and safe; backups are created as Page.jsx.bak_YYYYMMDD_HHMMSS
#>

$projectRoot = Resolve-Path "."
Write-Host "Project root: $projectRoot"

# Entities to patch - add/remove entity names here as needed
$entities = @(
    "users",
    "teams",
    "tasks",
    "sermons",
    "prayerRequests",
    "meetings",
    "attachments"
)

# For each entity look for src/features/<entity>/Page.jsx (case-sensitive path)
foreach ($e in $entities) {
    $fileRel = "src\features\$e\Page.jsx"
    $filePath = Join-Path $projectRoot $fileRel

    if (-not (Test-Path $filePath)) {
        Write-Host "Skipping (not found): $fileRel" -ForegroundColor Yellow
        continue
    }

    # backup
    $bakFolder = Join-Path (Split-Path $filePath -Parent) "fix_backups"
    if (-not (Test-Path $bakFolder)) { New-Item -ItemType Directory -Path $bakFolder | Out-Null }
    $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $bakPath = Join-Path $bakFolder ("Page.jsx.bak_$ts")
    Copy-Item -Path $filePath -Destination $bakPath -Force
    Write-Host "Backed up $fileRel -> $bakPath"

    $content = Get-Content -Raw -Path $filePath

    # 1) Insert IdField helper after imports if not already present
    # We'll place it after the last import line.
    if ($content -notmatch 'const\s+IdField\s*=' -and $content -notmatch 'function\s+IdField\s*\(') {
        # Build IdField component (reads form prop)
        $idField = @'
/* --- auto-inserted IdField: show readonly ID only when editing (form.id) --- */
const IdField = ({ form }) => {
  if (!form || !form.id) return null;
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      ID
      <input value={String(form.id)} readOnly style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #ddd", background: "#f6f6f6", color: "#666", marginTop: 6 }} />
    </label>
  );
};
'@

        # Find end of import block: last line that begins with "import "
        $importMatches = [regex]::Matches($content, "^import\s.*$", [System.Text.RegularExpressions.RegexOptions]::Multiline)
        if ($importMatches.Count -gt 0) {
            $lastImport = $importMatches[$importMatches.Count - 1]
            $insertPos = $lastImport.Index + $lastImport.Length
            $content = $content.Insert($insertPos, "`r`n`r`n" + $idField + "`r`n")
            Write-Host "Inserted IdField helper into $fileRel"
        } else {
            # No imports found - prepend
            $content = $idField + "`r`n" + $content
            Write-Host "Prepended IdField helper into $fileRel (no imports found)"
        }
    } else {
        Write-Host "IdField already present in $fileRel; skipping helper insert"
    }

    # 2) Make any input with name="id" or id="id" readonly (prevents editing on add/edit)
    #    Replace <input ... name="id" ...> with <input ... name="id" readOnly ...>
    $patternNameId = '(?i)(<input\b[^>]*\bname\s*=\s*["'']id["''][^>]*)(>)'
    $content = [regex]::Replace($content, $patternNameId, '$1 readOnly$2')

    # Also for id attribute
    $patternIdAttr = '(?i)(<input\b[^>]*\bid\s*=\s*["'']id["''][^>]*)(>)'
    $content = [regex]::Replace($content, $patternIdAttr, '$1 readOnly$2')

    # 3) Replace explicit label blocks that include "ID" (case-insensitive).
    #    This looks for <label> ... ID ... </label> and replaces the whole label with <IdField form={form} />
    #    Use a conservative match limited to reasonable size (2000 chars)
    $labelPattern = '(?is)<label\b[^>]*>[^<]{0,100}?ID[^<]{0,100}<\/label>'
    if ([regex]::IsMatch($content, $labelPattern)) {
        $content = [regex]::Replace($content, $labelPattern, '{/* id field auto-replaced */} <IdField form={form} />')
        Write-Host "Replaced explicit ID <label> with <IdField form={form} /> in $fileRel"
    } else {
        Write-Host "No explicit ID <label> found in $fileRel"
    }

    # 4) Try to insert IdField into modal/form top if there's a modal guard like "showModal && ("
    #    We'll find the first occurrence of "showModal && (" or "showModal && (" and insert IdField at the start of that block content
    if ($content -match 'showModal\s*&&\s*\(') {
        # find position of first '(' after 'showModal &&'
        $m = [regex]::Match($content, 'showModal\s*&&\s*\(')
        $pos = $m.Index + $m.Length
        # insert IdField right after that opening parenthesis
        $insertText = "`r`n    <IdField form={form} />`r`n"
        # Avoid duplicate insertions: only insert if IdField not already present near there
        $nearby = $content.Substring([Math]::Max(0, $pos - 200), [Math]::Min(400, $content.Length - ([Math]::Max(0, $pos - 200))))
        if ($nearby -notmatch 'IdField\s*form') {
            $content = $content.Insert($pos, $insertText)
            Write-Host "Inserted <IdField form={form} /> near modal guard in $fileRel"
        } else {
            Write-Host "Modal already contains IdField near showModal guard in $fileRel"
        }
    } else {
        # try another common pattern: "showModal && ( <div" etc. If not found, we skip
        Write-Host "No modal guard 'showModal && (' found in $fileRel (skip modal insertion)"
    }

    # 5) If add-mode forms create an input with placeholder or value for id (like value={form.id}) and no readOnly attribute was added,
    #    make sure adding is allowed: we don't want users to edit id. (We already added readOnly for name/id and id attr above.)
    #    Finally write file
    Set-Content -Path $filePath -Value $content -Encoding UTF8
    Write-Host "Patched file written: $fileRel" -ForegroundColor Green
}

Write-Host "Done. Backups are in each feature's fix_backups folder (if any changes were made)."
Write-Host "Restart your frontend: npm run dev"
