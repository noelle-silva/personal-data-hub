#!/bin/bash

echo "启动开发环境..."
echo

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查是否安装了npm
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到npm，请先安装npm"
    exit 1
fi

echo "配置端口设置..."
node setup-ports.js

# 读取端口配置
source port.env
BACKEND_PORT=${BACKEND_PORT:-5000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

echo "正在启动后端服务器..."
cd backend && npm run dev &
BACKEND_PID=$!

# 等待后端服务器启动
echo "等待后端服务器启动..."
sleep 3

echo "正在启动前端应用..."
cd ../frontend && PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!

echo
echo "开发环境已启动！"
echo "后端API: http://localhost:$BACKEND_PORT"
echo "前端应用: http://localhost:$FRONTEND_PORT"
echo
echo "按Ctrl+C停止所有服务"

# 捕获Ctrl+C信号，优雅关闭所有服务
trap 'echo "正在停止服务..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT

# 等待所有后台进程
wait