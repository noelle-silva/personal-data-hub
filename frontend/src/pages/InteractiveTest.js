import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MarkdownSandboxRenderer from '../components/MarkdownSandboxRenderer';
import HtmlSandboxRenderer from '../components/HtmlSandboxRenderer';

// 样式化的容器
const StyledContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
}));

// 样式化的纸张
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: 16,
}));

// 样式化的测试区域
const TestArea = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  minHeight: 200,
}));

// Markdown 测试内容
const markdownTestContent = `# Markdown 渲染测试

这是一个用于测试 Markdown 渲染功能的笔记，包含了各种常见的 Markdown 元素。

## 文本格式

这是**粗体文本**，这是*斜体文本*，这是~~删除线文本~~。

## Tab Action 测试

### 打开文档按钮测试

点击下面的按钮打开文档：

<x-tab-action data-action="open-document" data-doc-id="68e1e191bc12b9b0db5014a5" data-label="测试文档">测试文档</x-tab-action>

### 打开引用体按钮测试

点击下面的按钮打开引用体：

<x-tab-action data-action="open-quote" data-quote-id="68e00d3a62437b2f12e00deb" data-label="Docker实现细节">Docker实现细节</x-tab-action>

### 不同样式变体测试

- Primary 变体（默认）：
  <x-tab-action data-action="open-quote" data-quote-id="68e00d3a62437b2f12e00deb" data-variant="primary" data-label="Primary 引用体">Primary 引用体</x-tab-action>

- Secondary 变体：
  <x-tab-action data-action="open-quote" data-quote-id="68e00d3a62437b2f12e00deb" data-variant="secondary" data-label="Secondary 引用体">Secondary 引用体</x-tab-action>

- Success 变体：
  <x-tab-action data-action="open-document" data-doc-id="68e1e191bc12b9b0db5014a5" data-variant="success" data-label="Success 文档">Success 文档</x-tab-action>

### 使用元素内容作为按钮文本

<x-tab-action data-action="open-quote" data-quote-id="68e00d3a62437b2f12e00deb">
  查看引用体详情
</x-tab-action>

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

## 代码

### 行内代码

在文本中可以使用 \`console.log('Hello')\` 这样的行内代码。

### 代码块

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
\`\`\`

## 数学公式测试

### 内联公式

这是一个内联公式：$E = mc^2$，这是另一个内联公式：\(a^2 + b^2 = c^2\)。

货币符号应该不会被解析为公式：这个商品价格是 $99.99，不是公式。

### 块级公式

下面是块级公式：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

也可以使用 LaTeX 标准分隔符：

\[
\frac{\partial f}{\partial t} = D \nabla^2 f
\]

### 复杂公式

矩阵：
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$

分式：
$$
\frac{1}{\sqrt{2\pi\sigma^2}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}
$$

求和：
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

### 代码块中的美元符号

以下代码块中的 $ 符号不应该被解析为公式：

\`\`\`bash
# 计算文件大小
size=$(du -sh file.txt | cut -f1)
echo "文件大小: $size"
\`\`\`

\`\`\`javascript
// 模板字符串
const price = 99.99;
const formattedPrice = \`$\${price}\`;
console.log(\`价格: $\{formattedPrice}\`);
\`\`\`

## 交互式脚本

<button onclick="alert('Hello from Markdown!')">点击我</button>

<div id="counter" style="margin: 10px 0;">
  <button onclick="incrementCount()">增加计数</button>
  <span>计数: <span id="count">0</span></span>
</div>

<script>
  let count = 0;
  function incrementCount() {
    count++;
    document.getElementById('count').textContent = count;
  }
</script>`;

// HTML 测试内容
const htmlTestContent = `<!DOCTYPE html>
<html>
<head>
    <title>HTML交互式测试</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .demo-section { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 20px; 
            margin: 10px 0; 
            border-radius: 8px; 
        }
        .interactive { 
            background: #f5f5f5; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 8px; 
            color: #333;
        }
        button { 
            background: #4CAF50; 
            color: white; 
            border: none; 
            padding: 10px 15px; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 5px;
            transition: all 0.3s;
        }
        button:hover { 
            background: #45a049; 
            transform: translateY(-2px);
        }
        .counter { 
            font-size: 24px; 
            text-align: center; 
            margin: 20px 0; 
        }
        .media-demo { 
            text-align: center; 
            margin: 20px 0; 
        }
        img { 
            max-width: 100%; 
            height: auto; 
            border-radius: 8px; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .popup-demo {
            background: #e3f2fd;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            color: #333;
        }
    </style>
</head>
<body>
    <h1>HTML交互式测试</h1>
    <p>这是一个纯HTML测试页面，展示了各种交互功能。</p>
    
    <div class="demo-section">
        <h2>渐变背景区域</h2>
        <p>这个区域使用了CSS渐变背景。</p>
    </div>
    
    <div class="interactive">
        <h2>计数器示例</h2>
        <div class="counter" id="counter">0</div>
        <button onclick="increment()">+1</button>
        <button onclick="decrement()">-1</button>
        <button onclick="reset()">重置</button>
    </div>
    
    <div class="interactive">
        <h2>颜色切换</h2>
        <button onclick="changeBackground()">改变背景色</button>
        <button onclick="resetBackground()">重置背景</button>
    </div>
    
    <div class="popup-demo">
        <h2>弹窗测试</h2>
        <button onclick="showAlert()">显示警告</button>
        <button onclick="showConfirm()">显示确认</button>
        <button onclick="openNewWindow()">打开新窗口</button>
    </div>
    
    <div class="media-demo">
        <h2>媒体展示</h2>
        <img src="https://via.placeholder.com/600x300/4285F4/FFFFFF?text=HTML+交互式测试" alt="测试图片">
        <p>这是一个测试图片，展示了HTML笔记中的图片展示功能。</p>
    </div>
    
    <div class="interactive">
        <h2>动态内容</h2>
        <div id="dynamicContent">
            <p>点击下面的按钮添加动态内容：</p>
        </div>
        <button onclick="addContent()">添加内容</button>
        <button onclick="clearContent()">清空内容</button>
    </div>
    
    <div class="interactive">
        <h2>表单测试</h2>
        <form onsubmit="handleSubmit(event)">
            <input type="text" id="textInput" placeholder="输入文本..." style="padding: 8px; margin: 5px; border-radius: 4px; border: 1px solid #ccc;">
            <button type="submit">提交</button>
        </form>
        <div id="formResult" style="margin-top: 10px;"></div>
    </div>
    
    <div class="interactive">
        <h2>Tab Action 测试</h2>
        <p>测试 HTML 中的 x-tab-action 标记，点击按钮应该能打开对应的文档或引用体窗口：</p>
        
        <h3>打开文档按钮测试</h3>
        <x-tab-action data-action="open-document" data-doc-id="68e1e191bc12b9b0db5014a5" data-label="HTML 测试文档">HTML 测试文档</x-tab-action>
        
        <h3>打开引用体按钮测试</h3>
        <x-tab-action data-action="open-quote" data-quote-id="68e00d3a62437b2f12e00deb" data-label="HTML Docker实现细节">HTML Docker实现细节</x-tab-action>
        
        <h3>不同样式变体测试</h3>
        <p>Primary 变体（默认）：</p>
        <x-tab-action data-action="open-quote" data-quote-id="68e00d3a62437b2f12e00deb" data-variant="primary" data-label="Primary HTML 引用体">Primary HTML 引用体</x-tab-action>
        
        <p>Secondary 变体：</p>
        <x-tab-action data-action="open-quote" data-quote-id="68e00d3a62437b2f12e00deb" data-variant="secondary" data-label="Secondary HTML 引用体">Secondary HTML 引用体</x-tab-action>
        
        <p>Success 变体：</p>
        <x-tab-action data-action="open-document" data-doc-id="68e1e191bc12b9b0db5014a5" data-variant="success" data-label="Success HTML 文档">Success HTML 文档</x-tab-action>
        
        <h3>使用元素内容作为按钮文本</h3>
        <x-tab-action data-action="open-quote" data-quote-id="68e00d3a62437b2f12e00deb">
          查看 HTML 引用体详情
        </x-tab-action>
    </div>
    
    <script>
        let count = 0;
        let contentCount = 0;
        const originalBackground = document.body.style.background;
        
        function increment() {
            count++;
            document.getElementById('counter').textContent = count;
        }
        
        function decrement() {
            count--;
            document.getElementById('counter').textContent = count;
        }
        
        function reset() {
            count = 0;
            document.getElementById('counter').textContent = count;
        }
        
        function changeBackground() {
            const colors = ['#f0f8ff', '#e8f5e8', '#fff8e1', '#fce4ec', '#e3f2fd'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            document.body.style.backgroundColor = randomColor;
        }
        
        function resetBackground() {
            document.body.style.backgroundColor = originalBackground;
        }
        
        function showAlert() {
            alert('这是一个警告消息！');
        }
        
        function showConfirm() {
            const result = confirm('你确定要继续吗？');
            if (result) {
                alert('你点击了确定！');
            } else {
                alert('你点击了取消！');
            }
        }
        
        function openNewWindow() {
            window.open('https://github.com', '_blank');
        }
        
        function addContent() {
            contentCount++;
            const dynamicContent = document.getElementById('dynamicContent');
            const newElement = document.createElement('div');
            newElement.innerHTML = \`<p>这是动态添加的内容 #\${contentCount}</p>\`;
            newElement.style.padding = '10px';
            newElement.style.margin = '5px 0';
            newElement.style.backgroundColor = '#f0f0f0';
            newElement.style.borderRadius = '4px';
            dynamicContent.appendChild(newElement);
        }
        
        function clearContent() {
            const dynamicContent = document.getElementById('dynamicContent');
            dynamicContent.innerHTML = '<p>点击下面的按钮添加动态内容：</p>';
            contentCount = 0;
        }
        
        function handleSubmit(event) {
            event.preventDefault();
            const input = document.getElementById('textInput');
            const result = document.getElementById('formResult');
            
            if (input.value.trim()) {
                result.innerHTML = \`<p style="color: green;">你输入了: "\${input.value}"</p>\`;
                input.value = '';
            } else {
                result.innerHTML = '<p style="color: red;">请输入一些内容！</p>';
            }
        }
        
        // 页面加载完成提示
        console.log('HTML交互式测试页面已加载完成！');
        
        // 监听页面大小变化
        window.addEventListener('resize', function() {
            console.log('页面大小已改变:', window.innerWidth + 'x' + window.innerHeight);
        });
        
        // 定时器示例
        setInterval(function() {
            const now = new Date();
            console.log('当前时间:', now.toLocaleTimeString());
        }, 10000);
    </script>
</body>
</html>`;

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`interactive-test-tabpanel-${index}`}
      aria-labelledby={`interactive-test-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const InteractiveTest = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <StyledContainer maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        交互式测试页面
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        此页面用于测试 Markdown 和 HTML 内容的渲染与交互功能。内容在非沙盒受信模式下运行，可完全访问父页面功能。
      </Alert>

      <StyledPaper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="交互式测试标签"
          variant="fullWidth"
        >
          <Tab label="Markdown 测试" />
          <Tab label="HTML 测试" />
          <Tab label="附件引用测试" />
          <Tab label="原生依赖测试" />
          <Tab label="性能测试" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Markdown 渲染测试
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            测试 Markdown 内容的渲染，包括基本格式、代码块和交互式脚本。
          </Typography>
          <TestArea>
            <MarkdownSandboxRenderer
              content={markdownTestContent}
              cacheKey="markdown-test"
            />
          </TestArea>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            HTML 渲染测试
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            测试 HTML 内容的渲染，包括样式、交互、媒体展示和弹窗功能。
          </Typography>
          <TestArea>
            <HtmlSandboxRenderer
              content={htmlTestContent}
              cacheKey="html-test"
            />
          </TestArea>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            原生依赖测试
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            测试通过原生 node_modules 路径引入外部依赖（如 three.js），支持 UMD 和 ESM 两种加载方式。
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>ESM 加载方式（绝对路径）</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                使用绝对路径 /node_modules/three/build/three.module.min.js 加载 three.js 的 ESM 版本：
              </Typography>
              <TestArea>
                <HtmlSandboxRenderer
                  content={`
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                      <h3>Three.js ESM 测试（绝对路径）</h3>
                      <div id="esmabsdemo" style="width: 100%; height: 200px; border: 1px solid #ccc; margin: 10px 0;"></div>
                      <p>状态: <span id="esmabsstatus">加载中...</span></p>
                    </div>
                    <script type="module">
                      console.log('ESM绝对路径示例: 开始导入three');
                      try {
                        import * as THREE from '/node_modules/three/build/three.module.min.js';
                        console.log('ESM绝对路径示例: THREE已加载，版本:', THREE.REVISION);
                        document.getElementById('esmabsstatus').textContent = 'Three.js ESM 已加载，版本: ' + THREE.REVISION;
                        
                        // 创建简单的 3D 场景
                        const container = document.getElementById('esmabsdemo');
                        const scene = new THREE.Scene();
                        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
                        const renderer = new THREE.WebGLRenderer({ antialias: true });
                        renderer.setSize(container.clientWidth, container.clientHeight);
                        container.appendChild(renderer.domElement);
                        
                        // 添加一个立方体
                        const geometry = new THREE.BoxGeometry();
                        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                        const cube = new THREE.Mesh(geometry, material);
                        scene.add(cube);
                        
                        camera.position.z = 5;
                        
                        // 简单动画
                        function animate() {
                          requestAnimationFrame(animate);
                          cube.rotation.x += 0.01;
                          cube.rotation.y += 0.01;
                          renderer.render(scene, camera);
                        }
                        animate();
                      } catch (error) {
                        console.error('ESM绝对路径示例: 导入three时出错', error);
                        document.getElementById('esmabsstatus').textContent = '错误: ' + error.message;
                      }
                    </script>
                  `}
                  cacheKey="three-esm-abs-test"
                />
              </TestArea>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>UMD 加载方式（相对路径）</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                使用相对路径 ./node_modules/three/build/three.min.js 加载 three.js 的 UMD 版本：
              </Typography>
              <TestArea>
                <HtmlSandboxRenderer
                  content={`
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                      <h3>Three.js UMD 测试（相对路径）</h3>
                      <div id="relumddemo" style="width: 100%; height: 200px; border: 1px solid #ccc; margin: 10px 0;"></div>
                      <p>状态: <span id="relumdstatus">加载中...</span></p>
                    </div>
                    <script src="./node_modules/three/build/three.min.js"></script>
                    <script>
                      try {
                        if (typeof THREE !== 'undefined') {
                          document.getElementById('relumdstatus').textContent = 'Three.js 已加载，版本: ' + THREE.REVISION;
                          
                          // 创建简单的 3D 场景
                          const container = document.getElementById('relumddemo');
                          const scene = new THREE.Scene();
                          const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
                          const renderer = new THREE.WebGLRenderer();
                          renderer.setSize(container.clientWidth, container.clientHeight);
                          container.appendChild(renderer.domElement);
                          
                          // 添加一个球体
                          const geometry = new THREE.SphereGeometry(1, 32, 32);
                          const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                          const sphere = new THREE.Mesh(geometry, material);
                          scene.add(sphere);
                          
                          camera.position.z = 5;
                          
                          // 简单动画
                          function animate() {
                            requestAnimationFrame(animate);
                            sphere.rotation.y += 0.02;
                            renderer.render(scene, camera);
                          }
                          animate();
                        } else {
                          document.getElementById('relumdstatus').textContent = 'Three.js 加载失败';
                        }
                      } catch (error) {
                        document.getElementById('relumdstatus').textContent = '错误: ' + error.message;
                      }
                    </script>
                  `}
                  cacheKey="three-relative-umd-test"
                />
              </TestArea>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>ESM 加载方式（绝对路径）</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                使用绝对路径 /node_modules/three/build/three.module.js 加载 three.js 的 ESM 版本：
              </Typography>
              <TestArea>
                <HtmlSandboxRenderer
                  content={`
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                      <h3>Three.js ESM 测试（绝对路径）</h3>
                      <div id="esmdemo" style="width: 100%; height: 200px; border: 1px solid #ccc; margin: 10px 0;"></div>
                      <p>状态: <span id="esmstatus">加载中...</span></p>
                    </div>
                    <script type="module">
                      import * as THREE from '/node_modules/three/build/three.module.js';
                      
                      try {
                        document.getElementById('esmstatus').textContent = 'Three.js ESM 已加载，版本: ' + THREE.REVISION;
                        
                        // 创建简单的 3D 场景
                        const container = document.getElementById('esmdemo');
                        const scene = new THREE.Scene();
                        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
                        const renderer = new THREE.WebGLRenderer();
                        renderer.setSize(container.clientWidth, container.clientHeight);
                        container.appendChild(renderer.domElement);
                        
                        // 添加一个圆环
                        const geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
                        const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
                        const torus = new THREE.Mesh(geometry, material);
                        scene.add(torus);
                        
                        camera.position.z = 5;
                        
                        // 简单动画
                        function animate() {
                          requestAnimationFrame(animate);
                          torus.rotation.x += 0.01;
                          torus.rotation.y += 0.02;
                          renderer.render(scene, camera);
                        }
                        animate();
                      } catch (error) {
                        document.getElementById('esmstatus').textContent = '错误: ' + error.message;
                      }
                    </script>
                  `}
                  cacheKey="three-esm-test"
                />
              </TestArea>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>ESM 裸模块导入 + OrbitControls</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                使用裸模块名导入 three.js 和 OrbitControls，自动注入 import map：
              </Typography>
              <TestArea>
                <HtmlSandboxRenderer
                  content={`
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                      <h3>Three.js 裸模块 + OrbitControls 测试</h3>
                      <div id="baremoddemo" style="width: 100%; height: 200px; border: 1px solid #ccc; margin: 10px 0;"></div>
                      <p>状态: <span id="baremodstatus">加载中...</span></p>
                      <p>使用鼠标拖拽旋转场景</p>
                    </div>
                    <script type="module">
                      import * as THREE from 'three';
                      import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
                      
                      try {
                        document.getElementById('baremodstatus').textContent = 'Three.js 和 OrbitControls 已加载，版本: ' + THREE.REVISION;
                        
                        // 创建简单的 3D 场景
                        const container = document.getElementById('baremoddemo');
                        const scene = new THREE.Scene();
                        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
                        const renderer = new THREE.WebGLRenderer({ antialias: true });
                        renderer.setSize(container.clientWidth, container.clientHeight);
                        container.appendChild(renderer.domElement);
                        
                        // 添加多个几何体
                        const geometries = [
                          new THREE.BoxGeometry(1, 1, 1),
                          new THREE.SphereGeometry(0.7, 32, 32),
                          new THREE.ConeGeometry(0.7, 1, 32)
                        ];
                        
                        const materials = [
                          new THREE.MeshBasicMaterial({ color: 0xff0000 }),
                          new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
                          new THREE.MeshBasicMaterial({ color: 0x0000ff })
                        ];
                        
                        for (let i = 0; i < 3; i++) {
                          const mesh = new THREE.Mesh(geometries[i], materials[i]);
                          mesh.position.x = (i - 1) * 2;
                          scene.add(mesh);
                        }
                        
                        camera.position.z = 5;
                        
                        // 添加轨道控制器
                        const controls = new OrbitControls(camera, renderer.domElement);
                        controls.enableDamping = true;
                        controls.dampingFactor = 0.05;
                        
                        // 动画循环
                        function animate() {
                          requestAnimationFrame(animate);
                          
                          // 旋转几何体
                          scene.children.forEach((child, index) => {
                            if (child.isMesh) {
                              child.rotation.x += 0.01 * (index + 1);
                              child.rotation.y += 0.01 * (index + 1);
                            }
                          });
                          
                          controls.update();
                          renderer.render(scene, camera);
                        }
                        animate();
                      } catch (error) {
                        document.getElementById('baremodstatus').textContent = '错误: ' + error.message;
                        console.error('Three.js 错误:', error);
                      }
                    </script>
                  `}
                  cacheKey="three-bare-module-test"
                />
              </TestArea>
            </AccordionDetails>
          </Accordion>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            附件引用测试 (attach://)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            测试 Markdown 和 HTML 内容中的 attach:// 引用功能，验证签名URL生成、缓存和图片显示。
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            注意：这些测试使用了示例附件ID。如果附件不存在或已被删除，将显示占位图。
          </Alert>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Markdown 中的图片引用</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                测试 Markdown 语法中的 attach:// 引用：
              </Typography>
              <TestArea>
                <MarkdownSandboxRenderer
                  content={`# 附件引用测试

这是一个测试 Markdown 中的 attach:// 引用的示例。

## 有效引用示例

### 基本图片引用
![示例图片1](attach://68e4ae62577d02adc74896d4 "测试图片1")

### 带样式的图片引用
![示例图片2](attach://68e4af5eb57d7ecd1aec5078 "测试图片2" | style="max-width: 300px; border: 1px solid #ccc;")

### 无效引用示例（应显示占位图）
![无效图片](attach://000000000000000000000000 "无效附件ID")

## 引用特性

- 所有图片都会通过签名URL加载，确保安全性
- 支持缓存机制，避免重复请求
- 支持错误处理，失败时显示占位图
- 支持自定义样式属性
- 视频支持自动播放、静音、循环等属性

## 视频引用示例

### 基本视频引用
<video src="attach://68e4ae62577d02adc74896d4" controls width="400" height="300"></video>

### 带属性的视频引用
<video src="attach://68e4af5eb57d7ecd1aec5078" controls autoplay muted loop width="400" height="300"></video>

### 带封面的视频引用
<video src="attach://68e4ae62577d02adc74896d4" controls poster="https://via.placeholder.com/400x300/cccccc/000000?text=视频封面" width="400" height="300"></video>

## 代码块中的引用

代码块中的 attach:// 不应被解析：

\`\`\`
// 这是一个代码块
const imageUrl = "attach://68e4ae62577d02adc74896d4";
const videoUrl = "attach://68e4af5eb57d7ecd1aec5078";
console.log("图片URL:", imageUrl);
console.log("视频URL:", videoUrl);
\`\`\`
`}
                  cacheKey="markdown-attachment-test"
                />
              </TestArea>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>HTML 中的图片引用</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                测试 HTML 语法中的 attach:// 引用：
              </Typography>
              <TestArea>
                <HtmlSandboxRenderer
                  content={`
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                      <h1>HTML 附件引用测试</h1>
                      <p>这是一个测试 HTML 中的 attach:// 引用的示例。</p>
                      
                      <h2>有效引用示例</h2>
                      
                      <h3>基本图片引用</h3>
                      <img src="attach://68e4ae62577d02adc74896d4" alt="测试图片1" title="HTML测试图片1" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px;">
                      
                      <h3>带样式的图片引用</h3>
                      <img src="attach://68e4af5eb57d7ecd1aec5078" alt="测试图片2" title="HTML测试图片2" style="width: 300px; height: 200px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                      
                      <h3>响应式图片引用</h3>
                      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <img src="attach://68e4ae62577d02adc74896d4" alt="小图" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
                        <img src="attach://68e4af5eb57d7ecd1aec5078" alt="中图" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px;">
                      </div>
                      
                      <hr style="margin: 20px 0; border: 1px solid #eee;">
                      
                      <h3>基本视频引用</h3>
                      <video src="attach://68e4ae62577d02adc74896d4" controls style="max-width: 100%; height: auto; border-radius: 8px; background-color: #000;"></video>
                      
                      <h3>带属性的视频引用</h3>
                      <video src="attach://68e4af5eb57d7ecd1aec5078" controls autoplay muted loop style="max-width: 100%; height: auto; border-radius: 8px; background-color: #000;"></video>
                      
                      <h3>指定尺寸的视频引用</h3>
                      <video src="attach://68e4ae62577d02adc74896d4" controls width="400" height="300" style="border-radius: 8px; background-color: #000;"></video>
                      
                      <h2>无效引用示例</h2>
                      <img src="attach://000000000000000000000000" alt="无效图片" style="border: 1px solid #f00; padding: 10px;">
                      
                      <h2>测试特性</h2>
                      <ul>
                        <li>所有图片都会通过签名URL加载</li>
                        <li>所有视频都会通过签名URL加载</li>
                        <li>支持批量获取签名URL，提高性能</li>
                        <li>支持缓存机制，避免重复请求</li>
                        <li>支持错误处理，失败时显示占位图</li>
                        <li>支持自定义样式属性</li>
                        <li>视频支持自动播放、静音、循环等属性</li>
                      </ul>
                      
                      <h2>调试信息</h2>
                      <div id="debug-info" style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                        调试信息将在这里显示...
                      </div>
                      
                      <script>
                        // 调试脚本：显示图片加载状态
                        document.addEventListener('DOMContentLoaded', function() {
                          const debugInfo = document.getElementById('debug-info');
                          const images = document.querySelectorAll('img');
                          let loadedCount = 0;
                          let errorCount = 0;
                          
                          debugInfo.innerHTML = '检测到 ' + images.length + ' 个图片元素\\n';
                          
                          images.forEach((img, index) => {
                            const src = img.getAttribute('src');
                            debugInfo.innerHTML += (index + 1) + '. ' + src + '\\n';
                            
                            img.addEventListener('load', function() {
                              loadedCount++;
                              debugInfo.innerHTML += '   图片已加载 (' + loadedCount + '/' + images.length + ')\\n';
                            });
                            
                            img.addEventListener('error', function() {
                              errorCount++;
                              debugInfo.innerHTML += '   图片加载失败 (' + errorCount + '/' + images.length + ')\\n';
                            });
                          });
                          
                          // 检查初始状态
                          setTimeout(function() {
                            images.forEach((img, index) => {
                              if (img.complete && img.naturalHeight !== 0) {
                                loadedCount++;
                              }
                            });
                            
                            debugInfo.innerHTML += '初始状态: ' + loadedCount + ' 个已加载, ' + errorCount + ' 个失败\\n';
                          }, 100);
                        });
                      </script>
                    </div>
                  `}
                  cacheKey="html-attachment-test"
                />
              </TestArea>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>混合内容测试</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                测试 Markdown 和 HTML 混合内容中的 attach:// 引用：
              </Typography>
              <TestArea>
                <MarkdownSandboxRenderer
                  content={`# 混合内容测试

这个测试展示了在 Markdown 内容中嵌入 HTML，并使用 attach:// 引用图片和视频。

## Markdown 中的图片

![Markdown 图片](attach://68e4ae62577d02adc74896d4 "Markdown中的图片")

## Markdown 中的视频

<video src="attach://68e4ae62577d02adc74896d4" controls width="400" height="300"></video>

## 嵌入 HTML

<div style="display: flex; gap: 20px; align-items: center; margin: 20px 0;">
  <div>
    <h4>HTML 容器中的图片</h4>
    <img src="attach://68e4af5eb57d7ecd1aec5078" alt="HTML中的图片" style="width: 200px; height: 150px; object-fit: cover; border-radius: 8px;">
  </div>
  <div>
    <h4>HTML 容器中的视频</h4>
    <video src="attach://68e4ae62577d02adc74896d4" controls autoplay muted loop style="width: 200px; height: 150px; border-radius: 8px; background-color: #000;"></video>
  </div>
  <div>
    <h4>说明文本</h4>
    <p>这是在 Markdown 中嵌入的 HTML 容器，其中包含 attach:// 引用的图片和视频。</p>
    <p>两种引用方式都应该正常工作，并使用相同的签名URL机制。</p>
  </div>
</div>

## 测试特性

- ✅ Markdown 中的 attach:// 引用
- ✅ HTML 中的 attach:// 引用
- ✅ 混合内容中的样式应用
- ✅ 签名URL的缓存机制
- ✅ 错误处理和占位图显示`}
                  cacheKey="mixed-attachment-test"
                />
              </TestArea>
            </AccordionDetails>
          </Accordion>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            性能与安全测试
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>高度自适应测试</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                测试内容高度变化时 iframe 的自适应能力。点击下面的按钮添加大量内容：
              </Typography>
              <Button variant="contained" onClick={() => {
                const testContent = `
                  <div style="padding: 20px; background: #f0f0f0; margin: 10px 0; border-radius: 8px;">
                    <h3>动态添加的内容块</h3>
                    <p>这是一个动态添加的内容块，用于测试高度自适应功能。</p>
                    <p>当前时间: ${new Date().toLocaleString()}</p>
                    <div style="height: 100px; background: linear-gradient(45deg, #ff9a9e, #fecfef); border-radius: 8px;"></div>
                  </div>
                `;
                // 这里应该通过某种方式向渲染器发送内容
                alert('在实际应用中，这里会向渲染器发送新内容来测试高度自适应');
              }}>
                添加测试内容
              </Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>沙盒安全测试</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                测试非沙盒受信模式的交互能力，脚本可直接访问父页面：
              </Typography>
              <Alert severity="warning">
                ⚠️ 脚本可访问父页面：所有脚本可直接访问父页面的 DOM 和 JavaScript<br/>
                ⚠️ 完全交互能力：支持弹窗、表单提交、本地存储等完整浏览器功能<br/>
                ✅ 安全的外链：所有链接在新窗口打开并添加安全属性
              </Alert>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>性能监控</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                监控渲染性能和资源使用情况：
              </Typography>
              <Alert severity="info">
                📊 渲染时间：通常在 100ms 以内<br/>
                📊 内存使用：轻量级，适合大量文档<br/>
                📊 消息通信：使用防抖机制，避免频繁更新
              </Alert>
            </AccordionDetails>
          </Accordion>
        </TabPanel>
      </StyledPaper>

      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          测试说明
        </Typography>
        <Typography variant="body2" paragraph>
          此测试页面验证了以下功能：
        </Typography>
        <ul>
          <li>Markdown 内容的正确渲染和交互</li>
          <li>HTML 内容的原生渲染和交互</li>
          <li>附件引用功能 (attach://) 的安全性</li>
          <li>签名URL的生成和缓存机制</li>
          <li>图片加载的错误处理</li>
          <li>沙盒环境的安全隔离</li>
          <li>高度自适应机制</li>
          <li>媒体内容的展示</li>
          <li>弹窗和新窗口功能</li>
        </ul>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">
          注意：所有交互功能都在沙盒环境中运行，确保主应用的安全性。
        </Typography>
      </StyledPaper>
    </StyledContainer>
  );
};

export default InteractiveTest;