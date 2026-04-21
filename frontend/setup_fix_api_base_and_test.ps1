<#
setup_fix_api_base_and_test.ps1

1) Creates .env.local with VITE_API_BASE_URL if missing (points to http://localhost:5001).
2) Tests each API endpoint with a GET and prints results.
3) Gives guidance based on results.

Usage:
  - Open PowerShell.
  - From anywhere: .\setup_fix_api_base_and_test.ps1
  - Or cd to project root and run: .\setup_fix_api_base_and_test.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Find-ProjectRoot {
  $p = (Get-Location).Path
  while ($p -and (Split-Path $p -Parent) -ne $p) {
    if (Test-Path (Join-Path $p 'package.json')) { return $p }
    $p = Split-Path $p -Parent
  }
  # check root
  if (Test-Path (Join-Path $p 'package.json')) { return $p }
  return $null
}

$proj = Find-ProjectRoot
if (-not $proj) {
  Write-Error "Could not find project root (package.json). Run this script inside your project folder."
  exit 1
}
Write-Host "Project root: $proj"

# 1) Create .env.local if missing
$envPath = Join-Path $proj '.env.local'
$defaultBase = 'http://localhost:5001'

if (-not (Test-Path $envPath)) {
  $envContent = "VITE_API_BASE_URL=$defaultBase`n"
  [System.IO.File]::WriteAllText($envPath, $envContent, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ".env.local created with VITE_API_BASE_URL=$defaultBase"
} else {
  $existing = Get-Content -Path $envPath -Raw -ErrorAction SilentlyContinue
  if ($existing -match 'VITE_API_BASE_URL\s*=') {
    Write-Host ".env.local already contains VITE_API_BASE_URL (left unchanged)."
    Write-Host "Contents:"
    Write-Host "-----------------"
    Write-Host $existing
    Write-Host "-----------------"
  } else {
    $append = "`nVITE_API_BASE_URL=$defaultBase`n"
    Add-Content -Path $envPath -Value $append -Encoding UTF8
    Write-Host "Appended VITE_API_BASE_URL=$defaultBase to .env.local"
  }
}

# 2) Test endpoints by calling the backend directly
$apiBase = $defaultBase
Write-Host "`nTesting endpoints at $apiBase ...`n"

$endpoints = @(
  '/api/users',
  '/api/teams',
  '/api/tasks',
  '/api/sermons',
  '/api/prayerrequests',
  '/api/meetings',
  '/api/attachments'
)

# helper to test GET
function Test-Get($url) {
  try {
    $r = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 10
    return @{ ok = $true; status = $r.StatusCode; statusText = $r.StatusDescription; length = $r.Content.Length }
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp -ne $null) {
      $status = [int]$resp.StatusCode
      $statusText = $resp.StatusDescription
      return @{ ok = $false; status = $status; statusText = $statusText }
    } else {
      return @{ ok = $false; status = 0; statusText = $_.Exception.Message }
    }
  } catch {
    return @{ ok = $false; status = 0; statusText = $_.Exception.Message }
  }
}

# iterate and print results
$results = @()
foreach ($ep in $endpoints) {
  $full = $apiBase.TrimEnd('/') + $ep
  Write-Host "GET $full ..." -NoNewline
  $res = Test-Get $full
  if ($res.ok) {
    Write-Host "  => $($res.status) OK, content len: $($res.length)"
  } else {
    Write-Host "  => $($res.status) $($res.statusText)"
  }
  $results += @{ endpoint = $ep; status = $res.status; ok = $res.ok; info = $res.statusText }
}

# 3) Summary and guidance
Write-Host "`nSummary:"
foreach ($r in $results) {
  $s = $r.status
  $ep = $r.endpoint
  if ($s -eq 200) {
    Write-Host " - $ep => 200 OK"
  } elseif ($s -eq 405) {
    Write-Host " - $ep => 405 Method Not Allowed  (server refuses the HTTP verb: check client method or endpoint path)"
  } elseif ($s -eq 404) {
    Write-Host " - $ep => 404 Not Found   (verify your backend exposes this route/path)"
  } elseif ($s -eq 0) {
    Write-Host " - $ep => network error or no response: $($r.info)"
  } else {
    Write-Host " - $ep => $s : $($r.info)"
  }
}

Write-Host "`nIf you see 200 OK for the endpoints, the frontend should be able to call them. If you see 405 for the list endpoints, check your backend routing (list must support GET)."
Write-Host "`nNext steps (choose one):"
Write-Host " 1) If many endpoints returned 200 -> restart dev server (npm run dev) and reload the browser."
Write-Host " 2) If endpoints returned 404 -> ensure the backend is running at $apiBase and exposes the listed routes."
Write-Host " 3) If endpoints returned 405 -> either the client is calling the wrong method or the backend route only supports POST. In that case:"
Write-Host "     - open browser DevTools -> Network -> repeat the failing request -> check Request Method and Request URL."
Write-Host "     - paste the failing request Method/URL/Response body here and I will help adapt the client."
Write-Host "`nFinally: after changing .env.local you must restart the Vite dev server so import.meta.env picks up the new value: npm run dev"
