<#
  deploy_mahima_patched.ps1
  Safe build + deploy for Mahima (Vite frontend + dotnet backend) to IIS.
  Includes:
    - frontend public asset fix (copies /public → /dist)
    - automatic JS patch for /roles and other bare fetch calls
    - excludes MahimaApi folder
    - retries + rollback on failure
    - updated rewrite rules for React SPA (writes your working web.config)
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

# Copy /public → /dist to include static assets (fixes missing images)
Write-Host "Copying public assets to dist..."
if (Test-Path (Join-Path $frontendSrc "public")) {
  Copy-Item -Path (Join-Path $frontendSrc "public\*") -Destination (Join-Path $frontendSrc "dist") -Recurse -Force
}

# Verify dist
$frontendDist = Join-Path $frontendSrc "dist"
if (-not (Test-Path $frontendDist)) { Abort "Frontend dist not found: $frontendDist" }

Copy-Item -Path (Join-Path $frontendDist "*") -Destination $frontendBuildTemp -Recurse -Force

# ---------- PATCH BUILT JS ----------
Write-Host "`n--- Patching built JS files ---" -ForegroundColor Cyan
Get-ChildItem -Path $frontendBuildTemp -Filter *.js -Recurse | ForEach-Object {
  try {
    $c = Get-Content -Raw -LiteralPath $_.FullName
    # Replace localhost URLs with /api
    foreach ($pat in $apiPatterns) { $c = $c -replace [regex]::Escape($pat), $apiReplacement }
    # Replace bare fetch('/roles') → fetch('/api/roles') and similar short routes
    $c = $c -replace "fetch\(['""]\/roles", "fetch('/api/roles"
    $c = $c -replace "fetch\(['""]\/login", "fetch('/api/login"
    Set-Content -LiteralPath $_.FullName -Value $c -Force
    Write-Host "Patched: $($_.Name)"
  } catch { Write-Warning "Skip patch: $($_.FullName)" }
}

# ---------- BACKEND PUBLISH ----------
Write-Host "`n--- Publishing backend ---" -ForegroundColor Cyan
Push-Location $backendSrc
try {
  dotnet publish -c Release -o $backendPublishTemp
} catch {
  Pop-Location
  Abort "Backend publish failed: $($_.Exception.Message)"
}
Pop-Location

# ---------- BACKUPS ----------
Write-Host "`n--- Creating backups ---" -ForegroundColor Cyan
$backupFrontend = Join-Path $backupRoot "wwwroot_backup"
$backupApi = Join-Path $backupRoot "api_publish_backup"
Copy-Item $siteRoot $backupFrontend -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $apiPublishPath) {
  Copy-Item $apiPublishPath $backupApi -Recurse -Force -ErrorAction SilentlyContinue
}

# ---------- FRONTEND DEPLOY ----------
Write-Host "`n--- Deploying frontend ---" -ForegroundColor Cyan
$excludeDirs = @("MahimaApi","logs","uploads")
$excludeArgs = ($excludeDirs | ForEach-Object { "/XD `"$siteRoot\$_`"" }) -join ' '
$robolog = Join-Path $temp "robocopy_frontend.log"
$cmd = "robocopy `"$frontendBuildTemp`" `"$siteRoot`" /MIR /XF web.config /R:2 /W:2 /NP $excludeArgs /LOG:`"$robolog`""
Write-Host "Running: $cmd"
cmd /c $cmd | Out-Null
Write-Host "Frontend copied. Log: $robolog"

# ---------- BACKEND DEPLOY ----------
Write-Host "`n--- Deploying backend ---" -ForegroundColor Cyan
Import-Module WebAdministration -ErrorAction SilentlyContinue

if (Get-WebAppPoolState -Name $apiAppPoolName -ErrorAction SilentlyContinue) {
  Write-Host "Stopping app pool: $apiAppPoolName"
  Stop-WebAppPool -Name $apiAppPoolName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

# Kill any standalone Mahima.Api process
$apiProcs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "Mahima\.Api" }
foreach ($p in $apiProcs) {
  try {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
    Write-Host "Stopped PID $($p.ProcessId)"
  } catch { Write-Warning "Failed to stop PID $($p.ProcessId)" }
}

# Copy backend
if (Test-Path $apiPublishPath) {
  Get-ChildItem $apiPublishPath -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} else {
  New-Item -ItemType Directory -Path $apiPublishPath -Force | Out-Null
}
Copy-Item -Path (Join-Path $backendPublishTemp "*") -Destination $apiPublishPath -Recurse -Force

# Restart app pool
if (Get-WebAppPoolState -Name $apiAppPoolName -ErrorAction SilentlyContinue) {
  Start-WebAppPool -Name $apiAppPoolName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

# ---------- WEB.CONFIG (write improved version) ----------
Write-Host "`n--- Writing improved web.config (backup then write) ---" -ForegroundColor Cyan

$siteWebConfig = Join-Path $siteRoot "web.config"
$webConfigBackup = Join-Path $backupRoot "web.config.backup_$timestamp"

try {
  # backup any existing web.config
  if (Test-Path $siteWebConfig) {
    Write-Host "Backing up existing web.config to: $webConfigBackup"
    Copy-Item -Path $siteWebConfig -Destination $webConfigBackup -Force
  } else {
    Write-Host "No existing web.config found at $siteWebConfig - will create new."
  }

  $webconfigXml = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>

    <!-- 1️⃣ Serve React app files -->
    <defaultDocument>
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>

    <staticContent>
      <!-- remove inherited mappings first to avoid duplicate collection entries -->
      <remove fileExtension=".json" />
      <remove fileExtension=".map" />
      <remove fileExtension=".woff2" />
      <remove fileExtension=".js" />
      <remove fileExtension=".css" />
      <remove fileExtension=".svg" />
      <remove fileExtension=".ico" />

      <!-- now explicitly add the mappings you want -->
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".map" mimeType="application/json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
      <mimeMap fileExtension=".css" mimeType="text/css" />
      <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
      <mimeMap fileExtension=".ico" mimeType="image/x-icon" />
    </staticContent>

    <!-- 2️⃣ Enable ARR reverse proxy globally (not needed per site if already enabled at server level) -->
    <proxy>
      <reverseProxy enabled="true" />
    </proxy>

    <!-- 3️⃣ Rewrite rules -->
    <rewrite>
      <rules>
        <!-- Redirect empty root path to index.html to avoid empty-body default-document quirk -->
        <rule name="Proxy to API" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:5001/api/{R:1}" />
        </rule>

        <rule name='RedirectRootToIndex' stopProcessing='true'>
          <match url='^$' />
          <action type='Redirect' url='/index.html' redirectType='Found' />
        </rule>

        <!-- (A) Never rewrite static asset folders (assets/, static/, favicon, manifest, etc.) -->
        <rule name="IgnoreStaticAssets" stopProcessing="true">
          <match url="^(assets|static|favicon\.ico|manifest\.json|robots\.txt)(.*)" ignoreCase="true" />
          <action type="None" />
        </rule>

        <!-- (B) Proxy only API requests to backend (Kestrel) -->
        <rule name="ReverseProxy_Api" stopProcessing="true">
          <match url="^api(.*)" ignoreCase="true" />
          <action type="Rewrite" url="http://localhost:5001/{R:0}" logRewrittenUrl="true" />
        </rule>

        <!-- (C) Allow existing static files -->
        <rule name="IgnoreExistingFiles" stopProcessing="true">
          <match url="^(.*)$" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" />
          </conditions>
          <action type="None" />
        </rule>

        <!-- (D) Allow existing directories -->
        <rule name="IgnoreExistingDirectories" stopProcessing="true">
          <match url="^(.*)$" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" />
          </conditions>
          <action type="None" />
        </rule>

        <!-- (E) SPA fallback — send unknown routes to index.html -->
        <rule name="ReactSPA_Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions>
            <add input="{REQUEST_URI}" pattern="^/api" negate="true" />
            <add input="{REQUEST_URI}" pattern="\.[a-zA-Z0-9]{1,8}$" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>

      </rules>
    </rewrite>

  </system.webServer>
</configuration>
'@

  # write file with UTF8 encoding (no bom)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($webconfigXml)
  [System.IO.File]::WriteAllBytes($siteWebConfig, $bytes)

  Write-Host "web.config written to $siteWebConfig" -ForegroundColor Green

} catch {
  Write-Warning "Failed to write web.config: $($_.Exception.Message)"
  Abort "web.config write failed"
}

# ---------- PERMISSIONS & RESTART ----------
Write-Host "`n--- Permissions & Restart IIS ---" -ForegroundColor Cyan
icacls $siteRoot /grant "IIS_IUSRS:(RX)" /T | Out-Null
icacls $apiPublishPath /grant "IIS_IUSRS:(RX)" /T | Out-Null
iisreset

Write-Host "`n✅ Deploy complete."
Write-Host "Backups stored in: $backupRoot"
