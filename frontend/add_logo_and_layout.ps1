<#
add_logo_and_layout.ps1

- Place your logo image in the project root with any of these names:
  logo.png, mahima.png, mahima_logo.png, logo.jpg, logo.jpeg
- Run this script from the project root (where package.json lives):
    .\add_logo_and_layout.ps1

What it does:
- copies the logo to public/logo.png
- creates src/components/Logo.jsx
- backs up existing src/components/Layout.jsx (if present) and writes a new Layout.jsx that uses the logo
- writes files as UTF8 without BOM
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Ensure we are in the project root
$cwd = (Get-Location).ProviderPath
Write-Host "Working directory: $cwd"

# Candidate logo filenames (checked in order)
$logoCandidates = @('logo.png','mahima.png','mahima_logo.png','logo.jpg','logo.jpeg')

$foundLogo = $null
foreach ($name in $logoCandidates) {
  $p = Join-Path $cwd $name
  if (Test-Path $p) { $foundLogo = $p; break }
}

if (-not $foundLogo) {
  Write-Host "No logo image found in project root. Looked for: $($logoCandidates -join ', ')"
  Write-Host "Please place your logo PNG/JPG in the project root and run this script again."
  exit 1
}

# Create public folder if missing
$publicDir = Join-Path $cwd 'public'
if (-not (Test-Path $publicDir)) {
  New-Item -ItemType Directory -Path $publicDir | Out-Null
  Write-Host "Created: $publicDir"
}

# Copy logo to public/logo.png (overwrite if exists, but backup first)
$destLogo = Join-Path $publicDir 'logo.png'
if (Test-Path $destLogo) {
  $bak = "$destLogo.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
  Copy-Item -Path $destLogo -Destination $bak -Force
  Write-Host "Backed up existing public/logo.png -> $(Split-Path $bak -Leaf)"
}
Copy-Item -Path $foundLogo -Destination $destLogo -Force
Write-Host "Copied logo to: public/logo.png"

# Ensure src/components exists
$componentsDir = Join-Path $cwd 'src\components'
if (-not (Test-Path $componentsDir)) {
  New-Item -ItemType Directory -Path $componentsDir -Force | Out-Null
  Write-Host "Created: $componentsDir"
}

# Write Logo.jsx
$logoPath = Join-Path $componentsDir 'Logo.jsx'
if (Test-Path $logoPath) {
  Copy-Item $logoPath "$logoPath.bak_$(Get-Date -Format yyyyMMdd_HHmmss)" -Force
  Write-Host "Backed up existing Logo.jsx"
}

$logoContent = @'
import React from "react";
import { Link } from "react-router-dom";

/**
 * Logo component
 * - uses /logo.png from the public folder
 * - props: size (number) controls image width/height
 */
export default function Logo({ size = 56 }) {
  return (
    <Link to="/" className="flex items-center space-x-3">
      <img src="/logo.png" alt="Mahima Ministry" width={size} height={size} className="rounded" />
      <div className="hidden sm:block">
        <div className="text-xl font-bold text-red-700">Mahima Ministry</div>
        <div className="text-sm text-gray-600">Admin UI</div>
      </div>
    </Link>
  );
}
'@

[System.IO.File]::WriteAllText($logoPath, $logoContent, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Wrote: src/components/Logo.jsx"

# Layout.jsx handling: back up if exists, then write a new layout that uses Logo
$layoutPath = Join-Path $componentsDir 'Layout.jsx'
if (Test-Path $layoutPath) {
  Copy-Item $layoutPath "$layoutPath.bak_$(Get-Date -Format yyyyMMdd_HHmmss)" -Force
  Write-Host "Backed up existing Layout.jsx"
}

$layoutContent = @'
import React from "react";
import { NavLink } from "react-router-dom";
import Logo from "./Logo";

/**
 * Simple site layout for Mahima frontend.
 * Replace or edit this file if you had a custom layout — a backup was created.
 */
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-red-50">
      <header className="flex items-center justify-between px-6 py-4 bg-red-100 shadow">
        <Logo size={52} />
        <nav className="space-x-4">
          <NavLink to="/users" className="hover:text-red-700">Users</NavLink>
          <NavLink to="/teams" className="hover:text-red-700">Teams</NavLink>
          <NavLink to="/tasks" className="hover:text-red-700">Tasks</NavLink>
          <NavLink to="/sermons" className="hover:text-red-700">Sermons</NavLink>
          <NavLink to="/prayerrequests" className="hover:text-red-700">PrayerRequests</NavLink>
          <NavLink to="/meetings" className="hover:text-red-700">Meetings</NavLink>
          <NavLink to="/attachments" className="hover:text-red-700">Attachments</NavLink>
        </nav>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {children}
      </main>

      <footer className="p-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Mahima Ministry
      </footer>
    </div>
  );
}
'@

[System.IO.File]::WriteAllText($layoutPath, $layoutContent, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Wrote: src/components/Layout.jsx"

Write-Host "`nDone. Files created/updated:"
Write-Host " - public/logo.png"
Write-Host " - src/components/Logo.jsx"
Write-Host " - src/components/Layout.jsx"
Write-Host "`nBackups (if any) live next to the original files with suffix .bak_YYYYMMDD_HHmmss"

Write-Host "`nRestart dev server (npm run dev) or wait for HMR. If your app uses a different Layout file path, edit your app's main entry (src/main.jsx or src/App.jsx) to import and use the new Layout component."
