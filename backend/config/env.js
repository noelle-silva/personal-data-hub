/**
 * 统一加载环境变量（dotenv 只在这里出现）
 *
 * 目标：
 * - 避免 dotenv.config 分散在各个模块（尤其是 models）产生隐性副作用
 * - 使用绝对路径，避免依赖启动时的 cwd
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
  const repoRoot = path.resolve(__dirname, '..', '..');

  // 优先支持收敛后的单文件配置：仓库根目录的 .env（可选）
  // 兼容现有仓库布局：db.env 在 backend/ 下，其余在仓库根目录
  const envFiles = [
    path.join(repoRoot, '.env'),
    path.join(repoRoot, 'backend', 'db.env'),
    path.join(repoRoot, 'port.env'),
    path.join(repoRoot, 'file.env'),
    path.join(repoRoot, 'login.env'),
  ];

  envFiles.forEach(tryLoadEnvFile);

  return { repoRoot, envFiles };
}

if (!global[LOADED_FLAG]) {
  global[LOADED_FLAG] = loadAllEnvFiles();
}

module.exports = global[LOADED_FLAG];
