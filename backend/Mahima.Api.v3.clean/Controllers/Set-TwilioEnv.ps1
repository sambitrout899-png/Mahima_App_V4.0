<#
.SYNOPSIS
  Set Twilio environment variables (process + user or machine persistent).

.DESCRIPTION
  Sets TWILIO_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE into:
   - the current process environment (immediate),
   - user environment (persisted via setx),
   - or machine environment (persisted via setx -m; requires elevation).

  Default scope: User (persist to current user).
#>

Param(
  [ValidateSet('Process','User','Machine')]
  [string]$Scope = 'User'
)

# ======= Configuration - update values here if needed =======
$vars = @{
  'TWILIO_SID'        = 'AC45b1cfc0773c47089016d5f33d5a19ec'
  'TWILIO_AUTH_TOKEN' = 'f323afca078d06fc3d4f2f3759cd38b5'
  'TWILIO_PHONE'      = '+1234567890'
}
# ===========================================================

function Mask-Secret {
  param([string]$s)
  if (-not $s) { return '' }
  if ($s.Length -le 8) { return ('*' * ($s.Length - 4)) + $s.Substring($s.Length - 4) }
  return $s.Substring(0,4) + ('*' * ($s.Length - 8)) + $s.Substring($s.Length - 4)
}

Write-Host "Setting Twilio environment variables (scope = $Scope)" -ForegroundColor Cyan

# 1) Set in current process/session (immediate)
foreach ($k in $vars.Keys) {
  $v = $vars[$k]
  # Use Set-Item for dynamic env variable names
  Set-Item -Path ("Env:\{0}" -f $k) -Value $v -ErrorAction Stop
  if ($k -eq 'TWILIO_AUTH_TOKEN') {
    Write-Host " - Process: $k = $(Mask-Secret $v)"
  } else {
    Write-Host " - Process: $k = $v"
  }
}

# 2) Persist to user or machine if requested
if ($Scope -in @('User','Machine')) {
  foreach ($k in $vars.Keys) {
    $v = $vars[$k]

    if ($Scope -eq 'User') {
      # Persist for current user (new processes/sessions will pick it up)
      & setx.exe $k $v > $null
      Write-Host "   Persisted (User): $k"
    } else {
      # Machine-level persistence requires admin privileges
      $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
      if (-not $isAdmin) {
        Write-Error "Machine scope requested but the script is not running with Administrator privileges. Re-run as Administrator to persist to MACHINE."
      } else {
        & setx.exe $k $v -m > $null
        Write-Host "   Persisted (Machine): $k"
      }
    }
  }
}

# Verification - show current process values (mask token)
Write-Host "`nVerification (current process environment):" -ForegroundColor Green
$displayList = 'TWILIO_SID','TWILIO_AUTH_TOKEN','TWILIO_PHONE'
foreach ($name in $displayList) {
  $val = (Get-ChildItem -Path Env: -Name | Where-Object { $_ -eq $name }) | ForEach-Object { (Get-Item -Path ("Env:\{0}" -f $_)).Value } 
  if (-not $val) { $val = '' }
  if ($name -eq 'TWILIO_AUTH_TOKEN') {
    $val = Mask-Secret $val
  }
  Write-Host " $name = $val"
}

Write-Host "`nNotes:" -ForegroundColor Yellow
Write-Host " - 'setx' writes to the registry and new processes/sessions will see the user/machine variables. Existing shells do NOT pick up setx changes until restarted."
Write-Host " - To persist to MACHINE (all users), re-run with: `PowerShell -ExecutionPolicy Bypass -File .\Set-TwilioEnv.ps1 -Scope Machine` (run elevated/Administrator)."
Write-Host " - Consider using a secret store (Windows Credential Manager, SecretManagement module, Azure Key Vault) for sensitive tokens in production rather than plain environment variables."
