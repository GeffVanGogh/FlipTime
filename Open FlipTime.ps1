$edge = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path -LiteralPath $edge)) {
    $edge = Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'
}
if (-not (Test-Path -LiteralPath $edge)) {
    Write-Host 'Microsoft Edge was not found on this computer.'
    Read-Host 'Press Enter to close'
    exit 1
}
$page = Join-Path $PSScriptRoot 'index.html'
$url = ([System.Uri]::new((Resolve-Path -LiteralPath $page).Path)).AbsoluteUri
Start-Process -FilePath $edge -ArgumentList "--app=$url"
