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

set "ENV_FILE=%ROOT%backend\\.env"
if not exist "%ENV_FILE%" (
  echo ERROR: backend\\.env not found. Please create it from backend\\.env.example
  echo.
  pause
  exit /b 1
)

for /f "usebackq tokens=1* delims==" %%a in (`findstr /b /i "BACKEND_PORT=" "%ENV_FILE%"`) do set "BACKEND_PORT=%%b"
if defined BACKEND_PORT for /f "tokens=* delims= " %%p in ("%BACKEND_PORT%") do set "BACKEND_PORT=%%p"
if not defined BACKEND_PORT set "BACKEND_PORT=5000"

echo Opening backend logs...
start "pm2-backend-logs" cmd /k "pm2 logs tab-backend"

echo.
echo Backend is up: http://localhost:%BACKEND_PORT%
echo.
pause
