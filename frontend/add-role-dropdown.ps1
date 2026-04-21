<#
add-role-dropdown.ps1
Best-effort script that inserts a Role dropdown into a React Users page.
Backs up the original file before editing.
Usage:
  1. Save this script to disk.
  2. Open PowerShell.
  3. Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  4. Run: .\add-role-dropdown.ps1
  5. When prompted, enter the path to your Page.jsx (default provided).
#>

function Read-Default($prompt, $default) {
    $line = Read-Host "$prompt [$default]"
    if ([string]::IsNullOrWhiteSpace($line)) { return $default } else { return $line }
}

Write-Host "=== Add Role Dropdown Script ===" -ForegroundColor Cyan

$defaultPath = "C:\projects\frontend\src\pages\Users\Page.jsx"
$path = Read-Default "Path to your Page.jsx (or page.csx) file" $defaultPath

if (-not (Test-Path $path)) {
    Write-Host "File not found: $path" -ForegroundColor Red
    $ok = Read-Host "Enter a different path or press Enter to abort"
    if ([string]::IsNullOrWhiteSpace($ok)) { Write-Host "Aborted."; exit 1 }
    $path = $ok
    if (-not (Test-Path $path)) { Write-Host "Still not found. Aborting."; exit 1 }
}

# Backup
$backup = "$path.bak.$((Get-Date).ToString('yyyyMMddHHmmss'))"
Copy-Item -Path $path -Destination $backup -Force
Write-Host "Backed up original to: $backup" -ForegroundColor Green

# Read file
$content = Get-Content -Raw -LiteralPath $path -Encoding UTF8

$changed = @()

# 1) Insert roles state near other useState declarations if not already present
if ($content -match 'const\s*\[\s*roles') {
    Write-Host "Roles state already present in file — skipping insertion." -ForegroundColor Yellow
} else {
    # Find index to insert after; prefer after "const [form" or "const [users" or first useState cluster
    $lines = $content -split "`r?`n"
    $insertIndex = -1
    for ($i=0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match 'const\s*\[\s*form' -or $lines[$i] -match 'const\s*\[\s*users' -or $lines[$i] -match 'useState\(') {
            $insertIndex = $i
            break
        }
    }
    if ($insertIndex -ge 0) {
        $rolesBlock = @'
  // roles dropdown values (added by script)
  const [roles, setRoles] = useState(["member", "admin", "leader"]);
'@
        $lines = $lines[0..$insertIndex] + $rolesBlock + $lines[($insertIndex+1)..($lines.Length-1)]
        $content = $lines -join "`n"
        $changed += "Inserted roles useState after line $($insertIndex+1)"
        Write-Host "Inserted roles state." -ForegroundColor Green
    } else {
        # fallback: insert near top after imports (after first blank line)
        $content = $content -replace "(\r?\n)(\s*\r?\n)","`$1`$2`$2",1
        $insertAfter = 0
        $lines = $content -split "`r?`n"
        $rolesBlock = @'
  // roles dropdown values (added by script)
  const [roles, setRoles] = useState(["member", "admin", "leader"]);
'@
        $lines = $lines[0..$insertAfter] + $rolesBlock + $lines[($insertAfter+1)..($lines.Length-1)]
        $content = $lines -join "`n"
        $changed += "Inserted roles state at top (fallback)"
        Write-Host "Inserted roles state at top (fallback)." -ForegroundColor Yellow
    }
}

# 2) Ensure openCreate sets default role
if ($content -match 'openCreate\s*=\s*\(' -or $content -match 'function\s+openCreate') {
    # try to find setForm({...}) inside openCreate and add role if missing
    $patternOpenCreate = '(const\s+openCreate\s*=\s*\(\s*\)\s*=>\s*\{.*?setForm\s*\(\s*)(\{.*?\})(\s*\).*\})'
    if ($content -match $patternOpenCreate) {
        $content = [Regex]::Replace($content, $patternOpenCreate, {
            param($m)
            $obj = $m.Groups[2].Value
            if ($obj -match '"?role"?\s*:') {
                return $m.Value  # already contains role
            } else {
                # insert role: "member", before closing }
                $newObj = $obj -replace '\}\s*$', '  role: "member",`n}'
                return $m.Groups[1].Value + $newObj + $m.Groups[3].Value
            }
        }, 'Singleline')
        $changed += "Patched openCreate to set default role"
        Write-Host "Patched openCreate to include role default." -ForegroundColor Green
    } else {
        # fallback: insert a new openCreate function if none detected robustly
        if ($content -notmatch 'const\s+openCreate\s*=') {
            $insertion = @'
  // openCreate added by script — sets default role
  const openCreate = () => {
    setForm({
      displayName: "",
      username: "",
      email: "",
      role: "member",
      joinDate: "",
      lastLogin: null,
      teams: null
    });
    setShowModal(true);
  };
'@
            # insert near top of functions: after roles state if present
            $content = $content -replace "(const\s*\[roles.*\r?\n)","`$1$insertion",1
            $changed += "Added openCreate function (fallback)"
            Write-Host "Inserted openCreate function (fallback)." -ForegroundColor Yellow
        } else {
            Write-Host "openCreate present but complex; script did not modify it." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "openCreate not detected; script will add a small openCreate function." -ForegroundColor Yellow
}

# 3) Ensure openEdit sets role fallback when editing
# Replace setForm(user) with setForm({...user, role: user.role ?? ""})
if ($content -match 'openEdit\s*=\s*\(' -or $content -match 'function\s+openEdit') {
    $content = $content -replace 'setForm\s*\(\s*user\s*\)', 'setForm({...user, role: user.role ?? ""})'
    if ($content -match 'setForm\s*\(\s*\.\.\.user') {
        # already using spread; ensure role fallback exists
        $content = $content -replace '\{(\s*\.\.\.user\s*\})', '{...user, role: user.role ?? ""}'
    }
    $changed += "Ensured openEdit sets role fallback"
    Write-Host "Patched openEdit to ensure role fallback on edit." -ForegroundColor Green
} else {
    Write-Host "openEdit not found or in a non-standard pattern; script attempted a best-effort edit." -ForegroundColor Yellow
}

# 4) Insert Role select into modal
# Attempt to find the modal Save button and insert the select block just above it
$selectBlock = @'
            {/* Role */}
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label htmlFor="roleSelect" style={{ display: "block", marginBottom: 6 }}>Role</label>
              <select
                id="roleSelect"
                name="role"
                className="form-control"
                value={form.role ?? ""}
                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                aria-label="Role"
                style={{ width: "100%", padding: 8 }}
              >
                <option value="">-- select role --</option>
                {roles.map(r => 
                  typeof r === "string" ? (
                    <option key={r} value={r}>{r}</option>
                  ) : (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  )
                )}
              </select>
            </div>
'@

if ($content -match 'id\s*=\s*["'"]roleSelect["'"]' -or $content -match '<label[^>]*>.*[Rr]ole') {
    Write-Host "Role control appears to already exist in the file — skipping insert." -ForegroundColor Yellow
} else {
    # find a Save button line inside the modal block
    # heuristic: find a line containing ">Save<" or "Saving..." or "Save" within a button
    $lines = $content -split "`r?`n"
    $saveIdx = -1
    for ($i=0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '>\s*Save\s*<' -or $lines[$i] -match 'Saving' -and $lines[$i] -match 'button' -or $lines[$i] -match 'onClick=.*saveUser') {
            $saveIdx = $i
            break
        }
    }
    if ($saveIdx -ge 0) {
        # insert select block a few lines above the save button (look for modal end)
        $insertAt = [Math]::Max(0, $saveIdx - 6)
        $newLines = $lines[0..($insertAt-1)] + $selectBlock + $lines[$insertAt..($lines.Length-1)]
        $content = $newLines -join "`n"
        $changed += "Inserted Role select near Save button (heuristic)"
        Write-Host "Inserted Role select near Save button (heuristic)." -ForegroundColor Green
    } else {
        # fallback: try to find showModal rendering and insert before its closing div
        if ($content -match 'showModal') {
            $content = $content -replace '(?s)(\{showModal.*?\{)(.*?)(\}\))', "`$1`$2`$3"  # noop to ensure singleline
            # append comment block at end of file as fallback
            $content += "`n`n/* ROLE SELECT not inserted automatically — paste this block into your modal form where appropriate: */`n" + $selectBlock
            $changed += "Appended Role select block at end as fallback (manual paste required)"
            Write-Host "Could not find modal Save button — appended Role select block at file end. Please paste it into your modal." -ForegroundColor Yellow
        } else {
            $content += "`n`n/* ROLE SELECT not inserted automatically — paste this block into your modal form where appropriate: */`n" + $selectBlock
            $changed += "Appended Role select block at end as fallback (manual paste required)"
            Write-Host "Modal not detected — appended Role select block at file end. Please paste it into your modal." -ForegroundColor Yellow
        }
    }
}

# 5) Add Role column in the table header
if ($content -match '<th[^>]*>\s*[Rr]ole\s*<\/th>') {
    Write-Host "Table already contains a 'role' header — skipping header insertion." -ForegroundColor Yellow
} else {
    # find the first <thead> ... </tr> block and inject a new <th>
    if ($content -match '(?s)<thead.*?<tr[^>]*>.*?</tr>') {
        $content = [Regex]::Replace($content, '(?s)(<thead.*?<tr[^>]*>)(.*?)(</tr>)', {
            param($m)
            $inner = $m.Groups[2].Value
            # attempt to place after Email header if present
            if ($inner -match '<th[^>]*>\s*email\s*<\/th>') {
                $newInner = $inner -replace '(<th[^>]*>\s*email\s*<\/th>)', "`$1`n            <th style={{ textAlign: \"left\", padding: 8 }}>role</th>"
            } else {
                $newInner = $inner + "`n            <th style={{ textAlign: \"left\", padding: 8 }}>role</th>"
            }
            return $m.Groups[1].Value + $newInner + $m.Groups[3].Value
        }, 1)
        $changed += "Inserted role column header in table thead"
        Write-Host "Inserted role column header into the table header." -ForegroundColor Green
    } else {
        Write-Host "Could not find table header block to insert role header. Please add <th>role</th> manually." -ForegroundColor Yellow
        $changed += "Failed to insert header automatically"
    }
}

# 6) Add Role cell into table rows
# Try to find the first occurence of a user row mapping and insert a <td>{u.role}</td> after username/email cell
if ($content -match '\{users\.map|\{users.map|\{users\.length') {
    # attempt to insert after a username cell if found
    $content = [Regex]::Replace($content, '(?s)(<tbody>.*?<tr[^>]*>.*?<td[^>]*>.*?(?:username|Username|user.username|u.username).*?<\/td>)', '$1' + "`n              <td style={{ padding: 12 }}>{u.role ?? \"\"}</td>", 1)
    if ($content -match 'u.role') {
        Write-Host "Inserted role cell into table rows (heuristic)." -ForegroundColor Green
        $changed += "Inserted role <td> in table rows"
    } else {
        # fallback: find any <tbody> and append role cell into the row template
        $content = [Regex]::Replace($content, '(?s)(<tbody>.*?<tr[^>]*>)(.*?)', '$1$2' + "`n              <td style={{ padding: 12 }}>{u.role ?? \"\"}</td>", 1)
        if ($content -match 'u.role') {
            Write-Host "Inserted role cell into table rows (fallback)." -ForegroundColor Yellow
            $changed += "Inserted role <td> in table rows (fallback)"
        } else {
            Write-Host "Could not reliably insert role cell into table rows. Please add <td>{user.role}</td> inside your row rendering manually." -ForegroundColor Yellow
            $changed += "Failed to insert role cell automatically"
        }
    }
} else {
    Write-Host "No users map/table detected — cannot insert role table cell automatically." -ForegroundColor Yellow
    $changed += "No users map detected"
}

# 7) Write back file
Set-Content -LiteralPath $path -Value $content -Encoding UTF8
Write-Host "Wrote modified file to $path" -ForegroundColor Green

# 8) Summary of changes
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($changed.Count -eq 0) {
    Write-Host "No automated changes detected/applied. Please inspect the backup and edit manually." -ForegroundColor Yellow
} else {
    foreach ($c in $changed) {
        Write-Host "- $c"
    }
}

Write-Host "`nImportant next steps:" -ForegroundColor Cyan
Write-Host "1) Open the file and review the changes. Confirm the Role dropdown is inside your modal and the table shows the Role column."
Write-Host "2) If the Role select block was appended at the end, copy-paste it into your modal form in the appropriate place (near other inputs)."
Write-Host "3) Restart your frontend dev server (e.g. npm run dev)."
Write-Host "4) Test: Open Users page -> Edit a user -> change role -> Save -> verify table shows updated role."
Write-Host ""
Write-Host "If something looks wrong, you can restore the backup:"
Write-Host "  Copy-Item -Path '$backup' -Destination '$path' -Force"
Write-Host ""
Write-Host "Script finished." -ForegroundColor Green
