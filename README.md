# 个人数据中心 (Personal Data Hub)

一个基于"原子化笔记 + 引用体 + 标签 + 数据库优先 + MD/HTML 混合内容 + 窗口化引用"设计哲学的个人知识管理系统，旨在降低心智负担、放大表达与连接的上限。

## 设计哲学

本系统围绕以下核心理念构建：

- **原子化笔记**：每条笔记是最小知识单元，彼此的引用与组织就像原子之间的键合，构成更高阶的知识结构
- **连接优先**：笔记之间可相互引用；引入"引用体"来以某个角度聚合若干笔记与素材，实现多维度的自由组织
- **数据库优于手工归档**：不依赖文件夹层级管理，改以数据库与索引来供需两端解耦，减少人为分类的开销与错位
- **标签多视角**：标签为轻量的多属性标注，支持并存的视角与语义，驱动检索与筛选
- **内容多形态**：同时支持 Markdown 与 HTML。Markdown关注易写易读；HTML承担更强表现力与交互，适配 AI 时代由模型生成丰富交互内容的趋势
- **窗口化引用**：在笔记内容中渲染"打开窗口"的动作，直达目标笔记或引用体，现场联动，增强关联说明上限
- **附件即一等公民**：图片、视频、文档、脚本等外部资料通过安全签名与引用被纳入知识网络，增强语义上下文

> 详细设计哲学说明请参考 [`docs/design-philosophy.md`](docs/design-philosophy.md)

## 功能特性

- 📚 **文档管理**: 支持Markdown、HTML文档的创建、编辑和管理，支持原子化笔记和相互引用
- 💬 **引用记录**: 记录和管理有价值的引用、语录和想法，支持多维度聚合组织
- 📎 **附件系统**: 支持图片、视频、文档和脚本文件的上传和管理，作为一等公民纳入知识网络
- 🖥️ **自定义页面**: 创建和展示自定义内容页面，混合排序与编排展示各类内容
- 🔐 **安全认证**: 基于JWT的用户认证系统
- 🌙 **主题切换**: 支持明暗主题切换
- 🔍 **全局搜索**: 跨文档、引用和附件的全局搜索功能
- 🚀 **HTML笔记动态化**: 支持在HTML笔记中安全地引用由后端统一托管的前端库（如Animate.css, Chart.js等），轻松创建具有丰富交互和动态效果的笔记内容。
  - 详细说明请参考：[`docs/HTML笔记如何使用后端托管依赖.md`](docs/HTML笔记如何使用后端托管依赖.md)
  - 查看一个具体示例：[`docs/调用后端托管Animate.css依赖的html例子.md`](docs/调用后端托管Animate.css依赖的html例子.md)


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

### 2. 启动MongoDB数据库（使用Docker）

本项目使用Docker运行MongoDB数据库实例：

```bash
# 进入MongoDB配置目录
cd backend/mongodb-compose

# 复制环境变量文件
cp .env.example .env

# 编辑环境变量文件，设置用户名和密码
# 在Windows系统中
notepad .env
# 在Linux/Mac系统中
nano .env

# 复制Docker Compose配置文件
cp docker-compose.yml.example docker-compose.yml

# 编辑docker-compose.yml文件，修改数据卷挂载路径
# 将"数据库数据的主机实际路径"替换为您希望存储数据的实际路径
# 例如: "C:/data/mongodb:/data/db" (Windows)
# 或 "/home/username/data/mongodb:/data/db" (Linux/Mac)

# 启动MongoDB容器
docker-compose up -d

# 检查容器状态
docker-compose ps

# 返回项目根目录
cd ../..
```

### 3. 安装依赖

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

首先，生成密码哈希值（在backend目录运行）：
```bash
cd backend
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('你的密码', 10).then(console.log)"
cd ..
```

复制并配置登录认证文件：
```bash
# 在项目根目录执行
cp login.env.example login.env
```

编辑 `login.env` 文件：

```
# 登录用户名
LOGIN_USERNAME=你的用户名

# 登录密码（bcrypt散列值）- 使用上一步生成的哈希值
LOGIN_PASSWORD_HASH=生成的哈希值

# JWT配置
JWT_SECRET=your-jwt-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

### 4. 启动应用

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

# 启动应用（推荐方式）
node start-pm2.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart tab-backend
```

**注意**: 请使用 `node start-pm2.js` 而不是 `pm2 start ecosystem.config.js`，因为前者会先读取端口配置并动态生成适合的配置文件。

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

1. 启动应用后，访问 `http://localhost:你前面设定的端口号`
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
2. 支持HTML、Markdown内容
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



## 许可证

本项目采用 MIT 许可证。

## 更新日志

### v1.0.0
- 初始版本发布
- 基本文档、引用和附件管理功能
- 用户认证系统
- 全局搜索功能