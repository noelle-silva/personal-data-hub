# AI配置说明

## 概述

AI配置已从环境变量迁移到前端设置页面管理，通过后端的JSON文件持久化存储。这种方式提供了更灵活的配置管理和更好的用户体验。

## 配置文件结构

AI配置存储在 `backend/config/ai/settings.json` 文件中，结构如下：

```json
{
  "enabled": false,
  "current": null,
  "providers": {
    "provider-key": {
      "AI_BASE_URL": "https://api.openai.com/v1",
      "AI_API_KEY": "sk-your-api-key-here",
      "AI_ALLOWED_MODELS": ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]
    }
  }
}
```

### 字段说明

- `enabled`: 布尔值，控制AI功能的启用/禁用状态
- `current`: 字符串或null，指定当前使用的供应商键名
- `providers`: 对象，包含所有供应商配置

#### 供应商配置字段

- `AI_BASE_URL`: API基础URL（必填）
- `AI_API_KEY`: API密钥（必填）
- `AI_ALLOWED_MODELS`: 允许的模型列表数组（可选，留空则允许所有模型）

## 使用方法

### 1. 前端设置页面

1. 启动应用后，在侧边栏点击"设置"
2. 找到"AI设置"区块
3. 开启AI功能开关
4. 点击"添加供应商"按钮
5. 填写供应商信息：
   - 供应商名称（如：OpenAI、DeepSeek等）
   - API Base URL
   - API Key
   - 允许的模型列表（可选，用逗号分隔）
6. 保存供应商配置
7. 在下拉菜单中选择要使用的供应商

### 2. 支持的AI服务

系统支持所有兼容OpenAI API规范的服务，包括：

- **OpenAI官方API**
  - API Base URL: `https://api.openai.com/v1`
  - 模型示例: `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`

- **DeepSeek**
  - API Base URL: `https://api.deepseek.com/v1`
  - 模型示例: `deepseek-chat`, `deepseek-coder`

- **智谱AI**
  - API Base URL: `https://open.bigmodel.cn/api/paas/v4`
  - 模型示例: `glm-4`, `glm-3-turbo`

- **Azure OpenAI**
  - API Base URL: `https://your-resource.openai.azure.com/openai/deployments/your-deployment`
  - 模型示例: `gpt-4`, `gpt-35-turbo`

### 3. 配置示例

#### OpenAI配置示例
```json
{
  "enabled": true,
  "current": "openai",
  "providers": {
    "openai": {
      "AI_BASE_URL": "https://api.openai.com/v1",
      "AI_API_KEY": "sk-your-openai-api-key",
      "AI_ALLOWED_MODELS": ["gpt-4o-mini", "gpt-4o"]
    }
  }
}
```

#### 多供应商配置示例
```json
{
  "enabled": true,
  "current": "deepseek",
  "providers": {
    "openai": {
      "AI_BASE_URL": "https://api.openai.com/v1",
      "AI_API_KEY": "sk-your-openai-api-key",
      "AI_ALLOWED_MODELS": ["gpt-4o-mini", "gpt-4o"]
    },
    "deepseek": {
      "AI_BASE_URL": "https://api.deepseek.com/v1",
      "AI_API_KEY": "sk-your-deepseek-api-key",
      "AI_ALLOWED_MODELS": ["deepseek-chat", "deepseek-coder"]
    }
  }
}
```

## API接口

### 获取AI配置
```
GET /api/ai/v1/config
```

### 更新AI配置
```
PUT /api/ai/v1/config
Content-Type: application/json

{
  "enabled": true,
  "current": "openai"
}
```

### 获取所有供应商
```
GET /api/ai/v1/providers
```

### 创建/更新供应商
```
POST /api/ai/v1/providers/{key}
Content-Type: application/json

{
  "AI_BASE_URL": "https://api.openai.com/v1",
  "AI_API_KEY": "sk-your-api-key",
  "AI_ALLOWED_MODELS": ["gpt-4o-mini", "gpt-4o"]
}
```

### 删除供应商
```
DELETE /api/ai/v1/providers/{key}
```

### 设置当前供应商
```
POST /api/ai/v1/providers/{key}/select
```

## 安全注意事项

1. **API密钥安全**: API密钥会完整存储在配置文件中，请确保文件访问权限设置正确
2. **配置文件备份**: 建议定期备份 `backend/config/ai/settings.json` 文件
3. **环境隔离**: 不同环境（开发、测试、生产）应使用不同的API密钥

## 故障排除

### 1. AI功能无法启用
- 检查是否已添加至少一个供应商配置
- 确认供应商的API密钥和Base URL配置正确
- 查看后端日志获取详细错误信息

### 2. 模型列表为空
- 检查供应商的API Base URL是否可访问
- 验证API密钥是否有效
- 确认AI_ALLOWED_MODELS配置是否正确

### 3. 聊天请求失败
- 确认当前供应商已正确选择
- 检查API密钥是否有足够的配额
- 查看浏览器控制台和网络请求获取详细错误信息

## 迁移指南

如果你之前使用的是 `ai.env` 环境变量配置，可以按照以下步骤迁移：

1. 在设置页面创建新的供应商配置
2. 将 `ai.env` 中的配置信息填入对应的字段
3. 保存配置并选择该供应商
4. 删除 `ai.env` 文件（可选）

## 角色配置

AI角色的默认模型、温度等参数现在完全由角色配置决定，不再依赖全局环境变量。建议：

1. 在设置页面的"AI角色管理"中为每个角色配置合适的默认模型
2. 根据不同角色的用途调整温度、最大输出Token等参数
3. 在AI聊天页面必须显式选择一个角色或选择"无系统提示词"选项

### 重要变更

默认角色功能已移除，现在必须：
- 在聊天时显式选择一个AI角色，或
- 选择"无系统提示词"选项来禁用系统提示词

系统不再提供默认角色兜底，请确保在每次对话前都明确选择角色或禁用系统提示词。