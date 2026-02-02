/**
 * 统一加载环境变量（dotenv 只在这里出现）
 *
 * 目标：
 * - 避免 dotenv.config 分散在各个模块（尤其是 models）产生隐性副作用
 * - 使用绝对路径，避免依赖启动时的 cwd
 *
 * 约定（破坏性变更）：
 * - 后端只读取：backend/.env
 * - 不再兼容：仓库根目录 .env / backend/db.env / port.env / file.env / login.env
 *
 * 说明：
 * - 本模块只负责“把 env 文件内容注入 process.env”
 * - 业务代码应通过 config 模块（backend/config/config.js）读取配置
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const LOADED_FLAG = Symbol.for('personal-data-hub.env.loaded');

function tryLoadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    dotenv.config({ path: filePath, quiet: true });
  } catch (err) {
    // 环境变量加载失败不应悄悄吞掉非预期错误
    // 但也不要因为 optional 文件缺失导致无法启动
    // eslint-disable-next-line no-console
    console.error(`[env] 加载失败: ${filePath}`, err);
  }
}

function loadAllEnvFiles() {
  const backendRoot = path.resolve(__dirname, '..');
  const envFiles = [path.join(backendRoot, '.env')];

  // 只允许 backend/.env：缺失直接报错，避免“看似启动了但读不到配置”。
  if (!fs.existsSync(envFiles[0])) {
    // eslint-disable-next-line no-console
    console.error('[env] 缺少必需的配置文件：backend/.env');
    // eslint-disable-next-line no-console
    console.error('[env] 请从 backend/.env.example 复制一份并按需修改。');
    throw new Error('Missing backend/.env');
  }

  envFiles.forEach(tryLoadEnvFile);

  return { backendRoot, envFiles };
}

if (!global[LOADED_FLAG]) {
  global[LOADED_FLAG] = loadAllEnvFiles();
}

module.exports = global[LOADED_FLAG];
