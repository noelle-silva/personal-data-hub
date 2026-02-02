#!/bin/bash

echo "启动开发环境（后端 + Tauri桌面端）..."
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

# 读取端口配置
ENV_FILE="backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "错误: 未找到 backend/.env（请从 backend/.env.example 复制并修改）"
    exit 1
fi

# 只解析需要的键，避免直接 source 导致 .env 中的 '$' 等字符被 shell 展开
BACKEND_PORT=$(grep -E '^[[:space:]]*BACKEND_PORT[[:space:]]*=' "$ENV_FILE" | tail -n 1 | sed -E 's/^[[:space:]]*BACKEND_PORT[[:space:]]*=//')
BACKEND_PORT=${BACKEND_PORT:-5000}

echo "正在启动后端服务器..."
cd backend && npm run dev &
BACKEND_PID=$!

# 等待后端服务器启动
echo "等待后端服务器启动..."
sleep 3

echo "正在启动桌面端（Tauri）..."
cd ../frontend && npm run desktop:dev &
DESKTOP_PID=$!

echo
echo "开发环境已启动！"
echo "后端API: http://localhost:$BACKEND_PORT"
echo "桌面端: 已启动（Tauri）"
echo
echo "按Ctrl+C停止所有服务"

# 捕获Ctrl+C信号，优雅关闭所有服务
trap 'echo "正在停止服务..."; kill $BACKEND_PID $DESKTOP_PID; exit' INT

# 等待所有后台进程
wait
