const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * 解析 env 文件（backend/.env）
 * @param {string} filePath - env 文件路径
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
      NODE_ENV: 'development'
    };
  }
}

// 1. 读取端口配置（只允许 backend/.env）
const envPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.error('缺少必需的配置文件：backend/.env');
  console.error('请从 backend/.env.example 复制一份并按需修改。');
  process.exit(1);
}

const portEnv = parseEnvFile(envPath);
const backendPort = portEnv.BACKEND_PORT || '5000';
const nodeEnv = portEnv.NODE_ENV || 'development';

console.log(`读取端口配置(${path.join('backend', path.basename(envPath))}): 后端=${backendPort}, 环境=${nodeEnv}`);

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
        BACKEND_PORT: backendPort
      },
      env_production: {
        NODE_ENV: 'production',
        BACKEND_PORT: backendPort
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
    }
  ]
};

// 3. 将生成的配置写入 ecosystem.config.js 文件
const configPath = path.join(__dirname, 'ecosystem.config.js');
fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`);

console.log(`已根据 ${path.basename(envPath)} 生成 ecosystem.config.js 文件。`);

// 4. 启动 PM2（仅后端）
console.log('正在使用 PM2 启动后端...');
exec('pm2 start ecosystem.config.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`启动 PM2 服务出错: ${error}`);
    return;
  }
  console.log(stdout);
  console.error(stderr);
  console.log(`\n后端已启动！`);
  console.log(`后端API: http://localhost:${backendPort}`);
});
