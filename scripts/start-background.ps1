param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExe = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:ProgramFiles 'nodejs/node.exe' }
if (!(Test-Path -LiteralPath $nodeExe)) { throw "Node.js 22.18 yoki undan yangi mos versiyani o'rnating." }
$env:PATH = (Split-Path -Parent $nodeExe) + ';' + $env:PATH
$logDir = Join-Path $projectDir '.data/logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$pidFile = Join-Path $logDir 'dev-process.json'
if (Test-Path -LiteralPath $pidFile) {
  $previous = Get-Content -LiteralPath $pidFile | ConvertFrom-Json
  $running = Get-CimInstance Win32_Process -Filter "ProcessId = $($previous.pid)" -ErrorAction SilentlyContinue
  if ($running -and $running.CommandLine -and $running.CommandLine.Contains((Join-Path $projectDir 'scripts/dev.mjs'))) {
    Write-Output 'Loyiha allaqachon ishlayapti: http://localhost:5173'
    exit 0
  }
}
Push-Location -LiteralPath $projectDir
try {
  if (!(Test-Path -LiteralPath 'node_modules/dotenv/package.json') -or !(Test-Path -LiteralPath 'apps/web/node_modules/vite/package.json')) {
    $pnpmEntry = Join-Path (Split-Path -Parent $nodeExe) 'node_modules/corepack/dist/pnpm.js'
    if (!(Test-Path -LiteralPath $pnpmEntry)) { throw "pnpm kerak: README dagi o'rnatish yo'riqnomasini bajaring." }
    & $nodeExe $pnpmEntry install --frozen-lockfile --force
    if ($LASTEXITCODE -ne 0) { throw "Paketlarni o'rnatish bajarilmadi." }
  }
  & $nodeExe scripts/setup-local.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Lokal konfiguratsiya tayyorlanmadi.' }
  if (!(Test-Path -LiteralPath 'services/ml/.venv/Scripts/python.exe')) {
    & $nodeExe scripts/setup-ml.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Python AI muhiti tayyorlanmadi.' }
  }
  & $nodeExe scripts/postgres.mjs start
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL ishga tushmadi.' }
  if (!$SkipBuild) {
    & $nodeExe scripts/migrate.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Baza migratsiyasi bajarilmadi.' }
    & $nodeExe --input-type=module -e "import { pnpm } from './scripts/env.mjs'; await pnpm(['build']);"
    if ($LASTEXITCODE -ne 0) { throw 'Loyiha build bajarilmadi.' }
  }
  $scriptFile = Join-Path $projectDir 'scripts/dev.mjs'
  $started = Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $scriptFile + '"')) -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'dev.log') -RedirectStandardError (Join-Path $logDir 'dev-error.log') -PassThru
  @{ pid = $started.Id; root = $projectDir; startedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
  $ready = $false
  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    if ($started.HasExited) { throw "Launcher to'xtadi. .data/logs/dev-error.log faylini tekshiring." }
    try {
      $apiReady = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/api/v1/health/ready' -UseBasicParsing -TimeoutSec 2
      $mlReady = Invoke-WebRequest -Uri 'http://127.0.0.1:8001/health/ready' -UseBasicParsing -TimeoutSec 2
      $webReady = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2
      if ($apiReady.StatusCode -eq 200 -and $mlReady.StatusCode -eq 200 -and $webReady.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
  }
  if (!$ready) { throw 'Xizmatlar hali tayyor emas. .data/logs/dev.log va dev-error.log fayllarini tekshiring.' }
  Write-Output 'Loyiha ishlayapti: http://localhost:5173'
  Write-Output 'Loglar: .data/logs/dev.log va dev-error.log'
} finally { Pop-Location }
