# repair-pagejs.ps1
# Simple repair: backup Page.jsx and replace corrupted async\ function with clean async function.

$PagePath = "C:\Users\Administrator\projects\mahima-frontend\src\features\users\Page.jsx"
if (-not (Test-Path $PagePath)) {
    Write-Host "ERROR: Page.jsx not found at $PagePath" -ForegroundColor Red
    exit 1
}

# Backup current file
$backup = "$PagePath.broken_$(Get-Date -Format yyyyMMdd_HHmmss).bak"
Copy-Item $PagePath $backup -Force
Write-Host "Backed up current Page.jsx to $backup"

# Load content
$content = Get-Content -Raw $PagePath

# Define clean load() function
$cleanLoad = @"
async function load() {
  try {
    console.info("[fix] users.load() called - fetching direct from API");
    const resp = await fetch("http://localhost:5001/api/users?search=&page=1&limit=50", { method: "GET" });
    const data = await resp.json();
    console.info("[fix] raw API response:", data);

    const items = Array.isArray(data) ? data : (data && (data.items || data.data || []));
    console.info("[fix] normalized items (length):", items.length, items && items.slice(0,3));

    if (typeof setUsers === "function") {
      setUsers(items);
      console.info("[fix] setUsers called with items");
    }

    if (!Array.isArray(data)) {
      if (typeof setTotal === "function") setTotal(data.total ?? items.length);
      if (typeof setPage === "function") setPage(data.page ?? 1);
      if (typeof setLimit === "function") setLimit(data.limit ?? items.length);
    }
  } catch (err) {
    console.error("[fix] users.load() error:", err);
  }
}
"@

# Replace any corrupted async\ function ... load block with the clean one
$newContent = $content -replace 'async\\s*function\\s*load[^{]*{[\s\S]*?}', $cleanLoad

# If nothing was replaced, append instead
if ($newContent -eq $content) {
    Write-Host "Did not find corrupted block. Appending clean load() at the end of file."
    $newContent = $content + "`r`n" + $cleanLoad
}

# Save new content
Set-Content -Path $PagePath -Value $newContent -Encoding UTF8
Write-Host "Page.jsx repaired with clean load(). Now run: npm run dev"
