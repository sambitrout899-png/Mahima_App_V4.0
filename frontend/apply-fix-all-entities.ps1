# apply-fix-all-entities.ps1
# Run from project root (where package.json lives)

Set-StrictMode -Version Latest
$projRoot = Get-Location
$files = Get-ChildItem -Path "$projRoot\src\features" -Recurse -Filter "Page.jsx" -ErrorAction SilentlyContinue

if (-not $files) {
    Write-Error "No Page.jsx files found under src/features. Run this from project root."
    exit 1
}

function Backup-File($path) {
    $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $bak = "$path.bak_$ts"
    Copy-Item -Path $path -Destination $bak -Force
    return $bak
}
function Safe-Write($path, $content) {
    $tmp = "$path.tmp"
    Set-Content -Path $tmp -Value $content -Encoding UTF8
    Move-Item -Path $tmp -Destination $path -Force
}

foreach ($f in $files) {
    $path = $f.FullName
    Write-Host "Processing: $path"
    $orig = Get-Content -Raw -Path $path -ErrorAction Stop
    $modified = $orig
    $changed = $false

    # --- 1) Normalize/Insert DetectFields fallback ---
    if ($modified -notmatch "function\s+DetectFields\s*\(") {
        # no DetectFields: insert after imports block if any, else top
        $insertion = @"
function DetectFields(obj) {
  if (!obj || typeof obj !== 'object') return ['id','name'];
  return Object.keys(obj);
}
"@
        if ($modified -match "^(?:import[^\r\n]*\r?\n)+") {
            $m = [regex]::Match($modified, "^(?:import[^\r\n]*\r?\n)+")
            $insertPos = $m.Index + $m.Length
            $modified = $modified.Substring(0,$insertPos) + "`n" + $insertion + $modified.Substring($insertPos)
        } else {
            $modified = $insertion + "`n" + $modified
        }
        $changed = $true
        Write-Host "  -> Inserted DetectFields helper"
    } else {
        # Replace any existing DetectFields body with our canonical fallback using singleline option
        $pattern = "(?s)function\s+DetectFields\s*\(\s*obj\s*\)\s*\{.*?\}"
        $replacement = "function DetectFields(obj) {
  if (!obj || typeof obj !== 'object') return ['id','name'];
  return Object.keys(obj);
}"
        $new = [regex]::Replace($modified, $pattern, $replacement)
        if ($new -ne $modified) { $modified = $new; $changed = $true; Write-Host "  -> Normalized DetectFields fallback" }
    }

    # --- 2) Ensure isIdKey helper exists ---
    if ($modified -notmatch "function\s+isIdKey\s*\(") {
        # place after DetectFields if present
        $after = [regex]::Match($modified, "(?s)function\s+DetectFields\s*\(\s*obj\s*\)\s*\{.*?\}")
        $helper = @"
function isIdKey(k) {
  if (!k) return false;
  const s = String(k).toLowerCase();
  return s === 'id' || s.endsWith('id');
}
"
        if ($after.Success) {
            $pos = $after.Index + $after.Length
            $modified = $modified.Substring(0,$pos) + "`n" + $helper + $modified.Substring($pos)
        } else {
            $modified = $helper + "`n" + $modified
        }
        $changed = $true
        Write-Host "  -> Added isIdKey helper"
    }

    # --- 3) Replace DetectFields(...).map(...) modal rendering ---
    # We look for a pattern like: (DetectFields(...)).map(key => { ... })
    # Use a safe non-greedy singleline regex
    $mapPattern = "(?s)(DetectFields\s*\([^\)]*\)\s*\.map\s*\(\s*key\s*=>\s*\{)(.*?)(\}\s*\)\s*)"
    if ([regex]::IsMatch($modified, $mapPattern)) {
        $replacementBody = @"
$1
        // hide id-like fields in Add mode (when editing is falsy)
        if (!editing && isIdKey(key)) return null;

        const val = form[key] ?? '';
        const readonly = (editing && isIdKey(key));

        return (
          <div key={key}>
            <label className='block text-sm font-medium'>{key}{readonly ? <span className='text-red-500'>*</span> : null}</label>
            <input
              value={val}
              onChange={e => setForm({...form, [key]: e.target.value})}
              readOnly={readonly}
              className='w-full px-3 py-2 border rounded' />
          </div>
        );
$3
"@
        $new = [regex]::Replace($modified, $mapPattern, $replacementBody, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        if ($new -ne $modified) { $modified = $new; $changed = $true; Write-Host "  -> Replaced modal field mapping (hide id in Add, readonly in Edit)" }
    } else {
        Write-Host "  -> No DetectFields(...).map(...) block found (skipping mapping replacement)"
    }

    # --- 4) Inject Edit/Delete buttons into rows.map row rendering (best-effort) ---
    # We'll find the first rows.map(...) occurrence and attempt to append an actions <td> before </tr>
    $rowMapSimple = "(?s)rows\s*\.\s*map\s*\(\s*\(?\s*([^\),]+)\s*(?:,\s*([^\)]+))?\s*\)?\s*=>\s*\(\s*<tr\b(.*?)>(.*?)</tr>\s*\)\s*"
    if ([regex]::IsMatch($modified, $rowMapSimple)) {
        $modified = [regex]::Replace($modified, $rowMapSimple, {
            param($m)
            $full = $m.Value
            $trOpen = $m.Groups[0].Value
            $trInner = $m.Groups[4].Value
            # if it already contains Edit or Delete, skip
            if ($trInner -match "Edit" -or $trInner -match "Delete") { return $full }
            $actionsTd = @"
                <td className=""px-4 py-3"">
                  <div className=""flex gap-2"">
                    <button onClick={()=>openEdit($($m.Groups[1].Value.Trim()))} className=""text-blue-600"">Edit</button>
                    <button onClick={()=>onDelete($($m.Groups[1].Value.Trim()))} className=""text-red-600"">Delete</button>
                  </div>
                </td>
"@
            # append actions cell before closing of tr inner HTML
            $newInner = $trInner + $actionsTd
            # rebuild and return
            return $m.Value -replace [regex]::Escape($trInner), [System.Text.RegularExpressions.Regex]::Escape($newInner) -replace [System.Text.RegularExpressions.Regex]::Escape($newInner), $newInner
        }, 1, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        # note: the above replacement is conservative and may not always match; it's a best-effort insertion
        if ($modified -ne $orig) { $changed = $true; Write-Host "  -> Attempted to inject Edit/Delete into first rows.map block" }
        else { Write-Host "  -> rows.map found but injection heuristic didn't alter file (maybe already has actions)" }
    } else {
        Write-Host "  -> No rows.map pattern found (skipping actions insertion)"
    }

    if ($changed) {
        $bak = Backup-File $path
        Safe-Write -path $path -content $modified
        Write-Host "  Saved modified file; backup: $bak"
    } else {
        Write-Host "  No changes needed"
    }
}

Write-Host "`nDone. Review changed Page.jsx files and restart dev server (npm run dev). Backups are .bak_TIMESTAMP files."
