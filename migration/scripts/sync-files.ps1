<#
.SYNOPSIS
  Copies uploaded-file data (photos, chat attachments, certificates, etc.) from the V4.0
  uploads root into the V4.1 uploads root.

.DESCRIPTION
  V4.1's file storage layout is the same relative "uploads/<subfolder>/<yyyy>/<mm>/<file>"
  structure as V4.0 (see UploadsController.cs on both sides) - multi-tenancy there is enforced
  by a storage-quota check per tenant, not by a separate folder per tenant, so no path
  transformation is needed, only a straight tree copy.

  This is purely ADDITIVE: it never deletes anything at the destination (no /MIR), so it is
  safe to run against a V4.1 uploads folder that already has its own live data.

.PARAMETER SourceRoot
  The V4.0 uploads root, e.g. \\v40-server\mahima-uploads or a local/mapped path to it.

.PARAMETER DestRoot
  The V4.1 uploads root, e.g. \\v41-server\mahima-uploads or a local/mapped path to it.

.EXAMPLE
  .\sync-files.ps1 -SourceRoot "\\v40server\mahima-uploads" -DestRoot "\\v41server\mahima-uploads"
#>
param(
    [Parameter(Mandatory = $true)][string]$SourceRoot,
    [Parameter(Mandatory = $true)][string]$DestRoot,
    [string]$LogDir = "$PSScriptRoot\..\migration-output\file-sync"
)

if (-not (Test-Path $SourceRoot)) { throw "SourceRoot not found: $SourceRoot" }
New-Item -ItemType Directory -Force -Path $DestRoot | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$logFile = Join-Path $LogDir "file-sync-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

Write-Output "Copying $SourceRoot -> $DestRoot (additive only, nothing is deleted at destination)"
Write-Output "Log: $logFile"

# /E copy subdirs incl. empty, /Z restartable mode, /R:3 /W:5 retry policy, /XN /XO skip files
# already newer/same at destination so re-running is cheap, /LOG+ appends so nothing is lost.
robocopy $SourceRoot $DestRoot /E /Z /R:3 /W:5 /XN /XO /NP /LOG+:$logFile /TEE

# Robocopy exit codes 0-7 are all "success" (7 = files copied + some skipped); 8+ is a real error.
if ($LASTEXITCODE -ge 8) {
    throw "robocopy reported errors (exit code $LASTEXITCODE). See $logFile"
}
Write-Output "Done. Exit code $LASTEXITCODE (0-7 is normal for robocopy)."
