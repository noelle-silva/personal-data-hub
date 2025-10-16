@echo off
chcp 65001 >nul
echo 启动开发环境...
echo.

echo 配置端口设置...
node setup-ports.js

echo 读取端口配置...
for /f "tokens=2 delims==" %%a in ('findstr "BACKEND_PORT" port.env') do set BACKEND_PORT=%%a
for /f "tokens=2 delims==" %%a in ('findstr "FRONTEND_PORT" port.env') do set FRONTEND_PORT=%%a

echo 正在启动后端服务器...
cd backend
start "后端服务器" cmd /k "npm run dev"
cd ..

echo 等待后端服务器启动...
timeout /t 3 /nobreak >nul

echo 正在启动前端应用...
cd frontend
start "前端应用" cmd /k "set PORT=%FRONTEND_PORT% && npm start"
cd ..

echo.
echo 开发环境已启动！
echo 后端API: http://localhost:%BACKEND_PORT%
echo 前端应用: http://localhost:%FRONTEND_PORT%
echo.
echo 按任意键关闭此窗口...
pause >nul