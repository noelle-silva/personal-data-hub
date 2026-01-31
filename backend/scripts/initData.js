/**
 * 数据库初始化脚本
 * 用于将测试数据导入到MongoDB数据库中
 */

const config = require('../config/config');
const mongoose = require('mongoose');
const Document = require('../models/Document');

/**
 * 测试文档数据
 */
const sampleDocuments = [
  {
    title: "AI中的数学基础",
    content: "这篇笔记深入探讨了人工智能算法背后所依赖的数学原理，特别是线性代数、概率论以及微积分在神经网络中的应用。理解这些基础对于掌握深度学习至关重要。线性代数提供了向量空间和矩阵运算的基础，概率论帮助我们理解和建模不确定性，而微积分则是优化算法的核心。在神经网络中，反向传播算法本质上就是链式法则的应用。",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
    <title>AI中的数学基础</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .highlight { background-color: #f0f8ff; padding: 10px; border-radius: 5px; }
        .formula { font-style: italic; color: #0066cc; }
        button { background-color: #4CAF50; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>AI中的数学基础</h1>
    <div class="highlight">
        <p>这篇笔记深入探讨了人工智能算法背后所依赖的数学原理，特别是线性代数、概率论以及微积分在神经网络中的应用。</p>
    </div>
    
    <h2>核心数学领域</h2>
    <ul>
        <li><strong>线性代数</strong>：提供向量空间和矩阵运算的基础</li>
        <li><strong>概率论</strong>：帮助我们理解和建模不确定性</li>
        <li><strong>微积分</strong>：优化算法的核心</li>
    </ul>
    
    <h2>反向传播算法</h2>
    <p>在神经网络中，反向传播算法本质上就是<span class="formula">链式法则</span>的应用。</p>
    
    <button onclick="alert('这是一个交互式示例！')">点击交互</button>
    
    <script>
        console.log('HTML内容已加载');
        document.addEventListener('DOMContentLoaded', function() {
            const button = document.querySelector('button');
            button.addEventListener('click', function() {
                this.style.backgroundColor = '#45a049';
            });
        });
    </script>
</body>
</html>`,
    tags: ["数学", "AI", "机器学习", "深度学习", "基础理论"],
    source: "VCP对话记录"
  },
  {
    title: "React Hooks深入理解",
    content: "React Hooks是React 16.8引入的新特性，它允许你在不编写class的情况下使用state以及其他的React特性。useState是最基础的Hook，用于在函数组件中添加状态。useEffect用于处理副作用，可以替代生命周期方法。useContext让你不使用组件嵌套就可以在组件树间进行状态传递。自定义Hook则让你能够将组件逻辑提取到可重用的函数中。",
    tags: ["React", "Hooks", "前端开发", "JavaScript", "状态管理"],
    source: "学习笔记"
  },
  {
    title: "MongoDB数据建模最佳实践",
    content: "MongoDB作为文档数据库，其数据建模方式与传统关系型数据库有很大不同。嵌入与引用的选择是MongoDB设计中的核心问题。嵌入适合一对一和一对多的关系，可以提高读取性能；引用适合多对多关系，提供更好的数据一致性。数组是MongoDB的强大特性，可以用来表示一对多关系。在设计模式上，可以使用属性模式、桶模式、模式版本等来优化数据结构和查询性能。",
    tags: ["MongoDB", "NoSQL", "数据库设计", "数据建模", "最佳实践"],
    source: "技术文档"
  },
  {
    title: "Redux Toolkit使用指南",
    content: "Redux Toolkit是Redux官方推荐的状态管理工具，它简化了Redux的配置和使用。configureStore函数简化了store的创建，createSlice函数自动生成action creators和action types。createAsyncThunk处理异步操作，配合extraReducers可以优雅地处理异步状态。Immer库的集成使得状态更新更加简单，可以直接修改状态而不用担心不可变性。RTK Query则提供了完整的数据获取和缓存解决方案。",
    tags: ["Redux", "状态管理", "Redux Toolkit", "React", "前端"],
    source: "项目实践"
  },
  {
    title: "Node.js异步编程模式",
    content: "Node.js的异步编程是其核心特性，理解事件循环、回调函数、Promise和async/await至关重要。事件循环是Node.js非阻塞I/O的基础，理解宏任务和微任务的执行顺序有助于编写高效的异步代码。Promise解决了回调地狱问题，提供了更优雅的异步处理方式。async/await则是Promise的语法糖，让异步代码看起来像同步代码，提高了代码的可读性。错误处理在异步编程中尤为重要，需要使用try/catch或.catch()来捕获错误。",
    tags: ["Node.js", "异步编程", "JavaScript", "事件循环", "后端开发"],
    source: "技术分享"
  },
  {
    title: "Material-UI主题定制与样式系统",
    content: "Material-UI提供了强大的主题系统，允许开发者自定义应用的外观和感觉。createTheme函数用于创建主题对象，可以自定义调色板、排版、间距等。ThemeProvider组件将主题传递给子组件。样式系统提供了多种方式来应用样式，包括styled API、sx prop和makeStyles。响应式设计通过useMediaQuery Hook实现，可以根据屏幕尺寸应用不同的样式。全局样式可以通过GlobalStyles或CssBaseline组件来应用。",
    tags: ["Material-UI", "React", "UI设计", "主题定制", "响应式设计"],
    source: "UI设计笔记"
  },
  {
    title: "Python数据分析实战",
    content: "Python在数据分析领域有着强大的生态系统。Pandas库提供了高效的数据结构和数据分析工具，NumPy是科学计算的基础，Matplotlib和Seaborn则用于数据可视化。Jupyter Notebook作为交互式开发环境，让数据探索变得更加直观。本笔记总结了使用Python进行数据清洗、转换、分析和可视化的最佳实践。",
    tags: ["Python", "数据分析", "Pandas", "NumPy", "可视化"],
    source: "在线课程"
  },
  {
    title: "Docker容器化部署指南",
    content: "Docker彻底改变了软件的部署方式。通过容器化，我们可以确保应用在不同环境中的一致性。Dockerfile定义了镜像的构建过程，Docker Compose则用于管理多容器应用。容器编排工具如Kubernetes进一步简化了大规模部署。本指南涵盖了从基础概念到生产环境部署的完整流程。",
    tags: ["Docker", "容器化", "DevOps", "部署", "Kubernetes"],
    source: "技术博客"
  },
  {
    title: "TypeScript类型系统详解",
    content: "TypeScript为JavaScript添加了静态类型检查，大大提高了代码的可维护性和可靠性。基本类型、接口、泛型、类型守卫等概念构成了TypeScript的类型系统。高级类型如联合类型、交叉类型、条件类型提供了强大的类型操作能力。理解类型推断和类型兼容性对于编写优雅的TypeScript代码至关重要。",
    tags: ["TypeScript", "JavaScript", "类型系统", "前端开发", "静态类型"],
    source: "官方文档"
  },
  {
    title: "GraphQL API设计原则",
    content: "GraphQL是一种用于API的查询语言和运行时环境。与REST相比，GraphQL允许客户端精确地请求所需的数据，避免了过度获取和不足获取的问题。Schema定义了API的能力，Resolver负责获取数据。查询、变更和订阅是GraphQL的三种主要操作类型。本笔记探讨了GraphQL的设计模式和最佳实践。",
    tags: ["GraphQL", "API", "查询语言", "后端开发", "Schema设计"],
    source: "技术分享"
  },
  {
    title: "HTML交互式笔记示例",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
    <title>HTML交互式笔记示例</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .container { max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; backdrop-filter: blur(10px); }
        .demo-box { background: rgba(255,255,255,0.2); padding: 15px; margin: 10px 0; border-radius: 8px; }
        button { background: #ff6b6b; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; margin: 5px; transition: all 0.3s; }
        button:hover { background: #ff5252; transform: translateY(-2px); }
        .counter { font-size: 24px; text-align: center; margin: 20px 0; }
        input { padding: 8px; border-radius: 4px; border: none; margin: 5px; }
        .todo-item { background: rgba(255,255,255,0.15); padding: 10px; margin: 5px 0; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; }
        .completed { text-decoration: line-through; opacity: 0.7; }
    </style>
</head>
<body>
    <div class="container">
        <h1>HTML交互式笔记示例</h1>
        <p>这是一个纯HTML笔记，展示了各种交互功能。</p>
        
        <div class="demo-box">
            <h3>计数器示例</h3>
            <div class="counter" id="counter">0</div>
            <button onclick="increment()">+1</button>
            <button onclick="decrement()">-1</button>
            <button onclick="reset()">重置</button>
        </div>
        
        <div class="demo-box">
            <h3>待办事项列表</h3>
            <div>
                <input type="text" id="todoInput" placeholder="输入待办事项...">
                <button onclick="addTodo()">添加</button>
            </div>
            <div id="todoList"></div>
        </div>
        
        <div class="demo-box">
            <h3>主题切换</h3>
            <button onclick="toggleTheme()">切换主题</button>
        </div>
    </div>
    
    <script>
        let count = 0;
        let todos = [];
        let isDarkTheme = false;
        
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
        
        function addTodo() {
            const input = document.getElementById('todoInput');
            const text = input.value.trim();
            if (text) {
                todos.push({ id: Date.now(), text, completed: false });
                input.value = '';
                renderTodos();
            }
        }
        
        function toggleTodo(id) {
            todos = todos.map(todo =>
                todo.id === id ? { ...todo, completed: !todo.completed } : todo
            );
            renderTodos();
        }
        
        function deleteTodo(id) {
            todos = todos.filter(todo => todo.id !== id);
            renderTodos();
        }
        
        function renderTodos() {
            const todoList = document.getElementById('todoList');
            todoList.innerHTML = todos.map(todo =>
                \`<div class="todo-item \${todo.completed ? 'completed' : ''}">
                    <span>\${todo.text}</span>
                    <div>
                        <button onclick="toggleTodo(\${todo.id})">\${todo.completed ? '未完成' : '完成'}</button>
                        <button onclick="deleteTodo(\${todo.id})">删除</button>
                    </div>
                </div>\`
            ).join('');
        }
        
        function toggleTheme() {
            isDarkTheme = !isDarkTheme;
            const body = document.body;
            if (isDarkTheme) {
                body.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #434343 100%)';
                body.style.color = '#ffffff';
            } else {
                body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                body.style.color = '#ffffff';
            }
        }
        
        // 初始化
        renderTodos();
        
        // 监听回车键添加待办事项
        document.getElementById('todoInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
        
        // 页面加载完成提示
        console.log('HTML交互式笔记已加载完成！');
    </script>
</body>
</html>`,
    tags: ["HTML", "交互式", "示例", "前端"],
    source: "系统测试数据"
  }
];

/**
 * 初始化数据库函数
 */
async function initializeDatabase() {
  try {
    // 连接到数据库
    const mongoURI = config.mongo.uri;
    if (!mongoURI) {
      throw new Error('MONGODB_URI环境变量未定义');
    }

    await mongoose.connect(mongoURI);
    console.log('已连接到MongoDB数据库');

    // 清空现有数据
    await Document.deleteMany({});
    console.log('已清空现有文档数据');

    // 插入示例数据
    const insertedDocuments = await Document.insertMany(sampleDocuments);
    console.log(`成功插入 ${insertedDocuments.length} 条文档数据`);

    // 显示插入的文档标题
    console.log('\n插入的文档列表:');
    insertedDocuments.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title}`);
    });

    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
    console.log('数据初始化完成！');

  } catch (error) {
    console.error('数据初始化失败:', error.message);
    process.exit(1);
  }
}

// 执行初始化函数
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
