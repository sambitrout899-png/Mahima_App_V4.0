# apply-hide-id-in-add-forms.ps1
# Purpose: Remove ID field from Add record modal (all entities),
#          but keep it readonly in Edit mode.

$root = "C:\users\Administrator\projects\mahima-frontend\src\features"
$files = Get-ChildItem -Path $root -Recurse -Filter Page.jsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    $changed = $false

    # --- 1. Fix DetectFields fallback (remove 'id')
    $pattern1 = "return \['id','name'\];"
    if ($content -match $pattern1) {
        $content = $content -replace $pattern1, "return ['name'];"
        Write-Host "[$($file.Name)] Updated DetectFields fallback"
        $changed = $true
    }

    # --- 2. Fix modal input rendering loop
    # Look for the .map(key => { ... }) block
    $pattern2 = '(DetectFields\([^\)]+\))\.map\(key => {'
    if ($content -match $pattern2 -and $content -notmatch '\.filter\(key => key\.toLowerCase\(\)') {
        $content = $content -replace $pattern2, "`$1.filter(key => key.toLowerCase() -ne 'id' -and -not (key.ToLower().EndsWith('id'))).map(key => {"
        Write-Host "[$($file.Name)] Added filter to skip id in Add mode"
        $changed = $true
    }

    if ($changed) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    } else {
        Write-Host "[$($file.Name)] No changes needed"
    }
}
