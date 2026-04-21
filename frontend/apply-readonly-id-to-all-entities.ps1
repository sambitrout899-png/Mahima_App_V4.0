<#
apply-readonly-id-to-all-entities.ps1

Place in project root and run:
  .\apply-readonly-id-to-all-entities.ps1

Creates src/components/IdField.jsx (if missing).
Replaces id label/input blocks in src/features/**/Page.jsx with <IdField ... />
Adds import for IdField if not present.
Backs up modified files.
#>

Set-StrictMode -Version Latest

$projectRoot = (Resolve-Path ".").Path
Write-Host "Project root:`t$projectRoot"

# Ensure components directory
$componentsDir = Join-Path $projectRoot "src\components"
if (-not (Test-Path $componentsDir)) {
    New-Item -ItemType Directory -Path $componentsDir | Out-Null
    Write-Host "Created directory:`t$componentsDir"
}

# Create IdField.jsx if missing
$idFieldPath = Join-Path $componentsDir "IdField.jsx"
if (-not (Test-Path $idFieldPath)) {
    $idFieldContent = @'
import React, { useEffect } from "react";

/**
 * IdField component: readonly id input
 * Props:
 *  - form: object
 *  - setField: function(name, value)
 *
 * If no id present and setField is provided, a UUID will be generated and set.
 */
function genUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function IdField({ form = {}, setField }) {
  useEffect(() => {
    try {
      if ((!form || !form.id) && typeof setField === "function") {
        const uuid = genUuid();
        setField("id", uuid);
      }
    } catch (e) {
      // swallow errors from mismatch setField signatures
      // component still renders readonly input
      // eslint-disable-next-line no-console
      console.warn("IdField: setField call failed:", e);
    }
  }, [form, setField]);

  const valueToShow = form && form.id ? form.id : "";

  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      id
      <input
        readOnly
        value={valueToShow}
        placeholder="(auto-generated)"
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 4,
          boxSizing: "border-box",
        }}
        onChange={() => {}}
      />
    </label>
  );
}
'@

    $idFieldContent | Out-File -FilePath $idFieldPath -Encoding utf8
    Write-Host "Created component:`t src/components/IdField.jsx"
} else {
    Write-Host "Component exists:`t src/components/IdField.jsx (not overwritten)"
}

# Find Page.jsx files under src/features
$featuresDir = Join-Path $projectRoot "src\features"
if (-not (Test-Path $featuresDir)) {
    Write-Host "No src/features directory found. Exiting."
    exit 0
}

$pages = Get-ChildItem -Path $featuresDir -Recurse -Filter "Page.jsx" -File -ErrorAction SilentlyContinue

if (-not $pages -or $pages.Count -eq 0) {
    Write-Host "No Page.jsx files found under src/features. Nothing to do."
    exit 0
}

# Regex to find <label ...>id ...</label> blocks (case-insensitive, singleline)
# This should match most patterns where label text begins with "id".
# Uses non-greedy match to avoid swallowing entire file.
$labelIdPattern = '(?is)<label\b[^>]*>\s*id\b[\s\S]*?<\/label>'

foreach ($page in $pages) {
    $path = $page.FullName
    # create a relative path for nicer output
    $rel = $path.Substring($projectRoot.Length).TrimStart('\','/')

    try {
        $orig = Get-Content -Raw -Path $path -ErrorAction Stop
    } catch {
        Write-Host "Failed to read file:`t$rel - skipping."
        continue
    }

    # Skip files already referencing IdField (avoid double-edit)
    if ($orig -match '\bIdField\b') {
        Write-Host "Skipping (already contains IdField): $rel"
        continue
    }

    # Only replace if we find an id label block
    if (-not [regex]::IsMatch($orig, $labelIdPattern)) {
        Write-Host "No id <label> blocks found in $rel"
        continue
    }

    # Replace all occurrences with the IdField usage
    $replacement = '<IdField form={form} setField={setField} />'
    $new = [regex]::Replace($orig, $labelIdPattern, $replacement)

    if ($new -eq $orig) {
        Write-Host "Regex matched but replacement yielded no change for $rel"
        continue
    }

    # Add import for IdField if missing - try to insert after imports block
    if ($new -notmatch "import\s+IdField\s+from") {
        # Try to detect the end of import block at top of file
        $importsPattern = '(?m)^(import\s.+;\s*)+'
        $m = [regex]::Match($new, $importsPattern)
        $importLine = "import IdField from '../../components/IdField';`r`n"
        if ($m.Success) {
            $insertPos = $m.Index + $m.Length
            $new = $new.Insert($insertPos, $importLine)
        } else {
            # no import block, just prepend
            $new = $importLine + $new
        }
    }

    # Backup original file
    $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $bakPath = "$path.bak_$ts"
    Copy-Item -Path $path -Destination $bakPath -Force

    # Write modified file (utf8)
    try {
        $new | Set-Content -Path $path -Encoding UTF8
        Write-Host "Patched $rel -> replaced id label with IdField (backup: $(Split-Path $bakPath -Leaf))"
    } catch {
        Write-Host "Failed to write patched file for $rel - restoring backup"
        Copy-Item -Path $bakPath -Destination $path -Force
    }
}

Write-Host ""
Write-Host "Done. Please restart the dev server (npm run dev)."
Write-Host "If some pages still show editable id fields, open the offending Page.jsx and search for 'name=\"id\"' or other patterns and paste the snippet here; I'll update the script to match them."
