# 个人数据中心 (Personal Data Hub)

一个功能丰富的个人数据管理系统，支持文档管理、引用记录、附件存储和自定义页面等功能。

## 功能特性

- 📚 **文档管理**: 支持Markdown、富文本文档的创建、编辑和管理
- 💬 **引用记录**: 记录和管理有价值的引用、语录和想法
- 📎 **附件系统**: 支持图片、视频、文档和脚本文件的上传和管理
- 🖥️ **自定义页面**: 创建和展示自定义内容页面
- 🔐 **安全认证**: 基于JWT的用户认证系统
- 🌙 **主题切换**: 支持明暗主题切换
- 🔍 **全局搜索**: 跨文档、引用和附件的全局搜索功能

## 技术栈

- **前端**: React, Redux Toolkit, Material-UI
- **后端**: Node.js, Express, MongoDB
- **认证**: JWT, bcrypt
- **附件处理**: Multer, MIME类型检测

## 系统要求

- Node.js >= 16.0.0
- MongoDB >= 4.4
- npm >= 8.0.0

## 部署指南

### 1. 克隆项目

```bash
git clone <repository-url>
cd personal-data-hub
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 3. 配置环境变量

#### 3.1 数据库配置

复制并配置数据库连接文件：

```bash
# 在项目根目录执行
cp backend/db.env.example backend/db.env
```

编辑 `backend/db.env` 文件，配置MongoDB连接：

```
# MongoDB数据库连接字符串
MONGODB_URI=mongodb://username:password@localhost:27017/personal-data-hub?authSource=admin

# 集合名称配置（可选）
DOCUMENT_COLLECTION=documents
QUOTE_COLLECTION=quotes
ATTACHMENT_COLLECTION=attachments
CUSTOM_PAGE_COLLECTION=custom-pages
```

#### 3.2 端口配置

```bash
# 在项目根目录执行
cp port.env.example port.env
```

编辑 `port.env` 文件：

```
# 后端服务端口
BACKEND_PORT=5000

# 前端服务端口
FRONTEND_PORT=3000

# 运行环境
NODE_ENV=development
```

#### 3.3 附件系统配置

```bash
# 在项目根目录执行
cp file.env.example file.env
```

编辑 `file.env` 文件，配置附件存储路径和安全设置：

```
# 附件存储路径
ATTACHMENTS_IMAGE_DIR=backend/attachments/images
ATTACHMENTS_VIDEO_DIR=backend/attachments/videos
ATTACHMENTS_FILE_DIR=backend/attachments/document-file
ATTACHMENTS_SCRIPT_DIR=backend/attachments/scripts

# 安全配置（生产环境必须修改）
ATTACHMENTS_SECRET=your-attachment-secret-key-change-this-in-production
ATTACHMENTS_BEARER_TOKEN=your-attachment-bearer-token-change-this-in-production
```

#### 3.4 登录认证配置

```bash
# 在项目根目录执行
cp login.env.example login.env
```

编辑 `login.env` 文件：

```
# 登录用户名
LOGIN_USERNAME=

# 登录密码（bcrypt散列值）
LOGIN_PASSWORD_HASH=

# JWT配置
JWT_SECRET=your-jwt-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

**生成密码哈希**:
在backend目录运行：
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('你的密码', 10).then(console.log)"
```

### 4. 创建必要的目录

```bash
# 在项目根目录执行
mkdir -p backend/attachments/images
mkdir -p backend/attachments/videos
mkdir -p backend/attachments/document-file
mkdir -p backend/attachments/scripts
mkdir -p backend/attachments/previews
mkdir -p backend/attachments/tmp
mkdir -p logs
```

### 5. 启动应用

#### 开发环境

**Windows系统**:
```bash
# 在项目根目录执行
start-dev.bat
```

**Linux/Mac系统**:
```bash
# 在项目根目录执行
chmod +x start-dev.sh
./start-dev.sh
```

#### 生产环境

使用PM2部署：

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart tab-backend
```

#### 手动启动（生产环境）

```bash
# 启动后端
cd backend
npm start

# 启动前端（新终端）
cd frontend
npm run build
npm start
```

### 6. 初始化数据（可选）

```bash
# 在backend目录执行
npm run init-data        # 初始化示例数据
npm run init-quotes      # 初始化引用数据
npm run init-attachments # 初始化附件数据
```

## 使用指南

### 登录系统

1. 启动应用后，访问 `http://localhost:3000`
2. 使用配置的用户名和密码登录
3. 登录成功后会跳转到主页面

### 文档管理

1. 点击侧边栏的"文档"或访问首页
2. 点击"新建文档"按钮创建新文档
3. 支持Markdown和富文本两种编辑模式
4. 可以为文档添加标签和描述
5. 支持文档搜索和标签筛选

### 引用记录

1. 点击侧边栏的"引用"
2. 点击"新建引用"添加新的引用记录
3. 可以为引用添加来源、标签和分类
4. 支持引用搜索和标签筛选

### 附件管理

1. 点击侧边栏的"附件"
2. 点击"上传附件"按钮上传文件
3. 支持图片、视频、文档和脚本四种类型
4. 可以为附件添加描述和标签
5. 支持附件预览和下载

### 自定义页面

1. 在设置中创建自定义页面
2. 支持HTML、Markdown和富文本内容
3. 可以创建多个自定义页面用于展示特定内容

### 全局搜索

1. 使用顶部搜索栏进行全局搜索
2. 搜索范围包括文档、引用和附件
3. 支持关键词高亮显示

## 配置说明

### 附件上传限制

在 `file.env` 中可以配置各类文件的上传限制：

```
# 图片最大10MB
ATTACHMENTS_MAX_IMAGE_SIZE=10485760

# 视频最大1GB
ATTACHMENTS_MAX_VIDEO_SIZE=1073741824

# 文档最大50MB
ATTACHMENTS_MAX_DOCUMENT_SIZE=52428800

# 脚本最大10MB
ATTACHMENTS_MAX_SCRIPT_SIZE=10485760
```

### 安全配置

生产环境部署时，请务必修改以下安全配置：

1. `file.env` 中的 `ATTACHMENTS_SECRET` 和 `ATTACHMENTS_BEARER_TOKEN`
2. `login.env` 中的 `JWT_SECRET` 和 `LOGIN_PASSWORD_HASH`
3. 使用强密码并定期更换

### 数据库优化

1. 定期备份数据库
2. 为大型附件考虑使用对象存储服务
3. 定期清理临时文件和缓存

## 故障排除

### 常见问题

1. **端口冲突**
   - 检查 `port.env` 中的端口配置
   - 确保端口未被其他程序占用

2. **数据库连接失败**
   - 检查 `backend/db.env` 中的MongoDB连接字符串
   - 确认MongoDB服务正在运行

3. **附件上传失败**
   - 检查附件存储目录权限
   - 确认 `file.env` 中的路径配置正确

4. **登录失败**
   - 检查 `login.env` 中的用户名和密码哈希
   - 确认JWT密钥配置正确

### 日志查看

- 开发环境：控制台输出
- 生产环境：查看 `logs/` 目录下的日志文件

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证。

## 更新日志

### v1.0.0
- 初始版本发布
- 基本文档、引用和附件管理功能
- 用户认证系统
- 全局搜索功能