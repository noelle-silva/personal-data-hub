@echo off
setlocal EnableExtensions

REM ASCII-only for cmd.exe parsing. See start-dev.bat for details.

set "ROOT=%~dp0"
echo Starting backend with PM2 (desktop uses tauri dev)...
echo.

cd /d "%ROOT%" || exit /b 1
node start-pm2.js
echo.

echo Waiting 5 seconds...
timeout /t 5 /nobreak >nul

for /f "tokens=2 delims==" %%a in ('findstr /i "BACKEND_PORT" "%ROOT%port.env"') do set "BACKEND_PORT=%%a"
if not defined BACKEND_PORT set "BACKEND_PORT=5000"

echo Opening backend logs...
start "pm2-backend-logs" cmd /k "pm2 logs tab-backend"

echo.
echo Backend is up: http://localhost:%BACKEND_PORT%
echo.
pause
