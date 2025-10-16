/**
 * 端口配置设置脚本
 * 根据port.env文件配置前后端端口
 */

const fs = require('fs');
const path = require('path');

// 手动解析环境变量文件
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
    return {};
  }
}

// 加载端口配置
const portEnv = parseEnvFile('./port.env');
const backendPort = portEnv.BACKEND_PORT || 5000;
const frontendPort = portEnv.FRONTEND_PORT || 3000;

console.log(`配置端口: 后端=${backendPort}, 前端=${frontendPort}`);

// 更新前端package.json中的代理配置
const frontendPackagePath = path.join(__dirname, 'frontend', 'package.json');
const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));

// 更新代理配置
frontendPackage.proxy = `http://localhost:${backendPort}`;

// 写回文件
fs.writeFileSync(frontendPackagePath, JSON.stringify(frontendPackage, null, 2));

console.log(`已更新前端代理配置为: http://localhost:${backendPort}`);
console.log('端口配置完成！');