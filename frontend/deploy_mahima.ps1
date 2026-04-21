<#
  deploy_mahima_patched.ps1
  Safe build + deploy for Mahima (Vite frontend + dotnet backend) to IIS.
  Includes:
    - frontend exclusion for MahimaApi folder
    - stops external dotnet processes using Mahima.Api.dll
    - PowerShell 5 safe syntax (no Join-String)
    - retry-safe copy
    - automatic rollback on failure
  Run as Administrator.
#>

# ---------- CONFIG ----------
$frontendSrc     = "C:\Users\Administrator\projects\mahima-frontend"
$backendSrc      = "C:\Projects\Mahima.Api\Mahima.Api"
$siteRoot        = "C:\inetpub\wwwroot"
$apiPublishPath  = "C:\inetpub\wwwroot\MahimaApi\publish"
$apiAppPoolName  = "MahimaApi"   # change if different

# patterns to replace in built JS
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
  Write-Host "Rolling back to previous version..."
  if (Test-Path "$backupRoot\wwwroot_backup") {
    robocopy "$backupRoot\wwwroot_backup" "$siteRoot" /MIR /NP | Out-Null
  }
  if (Test-Path "$backupRoot\api_publish_backup") {
    robocopy "$backupRoot\api_publish_backup" "$apiPublishPath" /MIR /NP | Out-Null
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
    Abort "Required command not found on PATH: $cmd"
  }
}

# create working dirs
New-Item -Path $temp -ItemType Directory -Force | Out-Null
New-Item -Path $frontendBuildTemp -ItemType Directory -Force | Out-Null
New-Item -Path $backendPublishTemp -ItemType Directory -Force | Out-Null
New-Item -Path $backupRoot -ItemType Directory -Force | Out-Null

Write-Host "Deploy started at $timestamp" -ForegroundColor Cyan

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

# verify dist
$frontendDist = Join-Path $frontendSrc "dist"
if (-not (Test-Path $frontendDist)) { Abort "Frontend dist not found: $frontendDist" }

Copy-Item -Path (Join-Path $frontendDist "*") -Destination $frontendBuildTemp -Recurse -Force

# ---------- PATCH BUILT JS ----------
Write-Host "`n--- Patching built JS files ---" -ForegroundColor Cyan
Get-ChildItem -Path $frontendBuildTemp -Filter *.js -Recurse | ForEach-Object {
  try {
    $c = Get-Content -Raw -LiteralPath $_.FullName
    foreach ($pat in $apiPatterns) { $c = $c -replace [regex]::Escape($pat), $apiReplacement }
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
Copy-Item "$siteRoot" "$backupFrontend" -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $apiPublishPath) {
  Copy-Item "$apiPublishPath" "$backupApi" -Recurse -Force -ErrorAction SilentlyContinue
}

# ---------- FRONTEND DEPLOY (exclude API) ----------
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

# stop IIS app pool (if exists)
if (Get-WebAppPoolState -Name $apiAppPoolName -ErrorAction SilentlyContinue) {
  Write-Host "Stopping app pool: $apiAppPoolName"
  Stop-WebAppPool -Name $apiAppPoolName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

# stop any standalone dotnet Mahima.Api process
$apiProcs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "Mahima\.Api" }
if ($apiProcs) {
  Write-Host "Found standalone Mahima.Api processes. Killing..."
  foreach ($p in $apiProcs) {
    try {
      Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
      Write-Host "Stopped PID $($p.ProcessId)"
    } catch { Write-Warning "Failed to stop PID $($p.ProcessId)" }
  }
  Start-Sleep -Seconds 2
}

# clear and copy backend with retry
$attempts = 0; $maxAttempts = 5; $copied = $false
while (-not $copied -and $attempts -lt $maxAttempts) {
  try {
    if (Test-Path $apiPublishPath) {
      Get-ChildItem $apiPublishPath -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    } else {
      New-Item -ItemType Directory -Path $apiPublishPath -Force | Out-Null
    }
    Copy-Item -Path (Join-Path $backendPublishTemp "*") -Destination $apiPublishPath -Recurse -Force -ErrorAction Stop
    $copied = $true
  } catch {
    $attempts++
    Write-Warning "Copy attempt $attempts failed: $($_.Exception.Message)"
    Start-Sleep -Seconds 2
  }
}
if (-not $copied) { Abort "Failed to copy backend after $maxAttempts attempts." }

# restart app pool
if (Get-WebAppPoolState -Name $apiAppPoolName -ErrorAction SilentlyContinue) {
  Start-WebAppPool -Name $apiAppPoolName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

# ---------- web.config ----------
Write-Host "`n--- Writing web.config ---" -ForegroundColor Cyan
$webconfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <defaultDocument><files><clear /><add value='index.html' /></files></defaultDocument>
    <staticContent>
      <remove fileExtension='.json' />
      <mimeMap fileExtension='.json' mimeType='application/json' />
      <mimeMap fileExtension='.webmanifest' mimeType='application/manifest+json' />
      <mimeMap fileExtension='.map' mimeType='application/json' />
    </staticContent>
    <proxy><reverseProxy enabled='true' /></proxy>
    <rewrite>
      <rules>
        <rule name='Proxy_API_to_Backend' stopProcessing='true'>
          <match url='^api/(.*)' ignoreCase='true' />
          <action type='Rewrite' url='http://localhost:5001/api/{R:1}' />
        </rule>
        <rule name='ReactSPA_Fallback' stopProcessing='true'>
          <match url='.*' />
          <conditions>
            <add input='{REQUEST_URI}' pattern='^/api' negate='true' />
            <add input='{REQUEST_URI}' pattern='\.[a-zA-Z0-9]{1,8}$' negate='true' />
          </conditions>
          <action type='Rewrite' url='/index.html' />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
"@
Set-Content (Join-Path $siteRoot "web.config") $webconfig -Encoding UTF8 -Force

# ---------- PERMISSIONS & RESTART ----------
Write-Host "`n--- Permissions & Restart IIS ---" -ForegroundColor Cyan
icacls $siteRoot /grant "IIS_IUSRS:(RX)" /T | Out-Null
icacls $apiPublishPath /grant "IIS_IUSRS:(RX)" /T | Out-Null
iisreset

Write-Host "`n✅ Deploy complete."
Write-Host "Backups stored in: $backupRoot"
