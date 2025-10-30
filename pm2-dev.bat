@echo off
chcp 65001 >nul
echo 正在使用 PM2 启动开发环境...
echo.

echo 1. 运行 start-pm2.js 初始化并启动服务...
node start-pm2.js
echo.

echo 2. 等待服务完全启动...
timeout /t 5 /nobreak >nul

echo 3. 读取端口配置...
for /f "tokens=2 delims==" %%a in ('findstr "BACKEND_PORT" port.env') do set BACKEND_PORT=%%a
for /f "tokens=2 delims==" %%a in ('findstr "FRONTEND_PORT" port.env') do set FRONTEND_PORT=%%a

echo.
echo 4. 打开后端日志窗口...
start "PM2 后端日志 - tab-backend" cmd /k "pm2 logs tab-backend"

echo 5. 打开前端日志窗口...
start "PM2 前端日志 - tab-frontend" cmd /k "pm2 logs tab-frontend"

echo.
echo 开发环境已通过 PM2 启动！
echo 后端API: http://localhost:%BACKEND_PORT%
echo 前端应用: http://localhost:%FRONTEND_PORT%
echo.
echo 两个日志窗口已打开，方便调试。
echo 按任意键关闭此窗口...
pause >nul