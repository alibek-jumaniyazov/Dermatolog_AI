$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $projectDir '.data/logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$pidFile = Join-Path $logDir 'dev-process.json'
if (Test-Path -LiteralPath $pidFile) {
  $previous = Get-Content -LiteralPath $pidFile | ConvertFrom-Json
  $running = Get-CimInstance Win32_Process -Filter "ProcessId = $($previous.pid)" -ErrorAction SilentlyContinue
  if ($running -and $running.CommandLine.Contains((Join-Path $projectDir 'scripts/dev.mjs'))) {
    Write-Output 'Loyiha allaqachon ishlayapti: http://localhost:5173'
    exit 0
  }
}
Push-Location -LiteralPath $projectDir
try {
  & node scripts/postgres.mjs start
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL ishga tushmadi.' }
  $nodeExe = (Get-Command node -ErrorAction Stop).Source
  $scriptFile = Join-Path $projectDir 'scripts/dev.mjs'
  $started = Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $scriptFile + '"')) -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'dev.log') -RedirectStandardError (Join-Path $logDir 'dev-error.log') -PassThru
  @{ pid = $started.Id; root = $projectDir; startedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
  Write-Output 'Loyiha fonda ishga tushmoqda: http://localhost:5173'
  Write-Output 'Loglar: .data/logs/dev.log va dev-error.log'
} finally { Pop-Location }
