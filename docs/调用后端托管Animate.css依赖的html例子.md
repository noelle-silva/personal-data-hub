<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="/" target="_blank">
    <title>Animate.css 原生依赖测试</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .demo-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .status {
            padding: 8px 12px;
            border-radius: 4px;
            margin: 10px 0;
            font-weight: bold;
        }
        .status.loading {
            background-color: #fff3cd;
            color: #856404;
        }
        .status.success {
            background-color: #d4edda;
            color: #155724;
        }
        .status.error {
            background-color: #f8d7da;
            color: #721c24;
        }
        h1, h2 {
            color: #333;
        }
        .description {
            color: #666;
            margin-bottom: 15px;
        }
        .code-block {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 12px;
            font-family: monospace;
            font-size: 14px;
            overflow-x: auto;
            margin: 10px 0;
        }
        .demo-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            margin: 15px 0;
            border-radius: 8px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.3s ease;
        }
        .demo-box:hover {
            transform: scale(1.05);
        }
        .animation-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .animation-card {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .animation-card:hover {
            background-color: #e9ecef;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .animation-demo {
            width: 60px;
            height: 60px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            border-radius: 50%;
            margin: 0 auto 10px;
        }
        .control-panel {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        .btn {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
            font-size: 14px;
            transition: background-color 0.3s ease;
        }
        .btn:hover {
            background-color: #0056b3;
        }
        .btn.secondary {
            background-color: #6c757d;
        }
        .btn.secondary:hover {
            background-color: #545b62;
        }
        .btn.success {
            background-color: #28a745;
        }
        .btn.success:hover {
            background-color: #1e7e34;
        }
        .animation-delay-1s {
            animation-delay: 1s;
        }
        .animation-delay-2s {
            animation-delay: 2s;
        }
        .animation-infinite {
            animation-iteration-count: infinite;
        }
        .animation-fast {
            animation-duration: 0.5s;
        }
        .animation-slow {
            animation-duration: 2s;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Animate.css 原生依赖测试</h1>
        <p class="description">本页面演示了如何在 HTML 内容中使用原生 node_modules 路径引用 Animate.css 依赖。</p>
        
        <!-- 示例 1: 绝对路径 -->
        <div class="demo-section">
            <h2>示例 1: 基础动画（绝对路径）</h2>
            <p class="description">使用绝对路径 /node_modules/animate.css/animate.min.css 加载 Animate.css。</p>
            <div class="code-block">
                <link rel="stylesheet" href="/node_modules/animate.css/animate.min.css">
            </div>
            <div id="animate1-status" class="status loading">加载中...</div>
            
            <div class="control-panel">
                <h4>点击下方按钮触发不同动画：</h4>
                <button class="btn" onclick="animateElement('bounce')">bounce</button>
                <button class="btn" onclick="animateElement('fadeIn')">fadeIn</button>
                <button class="btn" onclick="animateElement('slideInLeft')">slideInLeft</button>
                <button class="btn" onclick="animateElement('zoomIn')">zoomIn</button>
                <button class="btn" onclick="animateElement('flip')">flip</button>
                <button class="btn" onclick="animateElement('rotateIn')">rotateIn</button>
            </div>
            
            <div id="demo-box-1" class="demo-box">
                点击上方按钮查看动画效果
            </div>
        </div>
        
        <!-- 示例 2: 相对路径 -->
        <div class="demo-section">
            <h2>示例 2: 动画网格（相对路径）</h2>
            <p class="description">使用相对路径 ./node_modules/animate.css/animate.min.css 加载 Animate.css。</p>
            <div class="code-block">
                <link rel="stylesheet" href="./node_modules/animate.css/animate.min.css">
            </div>
            <div id="animate2-status" class="status loading">加载中...</div>
            
            <div class="animation-grid">
                <div class="animation-card" onclick="animateCard(this, 'bounceIn')">
                    <div class="animation-demo"></div>
                    <h5>bounceIn</h5>
                    <small>弹跳进入</small>
                </div>
                <div class="animation-card" onclick="animateCard(this, 'fadeInDown')">
                    <div class="animation-demo"></div>
                    <h5>fadeInDown</h5>
                    <small>从上淡入</small>
                </div>
                <div class="animation-card" onclick="animateCard(this, 'slideInRight')">
                    <div class="animation-demo"></div>
                    <h5>slideInRight</h5>
                    <small>从右滑入</small>
                </div>
                <div class="animation-card" onclick="animateCard(this, 'zoomInUp')">
                    <div class="animation-demo"></div>
                    <h5>zoomInUp</h5>
                    <small>从上放大</small>
                </div>
                <div class="animation-card" onclick="animateCard(this, 'lightSpeedIn')">
                    <div class="animation-demo"></div>
                    <h5>lightSpeedIn</h5>
                    <small>光速进入</small>
                </div>
                <div class="animation-card" onclick="animateCard(this, 'pulse')">
                    <div class="animation-demo"></div>
                    <h5>pulse</h5>
                    <small>脉冲</small>
                </div>
            </div>
        </div>
        
        <!-- 示例 3: 高级动画控制 -->
        <div class="demo-section">
            <h2>示例 3: 高级动画控制</h2>
            <p class="description">测试动画延迟、速度、循环等高级特性。</p>
            <div id="animate3-status" class="status loading">加载中...</div>
            
            <div class="control-panel">
                <h4>高级动画控制：</h4>
                <button class="btn success" onclick="startSequence()">开始序列动画</button>
                <button class="btn secondary" onclick="stopSequence()">停止序列</button>
                <button class="btn" onclick="toggleInfinite()">切换无限循环</button>
            </div>
            
            <div class="animation-grid">
                <div id="seq-1" class="animation-demo animate__animated"></div>
                <div id="seq-2" class="animation-demo animate__animated"></div>
                <div id="seq-3" class="animation-demo animate__animated"></div>
                <div id="seq-4" class="animation-demo animate__animated"></div>
            </div>
            
            <div class="demo-box" id="infinite-demo" onclick="toggleInfiniteAnimation()">
                点击切换无限循环动画
            </div>
        </div>
    </div>

    <!-- 示例 1: 使用绝对路径加载 Animate.css -->
    <link rel="stylesheet" href="/node_modules/animate.css/animate.compat.css">
    <!-- 备选方案：如果上面的不工作，可以尝试标准版本 -->
    <!-- <link rel="stylesheet" href="/node_modules/animate.css/animate.min.css"> -->
    <script>
        try {
            // 检查 Animate.css 是否加载成功
            setTimeout(() => {
                const testElement = document.createElement('div');
                testElement.className = 'animate__animated animate__bounce';
                testElement.style.display = 'none';
                document.body.appendChild(testElement);
                
                const computedStyle = window.getComputedStyle(testElement);
                // 检查是否有动画属性或者检查CSS规则是否存在
                const hasAnimation = computedStyle.animationName !== 'none' ||
                                   computedStyle.animationDuration !== '0s';
                
                if (hasAnimation) {
                    document.getElementById('animate1-status').className = 'status success';
                    document.getElementById('animate1-status').textContent = 'Animate.css 已成功加载（绝对路径）';
                } else {
                    // 尝试检查样式表是否加载
                    const stylesheets = Array.from(document.styleSheets);
                    const animateLoaded = stylesheets.some(sheet =>
                        sheet.href && sheet.href.includes('animate.css')
                    );
                    
                    if (animateLoaded) {
                        document.getElementById('animate1-status').className = 'status success';
                        document.getElementById('animate1-status').textContent = 'Animate.css 样式表已加载（绝对路径）';
                    } else {
                        throw new Error('Animate.css 样式未正确加载');
                    }
                }
                document.body.removeChild(testElement);
            }, 500);
            
            window.animateElement = function(animationName) {
                const element = document.getElementById('demo-box-1');
                element.className = 'demo-box animated ' + animationName;
                
                // 动画结束后移除类名
                element.addEventListener('animationend', function() {
                    element.className = 'demo-box';
                }, { once: true });
            };
        } catch (error) {
            document.getElementById('animate1-status').className = 'status error';
            document.getElementById('animate1-status').textContent = '错误: ' + error.message;
        }
    </script>

    <!-- 示例 2: 使用相对路径加载 Animate.css -->
    <link rel="stylesheet" href="./node_modules/animate.css/animate.compat.css">
    <!-- 备选方案：如果上面的不工作，可以尝试标准版本 -->
    <!-- <link rel="stylesheet" href="./node_modules/animate.css/animate.min.css"> -->
    <script>
        try {
            // 检查 Animate.css 是否加载成功
            setTimeout(() => {
                const testElement = document.createElement('div');
                testElement.className = 'animate__animated animate__fadeIn';
                testElement.style.display = 'none';
                document.body.appendChild(testElement);
                
                const computedStyle = window.getComputedStyle(testElement);
                const hasAnimation = computedStyle.animationName !== 'none' ||
                                   computedStyle.animationDuration !== '0s';
                
                if (hasAnimation) {
                    document.getElementById('animate2-status').className = 'status success';
                    document.getElementById('animate2-status').textContent = 'Animate.css 已成功加载（相对路径）';
                } else {
                    // 尝试检查样式表是否加载
                    const stylesheets = Array.from(document.styleSheets);
                    const animateLoaded = stylesheets.some(sheet =>
                        sheet.href && sheet.href.includes('animate.css')
                    );
                    
                    if (animateLoaded) {
                        document.getElementById('animate2-status').className = 'status success';
                        document.getElementById('animate2-status').textContent = 'Animate.css 样式表已加载（相对路径）';
                    } else {
                        throw new Error('Animate.css 样式未正确加载');
                    }
                }
                document.body.removeChild(testElement);
            }, 500);
            
            window.animateCard = function(card, animationName) {
                const demo = card.querySelector('.animation-demo');
                demo.className = 'animation-demo animated ' + animationName;
                
                // 动画结束后移除类名
                demo.addEventListener('animationend', function() {
                    demo.className = 'animation-demo';
                }, { once: true });
            };
        } catch (error) {
            document.getElementById('animate2-status').className = 'status error';
            document.getElementById('animate2-status').textContent = '错误: ' + error.message;
        }
    </script>

    <!-- 示例 3: 高级动画控制 -->
    <script>
        let sequenceInterval;
        let isInfinite = false;
        
        try {
            setTimeout(() => {
                const testElement = document.createElement('div');
                testElement.className = 'animate__animated animate__pulse';
                testElement.style.display = 'none';
                document.body.appendChild(testElement);
                
                const computedStyle = window.getComputedStyle(testElement);
                const hasAnimation = computedStyle.animationName !== 'none' ||
                                   computedStyle.animationDuration !== '0s';
                
                if (hasAnimation) {
                    document.getElementById('animate3-status').className = 'status success';
                    document.getElementById('animate3-status').textContent = 'Animate.css 高级功能已就绪';
                } else {
                    // 尝试检查样式表是否加载
                    const stylesheets = Array.from(document.styleSheets);
                    const animateLoaded = stylesheets.some(sheet =>
                        sheet.href && sheet.href.includes('animate.css')
                    );
                    
                    if (animateLoaded) {
                        document.getElementById('animate3-status').className = 'status success';
                        document.getElementById('animate3-status').textContent = 'Animate.css 样式表已加载';
                    } else {
                        throw new Error('Animate.css 样式未正确加载');
                    }
                }
                document.body.removeChild(testElement);
            }, 500);
            
            window.startSequence = function() {
                stopSequence(); // 先停止之前的序列
                
                const animations = ['bounceIn', 'fadeIn', 'slideInLeft', 'zoomIn'];
                let index = 0;
                
                sequenceInterval = setInterval(() => {
                    const element = document.getElementById('seq-' + (index % 4 + 1));
                    element.className = 'animation-demo animated ' + animations[index % 4];
                    
                    element.addEventListener('animationend', function() {
                        element.className = 'animation-demo animate__animated';
                    }, { once: true });
                    
                    index++;
                }, 800);
            };
            
            window.stopSequence = function() {
                if (sequenceInterval) {
                    clearInterval(sequenceInterval);
                    sequenceInterval = null;
                    
                    // 清除所有动画
                    for (let i = 1; i <= 4; i++) {
                        const element = document.getElementById('seq-' + i);
                        element.className = 'animation-demo animated';
                    }
                }
            };
            
            window.toggleInfinite = function() {
                isInfinite = !isInfinite;
                const message = isInfinite ? '无限循环已启用' : '无限循环已禁用';
                alert(message);
            };
            
            window.toggleInfiniteAnimation = function() {
                const element = document.getElementById('infinite-demo');
                const animationName = isInfinite ? 'pulse animate__infinite' : 'bounce';
                
                element.className = 'demo-box animated ' + animationName;
                
                if (!isInfinite) {
                    element.addEventListener('animationend', function() {
                        element.className = 'demo-box';
                    }, { once: true });
                }
            };
        } catch (error) {
            document.getElementById('animate3-status').className = 'status error';
            document.getElementById('animate3-status').textContent = '错误: ' + error.message;
        }
    </script>
</body>
</html>