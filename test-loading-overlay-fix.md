# 测试加载蒙版修复

## 问题描述
在笔记或引用体窗口中，第一次打开包含 attach:// 图片的内容时正常显示，但关闭后再次打开时，白色加载蒙版会残留在图片上方，即使图片已经加载完成。

## 修复内容
已从 AttachmentImage.jsx 和 AttachmentVideo.jsx 中移除加载蒙版（LoadingOverlay）及相关逻辑：

1. 移除了 LoadingOverlay 样式定义和渲染
2. 移除了 CircularProgress 导入和使用
3. 移除了基于 loading 状态的透明度设置
4. 添加了缓存就绪兜底检测，确保内部状态正确

## 测试步骤

### 1. 文档窗口测试
1. 打开一个包含 attach:// 图片的笔记
2. 确认图片正常显示（无白色蒙版）
3. 关闭窗口
4. 再次打开同一个笔记
5. **预期结果**：图片直接显示，无白色加载蒙版残留

### 2. 引用体窗口测试
1. 打开一个包含 attach:// 视频的引用体
2. 确认视频正常显示（无白色蒙版）
3. 关闭窗口
4. 再次打开同一个引用体
5. **预期结果**：视频直接显示，无白色加载蒙版残留

### 3. MarkdownInlineRenderer 路径测试
1. 在笔记编辑器中输入包含 attach:// 图片的 Markdown 内容
2. 切换到预览模式
3. **预期结果**：图片正常显示，无白色加载蒙版

### 4. HtmlSandboxRenderer 路径验证
1. 在笔记编辑器中输入包含 attach:// 图片的 HTML 内容
2. 切换到预览模式
3. **预期结果**：图片正常显示（此路径本来就无蒙版问题）

## 修改的文件
- frontend/src/components/AttachmentImage.jsx
- frontend/src/components/AttachmentVideo.jsx

## 回滚方案
如需回滚，恢复以下内容：
1. 重新添加 LoadingOverlay 样式定义
2. 重新导入 CircularProgress
3. 恢复加载状态的渲染逻辑
4. 恢复基于 loading 的透明度设置