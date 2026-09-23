@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-background.ps1"
if errorlevel 1 (
  echo Loyiha ishga tushmadi. Yuqoridagi xatoni tekshiring.
  pause
  exit /b 1
)
echo Ilova: http://localhost:5173
pause
