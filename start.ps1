param([switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$workspaceRoot = Split-Path (Split-Path $projectRoot -Parent) -Parent
$portTool = Join-Path $workspaceRoot 'skills/maishi-port-monitor/scripts/ports.py'
$address = 'http://127.0.0.1:18432/'
try {
    $response = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 2
    if ($response.Content -notmatch 'data-app="moyufloat-studio"') { throw 'Port 18432 is serving another application.' }
    if (-not $NoOpen) { Start-Process $address }
    exit 0
} catch {
    if ($_.Exception.Message -match 'another application') { throw }
}
if (-not (Test-Path -LiteralPath $portTool)) { throw 'SakuraBot port manager was not found.' }
python -X utf8 $portTool reserve --service moyufloat --project $projectRoot --port 18432
if ($LASTEXITCODE -ne 0) { throw 'Port reservation failed.' }
python -X utf8 $portTool check --service moyufloat
if ($LASTEXITCODE -ne 0) { throw 'Port preflight failed.' }
$logRoot = Join-Path $workspaceRoot 'data/_local'
$server = Start-Process python -ArgumentList @('-m','http.server','18432','--bind','127.0.0.1') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot 'moyu-server.out.log') -RedirectStandardError (Join-Path $logRoot 'moyu-server.err.log')
$ready = $false
for ($attempt=0; $attempt -lt 15; $attempt++) {
    try {
        $page = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 1
        if ($page.Content -match 'data-app="moyufloat-studio"') { $ready=$true; break }
    } catch { }
    if ($server.HasExited) { throw 'MoyuFloat server exited. Inspect data/_local/moyu-server.err.log.' }
    Start-Sleep -Milliseconds 200
}
if (-not $ready) { throw 'MoyuFloat did not become ready.' }
if (-not $NoOpen) { Start-Process $address }
