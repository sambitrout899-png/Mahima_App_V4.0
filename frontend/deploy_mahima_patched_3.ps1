# run as Administrator in script folder
$path = ".\deploy_mahima_patched_3.ps1"
if (-not (Test-Path $path)) { Write-Error "File not found: $path"; exit 1 }
Copy-Item $path ($path + ".bak") -Force

$fixed = @'
<# deploy_mahima_patched_3.ps1
   Cleaned, syntactically-correct deploy script (Vite frontend + dotnet backend).
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

# ---------- RUNNING CHECKS ----------
function Assert-Admin {
  $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) { Write-Error "This script must be run as Administrator."; exit 1 }
}
Assert-Admin

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

# sanity checks
foreach ($pathCheck in @($frontendSrc,$backendSrc,$siteRoot)) {
  if (-not (Test-Path $pathCheck)) { Abort "Missing path: $pathCheck" }
}
foreach ($cmd in @("node","npm","dotnet","robocopy","iisreset")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Abort "Required command not found: $cmd" }
}

# prepare dirs
New-Item -Path $temp -ItemType Directory -Force | Out-Null
New-Item -Path $frontendBuildTemp -ItemType Directory -Force | Out-Null
New-Item -Path $backendPublishTemp -ItemType Directory -Force | Out-Null
New-Item -Path $backupRoot -ItemType Directory -Force | Out-Null

Write-Host "🚀 Deploy started at $timestamp" -ForegroundColor Cyan

# ---------- HELPER NORMALIZATION ----------
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
  if (/\/?api$/i.test(base) && /^api\//i.test(p)) p = p.replace(/^api\//i, "");
  if (!p) return base || "/api";
  return base.replace(/\/+$/g, "") + "/" + p.replace(/^\/+/, "");
}

export async function call(pathOrUrl, opts = {}) {
  const url = buildUrl(pathOrUrl);
  const defaultHeaders = { Accept: "application/json" };

  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    opts.headers = opts.headers || {};
    if (!opts.headers["Content-Type"] && !opts.headers["content-type"]) opts.headers["Content-Type"] = "application/json";
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

    Set-Content -LiteralPath $helperPath -Value $helperContent -Encoding UTF8 -Force
    Write-Host "Replaced source helper with normalized implementation."
  } 
  //catch {Write-Warning "Failed updating helper: $($_.Exception.Message)"}
//} else {Write-Warning "Helper not found at $helperPath — skipping normalization."}

# ---------- FRONTEND BUILD ----------
Write-Host "`n--- Building frontend (Vite) ---" -ForegroundColor Cyan
Push-Location $frontendSrc
try { npm ci; npm run build } catch { Pop-Location; Abort "Frontend build failed: $($_.Exception.Message)" }
Pop-Location

# ensure public and assets copied into dist
Write-Host "Copying public and src/assets into dist (if present)..."
$distDir = Join-Path $frontendSrc "dist"
if (Test-Path (Join-Path $frontendSrc "public")) {
  try { Copy-Item -Path (Join-Path $frontendSrc "public\*") -Destination $distDir -Recurse -Force -ErrorAction Stop; Write-Host "Copied public -> dist" } catch { Write-Warning "Failed to copy public -> dist: $($_.Exception.Message)" }
}
$srcAssets = Join-Path $frontendSrc "src\assets"
if (Test-Path $srcAssets) {
  try { $distAssets = Join-Path $distDir "assets"; New-Item -ItemType Directory -Path $distAssets -Force | Out-Null; Copy-Item -Path (Join-Path $srcAssets "*") -Destination $distAssets -Recurse -Force -ErrorAction Stop; Write-Host "Copied src/assets -> dist/assets" } catch { Write-Warning "Failed to copy src/assets -> dist/assets: $($_.Exception.Message)" }
}

# fallback common asset folders
$candidateAssets = @( Join-Path $frontendSrc "assets", Join-Path $frontendSrc "public\assets" )
foreach ($cand in $candidateAssets) { if (Test-Path $cand) { try { Copy-Item -Path (Join-Path $cand "*") -Destination (Join-Path $distDir "assets") -Recurse -Force -ErrorAction Stop; Write-Host "Copied $cand -> dist/assets" } catch { Write-Warning "Failed to copy $cand -> dist/assets: $($_.Exception.Message)" } } }

if (-not (Test-Path $distDir)) { Abort "Frontend dist not found: $distDir" }
Copy-Item -Path (Join-Path $distDir "*") -Destination $frontendBuildTemp -Recurse -Force

# ---------- PATCH BUILT JS/HTML ----------
Write-Host "`n--- Patching built JS/HTML files ---" -ForegroundColor Cyan
$patchFiles = Get-ChildItem -Path $frontendBuildTemp -Recurse -File -Include *.js,*.html,*.htm -ErrorAction SilentlyContinue
foreach ($f in $patchFiles) {
  try {
    $text = Get-Content -Raw -LiteralPath $f.FullName -ErrorAction Stop

    foreach ($pat in $apiPatterns) {
      $explicit = "$pat/api"; $escaped = [regex]::Escape($explicit)
      $text = [regex]::Replace($text, $escaped, $apiReplacement, [System.Text.RegularExpressions.RegexOptions]::None)
    }
    foreach ($pat in $apiPatterns) {
      $escaped = [regex]::Escape($pat)
      $text = [regex]::Replace($text, $escaped, $apiReplacement, [System.Text.RegularExpressions.RegexOptions]::None)
    }

    $text = [regex]::Replace($text,"fetch\(\s*'\/(roles|login|logout|user)([^']*)'\s*\)","fetch('/api/$1$2')",[System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $text = [regex]::Replace($text,'fetch\(\s*"\/(roles|login|logout|user)([^\"]*)"\s*\)','fetch("/api/$1$2")',[System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $text = [regex]::Replace($text,"window\\.__API_BASE__\\s*=\\s*['\"].*?['\"]",'window.__API_BASE__ = "/api"',[System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $text = [regex]::Replace($text,'(?:/api){2,}','/api')

    Set-Content -LiteralPath $f.FullName -Value $text -Force -Encoding UTF8
    Write-Host "Patched: $($f.FullName -replace [regex]::Escape($frontendBuildTemp),'...')"
  } catch {
    Write-Warning "Skip patch: $($_.Exception.Message) for $($f.FullName)"
  }
}

# ---------- EXTERNAL IMAGES -> /assets ----------
Write-Host "`n--- Scanning for external images to host locally ---" -ForegroundColor Cyan
$imagePattern = @'
(https?:\/\/[^\s'"'"'<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^\s'"'"'<>]*)?)
'@

$allTextFiles = Get-ChildItem -Path $frontendBuildTemp -Recurse -File -Include *.html,*.htm,*.js,*.css -ErrorAction SilentlyContinue
$assetsLocalDir = Join-Path $frontendBuildTemp "assets"
if (-not (Test-Path $assetsLocalDir)) { New-Item -Path $assetsLocalDir -ItemType Directory -Force | Out-Null }
$downloaded = @{}

foreach ($file in $allTextFiles) {
  try {
    $content = Get-Content -Raw -LiteralPath $file.FullName -ErrorAction Stop
    $matches = [regex]::Matches($content, $imagePattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    foreach ($m in $matches) {
      $rawUrl = $m.Groups[1].Value
      if ($rawUrl -match '^data:') { continue }
      try { $u = [uri]$rawUrl } catch { Write-Warning "Invalid URL skipped: $rawUrl"; continue }
      $fname = [System.IO.Path]::GetFileName($u.AbsolutePath); if ([string]::IsNullOrEmpty($fname)) { continue }
      $fname = ($fname -replace '[^a-zA-Z0-9\-\._]', '_'); $localPath = Join-Path $assetsLocalDir $fname

      if (-not (Test-Path $localPath) -and -not $downloaded.ContainsKey($rawUrl)) {
        $maxdl = 3; $dlAttempt = 0; $dlOk = $false
        while (-not $dlOk -and $dlAttempt -lt $maxdl) {
          $dlAttempt++
          try { Invoke-WebRequest -Uri $rawUrl -OutFile $localPath -TimeoutSec 20 -ErrorAction Stop; $dlOk = $true } catch { Start-Sleep -Seconds 1 }
        }
        if ($dlOk) { $downloaded[$rawUrl] = $fname; Write-Host ("Saved: {0}" -f $fname) } else { Write-Warning ("Failed to download {0}" -f $rawUrl) }
      } elseif ($downloaded.ContainsKey($rawUrl)) { $fname = $downloaded[$rawUrl] }

      if (Test-Path (Join-Path $assetsLocalDir $fname)) {
        $content = [regex]::Replace($content, [regex]::Escape($rawUrl), "/assets/$fname")
        $baseNoQuery = $u.GetLeftPart([System.UriPartial]::Path)
        $content = [regex]::Replace($content, [regex]::Escape($baseNoQuery), "/assets/$fname")
      }
    }

    $assetRefPattern = '/assets/([A-Za-z0-9\-\._]+\.(?:jpg|jpeg|png|webp))'
    $assetMatches = [regex]::Matches($content, $assetRefPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    foreach ($am in $assetMatches) {
      $refName = $am.Groups[1].Value
      $targetLocal = Join-Path $assetsLocalDir $refName
      if (-not (Test-Path $targetLocal)) {
        $candidates = @(
          Join-Path $frontendSrc ("public\assets\" + $refName),
          Join-Path $frontendSrc ("public\" + $refName),
          Join-Path $frontendSrc ("src\assets\" + $refName),
          Join-Path $frontendSrc ("assets\" + $refName)
        )
        foreach ($cand in $candidates) {
          if (Test-Path $cand) {
            try { Copy-Item -Path $cand -Destination $targetLocal -Force -ErrorAction Stop; Write-Host ("Copied project asset {0} -> {1}" -f $cand, $targetLocal); break } catch { Write-Warning ("Failed to copy {0} -> {1}: {2}" -f $cand, $targetLocal, $_.Exception.Message) }
          }
        }
      }
    }

    Set-Content -LiteralPath $file.FullName -Value $content -Force -Encoding UTF8
  } catch { Write-Warning ("Skipping image-scan for {0}: {1}" -f $file.FullName, $_.Exception.Message) }
}

# ---------- BACKEND PUBLISH ----------
Write-Host "`n--- Publishing backend ---" -ForegroundColor Cyan
Push-Location $backendSrc
try { dotnet publish -c Release -o $backendPublishTemp } catch { Pop-Location; Abort "Backend publish failed: $($_.Exception.Message)" }
Pop-Location

# ---------- BACKUPS ----------
Write-Host "`n--- Creating backups ---" -ForegroundColor Cyan
$backupFrontend = Join-Path $backupRoot "wwwroot_backup"
$backupApi = Join-Path $backupRoot "api_publish_backup"
robocopy $siteRoot $backupFrontend /MIR /NP | Out-Null
if (Test-Path $apiPublishPath) { robocopy $apiPublishPath $backupApi /MIR /NP | Out-Null }

# ---------- FRONTEND DEPLOY ----------
Write-Host "`n--- Deploying frontend ---" -ForegroundColor Cyan
$excludeDirs = @("MahimaApi","logs","uploads")
$excludeArgs = ($excludeDirs | ForEach-Object { "/XD `"$siteRoot\$_`"" }) -join ' '
$robolog = Join-Path $temp "robocopy_frontend.log"
$cmd = "robocopy `"$frontendBuildTemp`" `"$siteRoot`" /MIR /XF web.config /R:2 /W:2 /NP $excludeArgs /LOG:`"$robolog`""
Write-Host "Running: $cmd"; cmd /c $cmd | Out-Null; Write-Host "Frontend copied. Log: $robolog"

# ---------- BACKEND DEPLOY ----------
Write-Host "`n--- Deploying backend ---" -ForegroundColor Cyan
Import-Module WebAdministration -ErrorAction SilentlyContinue
if (Get-WebAppPoolState -Name $apiAppPoolName -ErrorAction SilentlyContinue) {
  Write-Host "Stopping app pool: $apiAppPoolName"; Stop-WebAppPool -Name $apiAppPoolName -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2
}

$apiProcs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match "Mahima\\.Api" }
foreach ($p in $apiProcs) { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; Write-Host "Stopped PID $($p.ProcessId)" } catch { Write-Warning "Failed to stop PID $($p.ProcessId)" } }

if (Test-Path $apiPublishPath) { Get-ChildItem $apiPublishPath -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue } else { New-Item -ItemType Directory -Path $apiPublishPath -Force | Out-Null }
Copy-Item -Path (Join-Path $backendPublishTemp "*") -Destination $apiPublishPath -Recurse -Force

if (Get-WebAppPoolState -Name $apiAppPoolName -ErrorAction SilentlyContinue) { Start-WebAppPool -Name $apiAppPoolName -ErrorAction SilentlyContinue; Start-Sleep -Seconds 3 }

# ---------- WEB.CONFIG ----------
Write-Host "`n--- Writing improved web.config (backup then write) ---" -ForegroundColor Cyan
$siteWebConfig = Join-Path $siteRoot "web.config"
$webConfigBackup = Join-Path $backupRoot "web.config.backup_$timestamp"
try {
  if (Test-Path $siteWebConfig) { Copy-Item -Path $siteWebConfig -Destination $webConfigBackup -Force; Write-Host "Backing up existing web.config to: $webConfigBackup" } else { Write-Host "No existing web.config found - will create new." }

  $webconfigXml = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <defaultDocument><files><clear /><add value="index.html" /></files></defaultDocument>
    <staticContent>
      <remove fileExtension=".json" />
      <remove fileExtension=".map" />
      <remove fileExtension=".woff2" />
      <remove fileExtension=".js" />
      <remove fileExtension=".css" />
      <remove fileExtension=".svg" />
      <remove fileExtension=".ico" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".map" mimeType="application/json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
      <mimeMap fileExtension=".css" mimeType="text/css" />
      <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
      <mimeMap fileExtension=".ico" mimeType="image/x-icon" />
    </staticContent>
    <rewrite>
      <rules>
        <rule name="ProxyToAPI" stopProcessing="true"><match url="^api/(.*)" /><action type="Rewrite" url="http://localhost:5001/{R:1}" /></rule>
        <rule name="RedirectRootToIndex" stopProcessing="true"><match url="^$" /><action type="Rewrite" url="/index.html" /></rule>
        <rule name="IgnoreStaticAssets" stopProcessing="true"><match url="^(assets|static|favicon\.ico|manifest\.json|robots\.txt)(.*)" ignoreCase="true" /><action type="None" /></rule>
        <rule name="IgnoreExistingFiles" stopProcessing="true"><match url="^(.*)$" /><conditions><add input="{REQUEST_FILENAME}" matchType="IsFile" /></conditions><action type="None" /></rule>
        <rule name="ServeIndexForClientRoutes" stopProcessing="true"><match url=".*" /><conditions logicalGrouping="MatchAll"><add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" /><add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" /></conditions><action type="Rewrite" url="/index.html" /></rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
'@

  Set-Content -LiteralPath $siteWebConfig -Value $webconfigXml -Encoding UTF8 -Force
  Write-Host "Wrote web.config to $siteWebConfig"
} catch { Write-Warning "Failed to write web.config: $($_.Exception.Message)" }

# finalize
Write-Host "`n--- Deployment finished: restarting IIS (may require admin) ---" -ForegroundColor Green
try { iisreset /noforce | Out-Null } catch { Write-Warning "iisreset failed: $($_.Exception.Message)" }

Write-Host "✔️ Deployment script complete. Temporary folder: $temp" -ForegroundColor Green
'@

Set-Content -LiteralPath $path -Value $fixed -Encoding UTF8 -Force
Write-Host "Backup saved to $path.bak and $path overwritten with fixed script."
