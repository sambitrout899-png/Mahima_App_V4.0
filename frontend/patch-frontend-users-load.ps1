# patch-frontend-users-load.ps1
# Usage: run from frontend root (where src/ is)
#   ./patch-frontend-users-load.ps1

$PagePath = "C:\Users\Administrator\projects\mahima-frontend\src\features\users\Page.jsx"
if (-not (Test-Path $PagePath)) {
    Write-Host "ERROR: Page.jsx not found at $PagePath" -ForegroundColor Red
    exit 1
}

$bak = "$PagePath.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
Copy-Item $PagePath $bak -Force
Write-Host "Backed up Page.jsx -> $bak"

$content = Get-Content -Raw -Path $PagePath

# Try to find a load function declaration and replace it with our robust loader.
# This handles common forms: "async function load() { ... }" and "const load = async () => { ... }"
$pattern1 = 'async function load\s*\(\)\s*\{[\s\S]*?\n\}'
$pattern2 = 'const\s+load\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\n\}'

$replacement = @'
async function load() {
  try {
    console.info("[fix] users.load() called - fetching direct from API");
    const resp = await fetch("http://localhost:5001/api/users?search=&page=1&limit=50", { method: "GET" });
    const data = await resp.json();
    console.info("[fix] raw API response:", data);

    // normalize to items array
    const items = Array.isArray(data) ? data : (data && (data.items || data.data || [])) ;
    console.info("[fix] normalized items (length):", items.length, items && items.slice(0,3));

    // Attempt to set component state - adjust names if your state setter is different
    if (typeof setUsers === "function") {
      setUsers(items);
      console.info("[fix] setUsers called with items");
    } else {
      console.warn("[fix] setUsers is not defined in this scope - please confirm state setter name");
    }

    // optional metadata setters (if present)
    if (!Array.isArray(data)) {
      if (typeof setTotal === "function") setTotal(data.total ?? items.length);
      if (typeof setPage === "function") setPage(data.page ?? 1);
      if (typeof setLimit === "function") setLimit(data.limit ?? items.length);
    }
  } catch (err) {
    console.error("[fix] users.load() error:", err);
  }
}
'@

$changed = $false
if ($content -match $pattern1) {
    $content = $content -replace $pattern1, [regex]::Escape($replacement)
    # the -replace above escaped the replacement; re-insert raw replacement
    $content = $content -replace [regex]::Escape($replacement), $replacement
    $changed = $true
} elseif ($content -match $pattern2) {
    $content = $content -replace $pattern2, [regex]::Escape($replacement)
    $content = $content -replace [regex]::Escape($replacement), $replacement
    $changed = $true
} else {
    # If no match, append the load function near top (after imports) as a fallback:
    $insertionPoint = $content.IndexOf("export default")
    if ($insertionPoint -gt 0) {
        $content = $content.Insert($insertionPoint, $replacement + "`n")
        $changed = $true
    }
}

if (-not $changed) {
    Write-Host "Failed to find a place to insert 'load' - aborting" -ForegroundColor Red
    exit 1
}

Set-Content -Path $PagePath -Value $content -Encoding UTF8
Write-Host "Patched Page.jsx. Backup at: $bak"
Write-Host "Now restart dev server (npm run dev), open browser console and reload /users."
