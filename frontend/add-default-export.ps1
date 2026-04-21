# add-default-export.ps1
param()

function Read-Default($prompt,$default) {
  $line = Read-Host "$prompt [$default]"
  if ([string]::IsNullOrWhiteSpace($line)) { return $default } else { return $line }
}

$defaultPath = "C:\Users\Administrator\projects\mahima-frontend\src\features\users\Page.jsx"
$path = Read-Default "Path to Page.jsx" $defaultPath

if (-not (Test-Path $path)) {
  Write-Host "File not found: $path" -ForegroundColor Red
  exit 1
}

# backup
$timestamp = (Get-Date).ToString('yyyyMMddHHmmss')
$backup = "$path.bak.$timestamp"
Copy-Item -Path $path -Destination $backup -Force
Write-Host "Backup created at: $backup" -ForegroundColor Green

$content = Get-Content -Raw -LiteralPath $path

if ($content -match 'export\s+default') {
  Write-Host "File already contains a default export. No change needed." -ForegroundColor Yellow
  exit 0
}

# Try to find a component name
$name = $null

# 1) function declaration: function Name(
if ($content -match 'function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(') {
  $name = $matches[1]
}

# 2) const Name = (...) => or const Name = props => or let/var variants
if (-not $name) {
  if ($content -match '(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)\s*=>|[A-Za-z0-9_$.]+\s*=>)') {
    $name = $matches[1]
  }
}

# 3) class Name extends React.Component or extends Component
if (-not $name) {
  if ($content -match 'class\s+([A-Za-z_][A-Za-z0-9_]*)\s+extends') {
    $name = $matches[1]
  }
}

if (-not $name) {
  Write-Host "Could not detect a component name automatically. Please open the file and add 'export default <ComponentName>;' manually." -ForegroundColor Red
  Write-Host "Typical component declarations: 'function Page(...)', 'const Page = () =>', or 'class Page extends ...'." -ForegroundColor Yellow
  exit 1
}

# Append export default line:
$exportLine = "`n`n// Added by add-default-export.ps1`nexport default $name;`n"
Add-Content -LiteralPath $path -Value $exportLine -Encoding UTF8

Write-Host "Appended 'export default $name;' to $path" -ForegroundColor Green
Write-Host "Please restart your dev server (npm run dev) and verify." -ForegroundColor Cyan
