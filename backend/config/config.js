/**
 * 配置对象化：把 process.env 收敛为稳定的 config 对象
 *
 * 约定：
 * - 读取 env 文件：由 backend/config/env.js 负责（dotenv 只在那边出现）
 * - 业务代码优先依赖本模块导出的 config，而不是到处散落 process.env.*
 */

require('./env');
const serverSettingsService = require('./runtime/serverSettingsService');

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

function normalizeJwtExpiresIn(value) {
  if (value === undefined || value === null) return '24h';
  const raw = String(value).trim();
  if (!raw) return '24h';

  const lower = raw.toLowerCase();
  // 允许明确关闭过期：令牌永不过期（不推荐用于公网/多用户场景）
  if (lower === 'never' || lower === 'none' || lower === 'off' || lower === 'disabled') {
    return null;
  }

  return raw;
}

const jwtExpiresIn = normalizeJwtExpiresIn(process.env.JWT_EXPIRES_IN);
const runtime = serverSettingsService.getConfig();

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
    jwtExpiresIn,
    // 滑动刷新窗口：当 token 剩余有效期 <= 该值时，在响应头中下发新 token（秒）
    jwtRefreshWindowSeconds: jwtExpiresIn ? toInt(process.env.JWT_REFRESH_WINDOW_SECONDS, 3600) : 0,
    // refresh token TTL：用于 access token 过期后无感续期（秒）
    refreshTokenTtlSeconds: toInt(process.env.REFRESH_TOKEN_TTL_SECONDS, 30 * 24 * 60 * 60),
    adminUserId: process.env.ADMIN_USER_ID || null,
    loginRateLimitEnabled: toBool(process.env.LOGIN_RATE_LIMIT_ENABLED, false),
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
      image: runtime.attachments.allowedTypes.image,
      video: runtime.attachments.allowedTypes.video,
      document: runtime.attachments.allowedTypes.document,
      script: runtime.attachments.allowedTypes.script,
    }),
    maxSizeBytes: Object.freeze({
      image: runtime.attachments.maxSizeBytes.image,
      video: runtime.attachments.maxSizeBytes.video,
      document: runtime.attachments.maxSizeBytes.document,
      script: runtime.attachments.maxSizeBytes.script,
    }),
    maxFiles: Object.freeze({
      image: runtime.attachments.maxFiles.image,
      video: runtime.attachments.maxFiles.video,
      document: runtime.attachments.maxFiles.document,
      script: runtime.attachments.maxFiles.script,
    }),
    enableDeduplication: runtime.attachments.enableDeduplication,
    enableRange: runtime.attachments.enableRange,
    cacheTtl: runtime.attachments.cacheTtlSeconds,
    secret: process.env.ATTACHMENTS_SECRET || null,
    bearerToken: process.env.ATTACHMENTS_BEARER_TOKEN || null,
    signedUrlTtlSeconds: toInt(process.env.ATTACHMENTS_SIGNED_URL_TTL, 3600),
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

  debug: Object.freeze({
    ephemeralInjection: toBool(process.env.DEBUG_EPHEMERAL_INJECTION, false),
    systemPrompt: toBool(process.env.DEBUG_SYSTEM_PROMPT, false),
  }),
});

module.exports = config;
