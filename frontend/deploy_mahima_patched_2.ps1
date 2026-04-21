<#
  deploy_mahima_patched.ps1
  Safe build + deploy for Mahima (Vite frontend + dotnet backend) to IIS.
  - copies /public and src/assets into dist before deploy
  - patches JS to point to /api safely and collapses duplicate /api/api
  - downloads external images (supports query-string URLs) into /assets and rewrites refs
  - backups, retry, rollback included
  Run as Administrator.
#>

# ---------- CONFIG ----------
$frontendSrc     = "C:\Users\Administrator\projects\mahima-frontend"
$backendSrc      = "C:\Projects\Mahima.Api\Mahima.Api"
$siteRoot        = "C:\inetpub\wwwroot"
$apiPublishPath  = "C:\inetpub\wwwroot\MahimaApi\publish"
$apiAppPoolName  = "MahimaApi"

# API URL patch patterns
$apiPatterns = @(
  "http://localhost:5001",
  "https://localhost:5001",
  "http://127.0.0.1:5001",
  "https://127.0.0.1:5001"
)
$apiReplacement = "/api"

# temp/backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$temp = Join-Path $env:TEMP "mahima_deploy_$timestamp"
$frontendBuildTemp = Join-Path $temp "frontend_build"
$backendPublishTemp = Join-Path $temp "backend_publish"
$backupRoot = Join-Path $temp "backups"

# ---------- UTILS ----------
function Abort($msg) {
  Write-Error "`n❌ $msg"
  Write-Host "Rolling back..."
  if (Test-Path (Join-Path $backupRoot "wwwroot_backup")) {
    robocopy (Join-Path $backupRoot "wwwroot_backup") $siteRoot /MIR /NP | Out-Null
  }
  if (Test-Path (Join-Path $backupRoot "api_publish_backup")) {
    robocopy (Join-Path $backupRoot "api_publish_backup") $apiPublishPath /MIR /NP | Out-Null
  }
  Write-Host "Rollback complete. Exiting..."
  exit 1
}

# ---------- SANITY CHECKS ----------
foreach ($path in @($frontendSrc,$backendSrc,$siteRoot)) {
  if (-not (Test-Path $path)) { Abort "Missing path: $path" }
}

foreach ($cmd in @("node","npm","dotnet","robocopy","iisreset")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Abort "Required command not found: $cmd"
  }
}

# Create working dirs
New-Item -Path $temp -ItemType Directory -Force | Out-Null
New-Item -Path $frontendBuildTemp -ItemType Directory -Force | Out-Null
New-Item -Path $backendPublishTemp -ItemType Directory -Force | Out-Null
New-Item -Path $backupRoot -ItemType Directory -Force | Out-Null

Write-Host "🚀 Deploy started at $timestamp" -ForegroundColor Cyan

# ---------- NEW: ENSURE CENTRAL API HELPER NORMALIZES /api ----------
# This ensures that during build the helper in source will prevent generating /api/api in bundles.
$helperPath = Join-Path $frontendSrc "src\api\_helper.js"
if (Test-Path $helperPath) {
  try {
    $helperBak = "$helperPath.bak_$timestamp"
    Copy-Item -Path $helperPath -Destination $helperBak -Force
    Write-Host "Backed up existing helper to: $helperBak"

    $helperContent = @'
/**
 * _helper.js - normalized API call helper written by deploy script
 * Prevents duplicate /api segments by normalizing base + path at build-time.
 */
const getApiBase = () => {
  const base = (typeof window !== "undefined" && window.__API_BASE__) || process.env.REACT_APP_API_URL || "/api";
  return base.toString().replace(/\/+$/g, "");
};

function buildUrl(pathOrUrl) {
  if (!pathOrUrl) return getApiBase();

  let p = pathOrUrl.toString();
  if (/^https?:\/\//i.test(p)) return p;
  p = p.replace(/^\/+/, "");

  const base = getApiBase();
  if (/\/?api$/i.test(base) && /^api\//i.test(p)) {
    p = p.replace(/^api\//i, "");
  }
  if (!p) return base || "/api";
  return base.replace(/\/+$/g, "") + "/" + p.replace(/^\/+/, "");
}

export async function call(pathOrUrl, opts = {}) {
  const url = buildUrl(pathOrUrl);
  const defaultHeaders = { Accept: "application/json" };

  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    opts.headers = opts.headers || {};
    if (!opts.headers["Content-Type"] && !opts.headers["content-type"]) {
      opts.headers["Content-Type"] = "application/json";
    }
    opts.body = JSON.stringify(opts.body);
  }

  const fetchOpts = Object.assign({}, { credentials: "same-origin" }, opts);
  fetchOpts.headers = Object.assign({}, defaultHeaders, (fetchOpts.headers || {}));

  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body; try { body = text ? JSON.parse(text) : null } catch { body = text }
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status; err.response = body; throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.indexOf("application/json") !== -1 ? res.json() : res.text();
}
'@

    # Write the helper file with UTF8
    Set-Content -LiteralPath $helperPath -Value $helperContent -Encoding UTF8 -Force
    Write-Host "Replaced source helper with normalized implementation."
  } catch {
    Write-Warning "Failed updating helper: $($_.Exception.Message)"
  }
} else {
  Write-Warning "Helper not found at $helperPath — skipping helper normalization."
}

# ---------- FRONTEND BUILD ----------
Write-Host "`n--- Building frontend (Vite) ---" -ForegroundColor Cyan
Push-Location $frontendSrc
try {
  npm ci
  npm run build
} catch {
  Pop-Location
  Abort "Frontend build failed: $($_.Exception.Message)"
}
Pop-Location

# Ensure public and src/assets get into dist (fix missing images)
Write-Host "Copying public and src/assets into dist (if present)..."
$distDir = Join-Path $frontendSrc "dist"
if (Test-Path (Join-Path $frontendSrc "public")) {
  try {
    Copy-Item -Path (Join-Path $frontendSrc "public\*") -Destination $distDir -Recurse -Force -ErrorAction Stop
    Write-Host "Copied public -> dist"
  } catch { Write-Warning "Failed to copy public -> dist: $($_.Exception.Message)" }
}
$srcAssets = Join-Path $frontendSrc "src\assets"
if (Test-Path $srcAssets) {
  try {
    $distAssets = Join-Path $distDir "assets"
    New-Item -ItemType Directory -Path $distAssets -Force | Out-Null
    Copy-Item -Path (Join-Path $srcAssets "*") -Destination $distAssets -Recurse -Force -ErrorAction Stop
    Write-Host "Copied src/assets -> dist/assets"
  } catch { Write-Warning "Failed to copy src/assets -> dist/assets: $($_.Exception.Message)" }
}
# also attempt other common asset locations
$candidateAssets = @(
  Join-Path $frontendSrc "assets",
  Join-Path $frontendSrc "public\assets"
)
foreach ($cand in $candidateAssets) {
  if (Test-Path $cand) {
    try {
      Copy-Item -Path (Join-Path $cand "*") -Destination (Join-Path $distDir "assets") -Recurse -Force -ErrorAction Stop
      Write-Host "Copied $cand -> dist/assets"
    } catch { Write-Warning "Failed to copy $cand -> dist/assets: $($_.Exception.Message)" }
  }
}

# Verify dist
$frontendDist = $distDir
if (-not (Test-Path $frontendDist)) { Abort "Frontend dist not found: $frontendDist" }

# copy dist to a safe temp folder we will patch before deploying
Write-Host "Copying dist -> temp build folder..."
Copy-Item -Path (Join-Path $frontendDist "*") -Destination $frontendBuildTemp -Recurse -Force

# ---------- PATCH BUILT JS & HTML ----------
Write-Host "`n--- Patching built JS/HTML files (api URLs + short fetch routes) ---" -ForegroundColor Cyan

# Files to patch
$patchFiles = Get-ChildItem -Path $frontendBuildTemp -Include *.js,*.html,*.htm -Recurse -ErrorAction SilentlyContinue

foreach ($f in $patchFiles) {
  try {
    $text = Get-Content -Raw -LiteralPath $f.FullName -ErrorAction Stop

    # 1) Replace explicit host+api like http://localhost:5001/api -> /api (first)
    foreach ($pat in $apiPatterns) {
      $explicit = "$pat/api"
      $text = $text -replace [regex]::Escape($explicit), $apiReplacement
    }

    # 2) Then replace bare host occurrences -> /api
    foreach ($pat in $apiPatterns) {
      $text = $text -replace [regex]::Escape($pat), $apiReplacement
    }

    # 3a) Replace fetch('/roles'...) when single-quoted -> fetch('/api/roles...')
    $text = [regex]::Replace($text,
      "fetch\(\s*'\/(roles|login|logout|user)([^')]*)'\s*\)",
      "fetch('/api/$1$2')")

    # 3b) Replace fetch("/roles"...) when double-quoted -> fetch("/api/roles...")
    $text = [regex]::Replace($text,
      'fetch\(\s*"\/(roles|login|logout|user)([^")]*)"\s*\)',
      'fetch("/api/$1$2")')

    # 3c) Replace any assignment to window.__API_BASE__ to "/api"
    $text = [regex]::Replace($text, "window\.__API_BASE__\s*=\s*[\"'].*?[\"']", 'window.__API_BASE__ = "/api"')

    # 4) Final cleanup: collapse repeated /api sequences (e.g. /api/api or /api/api/api) -> single /api
    $text = [regex]::Replace($text, '(?:/api){2,}', '/api')

    # Write back (explicit UTF8)
    Set-Content -LiteralPath $f.FullName -Value $text -Force -Encoding UTF8
    Write-Host "Patched: $($f.FullName -replace [regex]::Escape($frontendBuildTemp),'...')"
  } catch {
    Write-Warning "Skip patch: $($_.Exception.Message) for $($f.FullName)"
  }
}

# ---------- DOWNLOAD EXTERNAL IMAGES (host locally) AND ENSURE /assets COPIED ----------
Write-Host "`n--- Scanning for external images to host locally and ensuring local assets ---" -ForegroundColor Cyan
# pattern: http(s)://... ending with jpg|jpeg|png|webp and optional query string
$imagePattern = '(https?:\/\/[^
'