# Deploy-React-To-Server.ps1
# Run on your dev/build machine. Requires access to the server admin share (\\server\c$).
# Edit these variables before running.

$reactProjectPath = "C:\users\Administrator\projects\mahima-frontend"   # <-- path to your React project (where package.json sits)
$buildCommand = "npm run build"                    # <-- change if different (yarn build etc)
$distFolderName = "dist"                           # <-- folder produced by build (vite default: dist)
$remoteAdminShare = "\\SERVERNAME\c$"               # <-- UNC to server C$ (must be accessible with credentials)
$remoteSiteRoot = Join-Path $remoteAdminShare "inetpub\wwwroot"

# --------- Script starts ----------
if (-not (Test-Path $reactProjectPath)) { Write-Error "React project not found at $reactProjectPath"; exit 1 }

Push-Location $reactProjectPath

Write-Host "Running npm install..."
npm install

Write-Host "Running build: $buildCommand"
# use the shell to run the build command
cmd /c $buildCommand
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed (exit $LASTEXITCODE)"; Pop-Location; exit 2 }

# determine dist path
$localDist = Join-Path $reactProjectPath $distFolderName
if (-not (Test-Path $localDist)) { Write-Error "Build output not found at $localDist"; Pop-Location; exit 3 }

# Patch the built index.html to point API base to /api if needed
$indexPath = Join-Path $localDist "index.html"
if (Test-Path $indexPath) {
    $content = Get-Content $indexPath -ErrorAction Stop | Out-String
    if ($content -match "window\.__API_BASE__") {
        # replace whatever value is set to "/api"
        $new = $content -replace 'window\.__API_BASE__\s*=\s*"(.*?)"', 'window.__API_BASE__ = "/api"'
        $new | Out-File -FilePath $indexPath -Encoding UTF8 -Force
        Write-Host "Patched $indexPath -> window.__API_BASE__ set to /api"
    } else {
        # if not found, inject small script before closing head
        $injection = '<script>if(typeof window!=="undefined"&&!window.__API_BASE__){window.__API_BASE__="/api";}</script>'
        $new = $content -replace '(</head>)',$injection + "`n$1"
        $new | Out-File -FilePath $indexPath -Encoding UTF8 -Force
        Write-Host "Injected API base script into $indexPath"
    }
} else {
    Write-Warning "index.html not found in build output; skipping patch."
}

# Copy build output to server site root (requires permission to remoteAdminShare)
Write-Host "Copying build files to $remoteSiteRoot (this will mirror destination)..."
# Ensure dest exists
$dest = $remoteSiteRoot
if (-not (Test-Path $dest)) { New-Item -Path $dest -ItemType Directory -Force | Out-Null }

# Use robocopy for reliable copy /MIR
$robocopyArgs = @($localDist, $dest, "/MIR", "/NFL", "/NDL", "/NJH", "/NJS")
$rc = Start-Process -FilePath robocopy -ArgumentList $robocopyArgs -NoNewWindow -Wait -PassThru
if ($rc.ExitCode -ge 8) {
    Write-Warning "Robocopy returned exit code $($rc.ExitCode). Some files may have failed to copy."
} else {
    Write-Host "Files copied (robocopy exit $($rc.ExitCode))."
}

# Upload SPA web.config (will overwrite)
$spaWebConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>

    <rewrite>
      <rules>
        <rule name="SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/api" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <defaultDocument>
      <files>
        <add value="index.html" />
      </files>
    </defaultDocument>

    <security>
      <authorization>
        <add accessType="Allow" users="*" />
      </authorization>
    </security>
  </system.webServer>
</configuration>
"@

$remoteWebConfigPath = Join-Path $dest "web.config"
$bak = "$remoteWebConfigPath.bak_$(Get-Date -Format yyyyMMddHHmmss)"
if (Test-Path $remoteWebConfigPath) { Copy-Item $remoteWebConfigPath $bak -Force; Write-Host "Backed up remote web.config to $bak" }
$spaWebConfig | Out-File -FilePath $remoteWebConfigPath -Encoding UTF8 -Force
Write-Host "Wrote SPA web.config to $remoteWebConfigPath"

Pop-Location
Write-Host "Deploy finished. Next: run server-side script as Admin to set ACLs and restart IIS (or run commands manually)."
