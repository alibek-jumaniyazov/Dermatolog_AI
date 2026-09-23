$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectDir '.data/logs/dev-process.json'
if (!(Test-Path -LiteralPath $pidFile)) { Write-Output 'Fondagi jarayon qaydi topilmadi.'; exit 0 }
$record = Get-Content -LiteralPath $pidFile | ConvertFrom-Json
$parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($record.pid)" -ErrorAction SilentlyContinue
if ($parent -and $parent.CommandLine.Contains((Join-Path $projectDir 'scripts/dev.mjs'))) {
  # Only stop the verified project launcher tree, including the Windows Python venv launcher.
  & taskkill.exe /PID $record.pid /T /F | Out-Null
}
Remove-Item -LiteralPath $pidFile
Write-Output "Loyiha xizmatlari to'xtatildi. PostgreSQL uchun: pnpm db:stop"
