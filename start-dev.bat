@echo off
setlocal EnableExtensions

REM NOTE: Keep this file ASCII-only. cmd.exe parses batch files using the OEM codepage,
REM and UTF-8 Chinese text can be misparsed into special characters like '&' and '|'
REM which breaks commands.

set "ROOT=%~dp0"
echo Starting dev (backend + Tauri desktop)...
echo.

if not exist "%ROOT%port.env" (
  echo ERROR: port.env not found in project root.
  echo.
  pause
  exit /b 1
)

for /f "tokens=2 delims==" %%a in ('findstr /i "BACKEND_PORT" "%ROOT%port.env"') do set "BACKEND_PORT=%%a"
if not defined BACKEND_PORT set "BACKEND_PORT=5000"

echo Starting backend...
cd /d "%ROOT%backend" || exit /b 1
start "pdh-backend" cmd /k "npm run dev"

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo Starting desktop (Tauri)...
cd /d "%ROOT%frontend" || exit /b 1
start "pdh-desktop" cmd /k "npm run desktop:dev"

echo.
echo Dev started.
echo Backend: http://localhost:%BACKEND_PORT%
echo Desktop: running (Tauri)
echo.
pause
