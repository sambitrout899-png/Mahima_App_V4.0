<#
.SYNOPSIS
  Deploy Vite frontend to IIS (Default Web Site).

.DESCRIPTION
  Runs npm build, backs up existing site, copies new build (dist) to the site root,
  fixes permissions for IIS, restarts AppPool/IIS, and optionally verifies URL.

.PARAMETER BuildDir
  The local Vite build output directory (default: ./dist).

.PARAMETER SiteRoot
  The IIS physical path (default: C:\inetpub\wwwroot).

.PARAMETER BackupDir
  Where to store backups before overwriting (default: C:\inetpub\backups\frontend).

.PARAMETER AppPoolName
  Name of the AppPool to recycle. If empty, script will recycle DefaultAppPool.

.PARAMETER DryRun
  If set to $true, shows actions without making changes.

.EXAMPLE
  .\deploy-frontend.ps1 -BuildDir "C:\Projects\mahima-frontend\dist"
#>

param(
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$BuildDir = "$((Get-Location).Path)\dist",
  [string]$SiteRoot = "C:\inetpub\wwwroot",
  [string]$BackupDir = "C:\inetpub\backups\frontend",
  [string]$AppPoolName = "DefaultAppPool",
  [switch]$DryRun = $false,
  [string]$VerifyUrl = "http://localhost/"
)

# ---------- helpers ----------
function Log { param($m) $t = (Get-Date).ToString("u"); "$t - $m" | Tee-Object -FilePath $global:LogFile -Append }
function RunIfNotDry { param($scriptblock) if(-not $DryRun) { & $scriptblock } else { Log "[DRYRUN] would run: $scriptblock" } }

# ---------- init ----------
$Timestamp = (Get-Date -Format "yyyyMMdd-HHmmss")
$global:LogFile = Join-Path $ProjectRoot "deploy-log-$Timestamp.txt"
Log "Deployment started. DryRun=$($DryRun.IsPresent)"

# 1) sanity checks
if(-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Log "ERROR: node not found in PATH. Install Node.js or update PATH."
  throw "node not found"
}
if(-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Log "ERROR: npm not found in PATH. Install npm or update PATH."
  throw "npm not found"
}
if(-not (Test-Path $SiteRoot)) {
  Log "ERROR: Site root '$SiteRoot' does not exist. Please verify IIS physical path."
  throw "site root missing"
}

# 2) run build (if build dir missing or newer build desired)
if($DryRun) {
  Log "[DRYRUN] Would run 'npm run build' in $ProjectRoot"
} else {
  Log "Running 'npm run build' in $ProjectRoot ..."
  Push-Location $ProjectRoot

  # Call npm.cmd explicitly to avoid PowerShell parsing issues like "Unknown command 'pm'"
  $npmBuildLog = Join-Path $ProjectRoot "npm-build-output-$Timestamp.txt"
  $npmExitOutput = & "npm.cmd" "run" "build" 2>&1 | Tee-Object -FilePath $npmBuildLog
  $exitCode = $LASTEXITCODE

  Pop-Location
  if($exitCode -ne 0) {
    Log "ERROR: npm build failed (exit $exitCode). See $npmBuildLog"
    throw "npm build failed"
  } else {
    Log "npm build succeeded."
  }
}

# Ensure build dir exists after build
if(-not (Test-Path $BuildDir)) {
  Log "ERROR: Build output not found at $BuildDir"
  throw "build output missing"
}

# 3) backup current site (robust)
$backupTimestamped = Join-Path $BackupDir "site-backup-$Timestamp.zip"
try {
  if(-not (Test-Path $BackupDir)) {
    Log "Creating backup directory $BackupDir"
    if(-not $DryRun) {
      New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    } else {
      Log "[DRYRUN] Would create directory $BackupDir"
    }
  }

  Log "Creating zip backup of current site to $backupTimestamped"
  if(-not $DryRun) {
    # Double-check SiteRoot exists before zipping
    if(-not (Test-Path $SiteRoot)) {
      throw "Site root '$SiteRoot' does not exist; cannot create backup."
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if(Test-Path $backupTimestamped) {
      Log "Existing backup file found at $backupTimestamped - removing first."
      Remove-Item $backupTimestamped -Force
    }

    # Create the zip. Wrap in try/catch for clearer logging.
    try {
      [System.IO.Compression.ZipFile]::CreateFromDirectory($SiteRoot, $backupTimestamped)
      Log "Backup created at $backupTimestamped."
    } catch {
      Log "ERROR: Failed to create zip backup: $($_.Exception.Message)"
      throw
    }
  } else {
    Log "[DRYRUN] Would zip $SiteRoot to $backupTimestamped"
  }
} catch {
  Log "ERROR during backup step: $($_.Exception.Message)"
  throw
}

# 4) copy new build (mirror) using Robocopy
$robocopyLog = Join-Path $ProjectRoot "robocopy-deploy-$Timestamp.log"
$robocopyCmd = "Robocopy `"$BuildDir`" `"$SiteRoot`" /MIR /Z /R:3 /W:3 /NFL /NDL /NP /LOG:`"$robocopyLog`""

Log "Running: $robocopyCmd"
if(-not $DryRun) {
  # Run Robocopy and capture its exit code
  $rc = & Robocopy $BuildDir $SiteRoot /MIR /Z /R:3 /W:3 /NFL /NDL /NP /LOG:$robocopyLog
  # Robocopy returns a bitmask; treat codes 8+ as failures
  if($rc -ge 8) {
    Log "ERROR: Robocopy failed with code $rc. See $robocopyLog"
    throw "robocopy failed"
  } else {
    Log "Robocopy completed with exit code $rc. Log: $robocopyLog"
  }
} else {
  Log "[DRYRUN] Would run Robocopy. Command logged: $robocopyCmd"
}

# 5) ensure IIS user can read files (IIS_IUSRS)
Log "Ensuring IIS can read files (granting Read & Execute to IIS_IUSRS on $SiteRoot)"
if(-not $DryRun) {
  try {
    $acl = Get-Acl $SiteRoot
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS","ReadAndExecute","ContainerInherit, ObjectInherit","None","Allow")
    $acl.SetAccessRule($rule)
    Set-Acl -Path $SiteRoot -AclObject $acl
    Log "Permissions set."
  } catch {
    Log "WARNING: Failed to set ACL: $($_.Exception.Message)"
  }
} else {
  Log "[DRYRUN] Would add ReadAndExecute ACL for IIS_IUSRS on $SiteRoot"
}

# 6) recycle app pool (if specified) or restart IIS
if($AppPoolName) {
  Log "Recycling AppPool $AppPoolName"
  if(-not $DryRun) {
    Import-Module WebAdministration -ErrorAction Stop
    Restart-WebAppPool -Name $AppPoolName
    Log "AppPool recycled."
  } else {
    Log "[DRYRUN] Would recycle AppPool $AppPoolName"
  }
} else {
  Log "Restarting IIS (iisreset)"
  if(-not $DryRun) {
    iisreset /restart | Tee-Object -FilePath $global:LogFile -Append
  } else {
    Log "[DRYRUN] Would run iisreset /restart"
  }
}

# 7) quick verification - check presence of main js file discovered from local build (best-effort)
$mainJs = Get-ChildItem -Path (Join-Path $BuildDir "assets") -Filter "index-*.js" -ErrorAction SilentlyContinue | Select-Object -First 1
if($mainJs) {
  $deployedPath = Join-Path $SiteRoot "assets\$($mainJs.Name)"
  if(Test-Path $deployedPath) {
    Log "Verified: $($mainJs.Name) exists at $deployedPath"
  } else {
    Log "WARNING: $($mainJs.Name) not found at $deployedPath after deploy."
  }
} else {
  Log "No index-*.js found in $BuildDir/assets to verify."
}

# 8) HTTP verification (local)
Log "Attempting HTTP GET $VerifyUrl"
if(-not $DryRun) {
  try {
    $response = Invoke-WebRequest -Uri $VerifyUrl -UseBasicParsing -TimeoutSec 10
    Log "HTTP GET succeeded. StatusCode: $($response.StatusCode)"
  } catch {
    Log "WARNING: HTTP GET to $VerifyUrl failed: $($_.Exception.Message)"
  }
} else {
  Log "[DRYRUN] Would invoke HTTP GET $VerifyUrl"
}

Log "Deployment finished."
