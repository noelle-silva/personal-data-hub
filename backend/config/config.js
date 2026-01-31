/**
 * 配置对象化：把 process.env 收敛为稳定的 config 对象
 *
 * 约定：
 * - 读取 env 文件：由 backend/config/env.js 负责（dotenv 只在那边出现）
 * - 业务代码优先依赖本模块导出的 config，而不是到处散落 process.env.*
 */

require('./env');

function toInt(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function toFloat(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : defaultValue;
}

function toBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function toCsvList(value, defaultValue = '') {
  const raw = value ?? defaultValue;
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',

  server: Object.freeze({
    port: toInt(process.env.BACKEND_PORT, 5000),
    maxRequestBodySize: process.env.MAX_REQUEST_BODY_SIZE || '10mb',
  }),

  mongo: Object.freeze({
    uri: process.env.MONGODB_URI,
    collections: Object.freeze({
      documents: process.env.DOCUMENT_COLLECTION || 'documents',
      quotes: process.env.QUOTE_COLLECTION || 'quotes',
      attachments: process.env.ATTACHMENT_COLLECTION || 'attachments',
      customPages: process.env.CUSTOM_PAGE_COLLECTION || 'custom-pages',
      aiRoles: process.env.AI_ROLES_COLLECTION || 'AI-roles',
      aiChatHistory: process.env.AI_CHAT_HISTORY_COLLECTION || 'ai-chat-history',
      aiPrompts: process.env.AI_PROMPTS_COLLECTION || 'AI-prompts',
    }),
  }),

  auth: Object.freeze({
    loginUsername: process.env.LOGIN_USERNAME,
    loginPasswordHash: process.env.LOGIN_PASSWORD_HASH,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  }),

  attachments: Object.freeze({
    baseDir: process.env.ATTACHMENTS_BASE_DIR || 'backend/attachments',
    tmpDir: process.env.ATTACHMENTS_TMP_DIR || 'backend/attachments/tmp',
    dirs: Object.freeze({
      image: process.env.ATTACHMENTS_IMAGE_DIR || 'backend/attachments/images',
      video: process.env.ATTACHMENTS_VIDEO_DIR || 'backend/attachments/videos',
      document: process.env.ATTACHMENTS_FILE_DIR || 'backend/attachments/document-file',
      script: process.env.ATTACHMENTS_SCRIPT_DIR || 'backend/attachments/scripts',
    }),
    allowedTypes: Object.freeze({
      image: toCsvList(process.env.ATTACHMENTS_ALLOWED_IMAGE_TYPES, 'image/png,image/jpeg,image/webp,image/gif'),
      video: toCsvList(
        process.env.ATTACHMENTS_ALLOWED_VIDEO_TYPES,
        'video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska,video/x-flv'
      ),
      document: toCsvList(
        process.env.ATTACHMENTS_ALLOWED_DOCUMENT_TYPES,
        'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ),
      script: toCsvList(
        process.env.ATTACHMENTS_ALLOWED_SCRIPT_TYPES,
        'text/x-python,application/x-msdos-program,text/x-shellscript,application/javascript,text/x-c++src,application/x-msdownload'
      ),
    }),
    maxSizeBytes: Object.freeze({
      image: toInt(process.env.ATTACHMENTS_MAX_IMAGE_SIZE, 10485760),
      video: toInt(process.env.ATTACHMENTS_MAX_VIDEO_SIZE, 1073741824),
      document: toInt(process.env.ATTACHMENTS_MAX_DOCUMENT_SIZE, 52428800),
      script: toInt(process.env.ATTACHMENTS_MAX_SCRIPT_SIZE, 10485760),
    }),
    maxFiles: Object.freeze({
      image: toInt(process.env.ATTACHMENTS_MAX_IMAGE_FILES, 10),
      video: toInt(process.env.ATTACHMENTS_MAX_VIDEO_FILES, 3),
    }),
    enableDeduplication: toBool(process.env.ATTACHMENTS_ENABLE_DEDUPLICATION, false),
    enableRange: toBool(process.env.ATTACHMENTS_ENABLE_RANGE, false),
    cacheTtl: process.env.ATTACHMENTS_CACHE_TTL,
  }),

  wallpapers: Object.freeze({
    allowedTypes: toCsvList(process.env.WALLPAPER_ALLOWED_TYPES, 'image/jpeg,image/png,image/webp'),
    maxSizeBytes: toInt(process.env.WALLPAPER_MAX_SIZE, 10485760),
  }),

  themeColor: Object.freeze({
    primaryMinShare: toFloat(process.env.THEME_COLOR_PRIMARY_MIN_SHARE, 0.18),
    minSaturation: toFloat(process.env.THEME_COLOR_MIN_SATURATION, 0.28),
    clusterK: toInt(process.env.THEME_COLOR_CLUSTER_K, 128),
    tintMaxLight: toFloat(process.env.THEME_COLOR_TINT_MAX_LIGHT, 0.02),
    tintMaxDark: toFloat(process.env.THEME_COLOR_TINT_MAX_DARK, 0.04),
    neutralSatThreshold: toFloat(process.env.THEME_COLOR_NEUTRAL_SAT_THRESHOLD, 0.08),
    neutralShareThreshold: toFloat(process.env.THEME_COLOR_NEUTRAL_SHARE, 0.6),
    minHueDistance: toFloat(process.env.THEME_COLOR_MIN_HUE_DISTANCE, 30),
    topnDiagnostics: toInt(process.env.THEME_COLOR_TOPN_DIAGNOSTICS, 8),
  }),
});

module.exports = config;

