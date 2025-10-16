const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * 解析 .env 文件
 * @param {string} filePath - .env 文件路径
 * @returns {object} - 解析后的键值对对象
 */
function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    
    lines.forEach(line => {
      // 跳过注释和空行
      if (line.trim() && !line.trim().startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return env;
  } catch (error) {
    console.error(`读取环境变量文件失败: ${error.message}`);
    // 如果文件不存在，返回默认值
    return {
      BACKEND_PORT: '5000',
      FRONTEND_PORT: '3000',
      NODE_ENV: 'development'
    };
  }
}

// 1. 读取端口配置
const portEnv = parseEnvFile('./port.env');
const backendPort = portEnv.BACKEND_PORT || '5000';
const frontendPort = portEnv.FRONTEND_PORT || '3000';
const nodeEnv = portEnv.NODE_ENV || 'development';

console.log(`读取端口配置: 后端=${backendPort}, 前端=${frontendPort}, 环境=${nodeEnv}`);

// 2. 动态生成 ecosystem.config.js 的内容
const ecosystemConfig = {
  apps: [
    {
      name: 'tab-backend',
      script: 'server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      ignore_watch: [
        'backend/attachments/*',
        'backend/node_modules/*',
        'backend/logs/*',
        'backend/tmp/*'
      ],
      max_memory_restart: '2560M',
      env: {
        NODE_ENV: nodeEnv,
        PORT: backendPort
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: backendPort
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'tab-frontend',
      script: './node_modules/react-scripts/bin/react-scripts.js',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      watch: false,
      autorestart: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      env: {
        PORT: frontendPort
      }
    }
  ]
};

// 3. 将生成的配置写入 ecosystem.config.js 文件
const configPath = path.join(__dirname, 'ecosystem.config.js');
fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`);

console.log('已根据 port.env 生成 ecosystem.config.js 文件。');

// 4. 运行 setup-ports.js 来更新前端代理配置
console.log('正在运行 setup-ports.js...');
exec('node setup-ports.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`执行 setup-ports.js 出错: ${error}`);
    return;
  }
  console.log(stdout);
  console.error(stderr);

  // 5. 启动 PM2
  console.log('正在使用 PM2 启动服务...');
  exec('pm2 start ecosystem.config.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`启动 PM2 服务出错: ${error}`);
      return;
    }
    console.log(stdout);
    console.error(stderr);
    console.log(`\n服务已启动！`);
    console.log(`后端API: http://localhost:${backendPort}`);
    console.log(`前端应用: http://localhost:${frontendPort}`);
  });
});