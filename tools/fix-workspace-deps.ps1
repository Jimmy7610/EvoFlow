
Write-Host "Fixing workspace:* dependencies..."

$root = Split-Path -Parent $PSScriptRoot

$files = Get-ChildItem -Path $root -Recurse -Filter package.json

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "workspace:\*") {
        $new = $content -replace '"workspace:\*"', '"file:../.."'
        Set-Content -Path $file.FullName -Value $new
        Write-Host "Fixed:" $file.FullName
    }
}

Write-Host "Done. Now run: npm run install:all"
