# restore-or-replace-page.ps1
# Run from frontend root: ./restore-or-replace-page.ps1
# This will try to restore a backup of Page.jsx; if none found it writes a minimal working Page.jsx.

$ProjectRoot = "C:\Users\Administrator\projects\mahima-frontend"
$PageRel = "src\features\users\Page.jsx"
$PagePath = Join-Path $ProjectRoot $PageRel

if (-not (Test-Path $PagePath)) {
    Write-Host "ERROR: Page.jsx not found at $PagePath" -ForegroundColor Red
    exit 1
}

# Make a timestamped backup of the broken file
$timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$corruptBackup = "$PagePath.corrupt_$timestamp.bak"
Copy-Item -Path $PagePath -Destination $corruptBackup -Force
Write-Host "Backed up current (possibly corrupted) Page.jsx -> $corruptBackup"

# Try to find earlier backups in usual location(s)
$possibleBackupDirs = @(
    Join-Path (Split-Path $PagePath -Parent) "fix_backups",
    $ProjectRoot,
    Join-Path $ProjectRoot "src\features\users"
)

$foundBackup = $null
foreach ($d in $possibleBackupDirs) {
    if (Test-Path $d) {
        $matches = Get-ChildItem -Path $d -Filter "Page.jsx.bak_*" -File -ErrorAction SilentlyContinue |
                   Sort-Object LastWriteTime -Descending
        if ($matches -and $matches.Count -gt 0) {
            $foundBackup = $matches[0].FullName
            break
        }
    }
}

if ($foundBackup) {
    Copy-Item -Path $foundBackup -Destination $PagePath -Force
    Write-Host "Restored Page.jsx from backup: $foundBackup" -ForegroundColor Green
    Write-Host "Now restart your frontend dev server: npm run dev"
    exit 0
}

# No prior backup found — write a minimal safe Page.jsx that fetches /api/users and displays a table.
Write-Host "No Page.jsx backup found. Writing a minimal working Page.jsx to replace the corrupted file." -ForegroundColor Yellow

$replacement = @'
import React, { useEffect, useState } from "react";

/**
 * Minimal Users Page
 * - Fetches /api/users?search=&page=1&limit=50
 * - Normalizes {items: []} or [] response
 * - Displays a simple table with id, name, username, email
 *
 * NOTE: This is intentionally small and self-contained so your dev server can boot.
 * If you had more logic in original Page.jsx, restore it from your source control afterwards.
 */

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const resp = await fetch("http://localhost:5001/api/users?search=&page=1&limit=50");
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      const items = Array.isArray(data) ? data : (data && (data.items || data.data || []));
      setUsers(items || []);
    } catch (err) {
      console.error("users load error", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Users</h1>
      {loading && <div>Loading users…</div>}
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      {!loading && !error && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>id</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>name</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>username</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>email</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "12px" }}>No users</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{u.id}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{u.name ?? u.displayName ?? u.username ?? ""}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{u.username ?? ""}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{u.email ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
'@

# Write replacement file
Set-Content -Path $PagePath -Value $replacement -Encoding UTF8
Write-Host "Wrote minimal Page.jsx. Backup of corrupted file kept at: $corruptBackup" -ForegroundColor Green
Write-Host "Now restart your frontend dev server: npm run dev"
