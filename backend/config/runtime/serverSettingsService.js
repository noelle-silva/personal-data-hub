const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const HttpError = require('../../utils/HttpError');

const SETTINGS_DIR = path.join(__dirname);
const SETTINGS_PATH = path.join(SETTINGS_DIR, 'settings.json');

const MAX_BACKUPS = 20;

const DEFAULTS = Object.freeze({
  attachments: Object.freeze({
    enableDeduplication: false,
    enableRange: true,
    cacheTtlSeconds: 3600,
    allowedTypes: Object.freeze({
      image: Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
      video: Object.freeze([
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
        'video/x-flv',
      ]),
      document: Object.freeze([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/epub+zip',
        'application/epub',
      ]),
      script: Object.freeze([
        'text/x-python',
        'application/x-msdos-program',
        'text/x-shellscript',
        'application/javascript',
        'text/x-c++src',
        'application/x-msdownload',
        'text/javascript',
      ]),
    }),
    maxSizeBytes: Object.freeze({
      image: 10485760,
      video: 1073741824,
      document: 52428800,
      script: 10485760,
    }),
    maxFiles: Object.freeze({
      image: 10,
      video: 3,
      document: 10,
      script: 10,
    }),
  }),
});

function toInt(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = Number.parseInt(String(value), 10);
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

function safeClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureDir() {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  }
}

function listBackups() {
  ensureDir();
  const entries = fs.readdirSync(SETTINGS_DIR, { withFileTypes: true });
  const backups = entries
    .filter((e) => e.isFile() && e.name.startsWith('settings.json.bak-'))
    .map((e) => e.name)
    .sort()
    .reverse();
  return backups;
}

function pruneBackups() {
  const backups = listBackups();
  for (let i = MAX_BACKUPS; i < backups.length; i += 1) {
    try {
      fs.unlinkSync(path.join(SETTINGS_DIR, backups[i]));
    } catch {
      // ignore
    }
  }
}

function atomicWriteJson(filePath, data) {
  ensureDir();
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function backupCurrentSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) return null;
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = crypto.randomBytes(4).toString('hex');
  const backupName = `settings.json.bak-${stamp}-${rand}`;
  fs.copyFileSync(SETTINGS_PATH, path.join(SETTINGS_DIR, backupName));
  pruneBackups();
  return backupName;
}

function normalizeAttachments(raw) {
  const out = {
    enableDeduplication: typeof raw?.enableDeduplication === 'boolean'
      ? raw.enableDeduplication
      : DEFAULTS.attachments.enableDeduplication,
    enableRange: typeof raw?.enableRange === 'boolean' ? raw.enableRange : DEFAULTS.attachments.enableRange,
    cacheTtlSeconds: toInt(raw?.cacheTtlSeconds, DEFAULTS.attachments.cacheTtlSeconds),
    allowedTypes: {
      image: Array.isArray(raw?.allowedTypes?.image) ? raw.allowedTypes.image : DEFAULTS.attachments.allowedTypes.image,
      video: Array.isArray(raw?.allowedTypes?.video) ? raw.allowedTypes.video : DEFAULTS.attachments.allowedTypes.video,
      document: Array.isArray(raw?.allowedTypes?.document)
        ? raw.allowedTypes.document
        : DEFAULTS.attachments.allowedTypes.document,
      script: Array.isArray(raw?.allowedTypes?.script) ? raw.allowedTypes.script : DEFAULTS.attachments.allowedTypes.script,
    },
    maxSizeBytes: {
      image: toInt(raw?.maxSizeBytes?.image, DEFAULTS.attachments.maxSizeBytes.image),
      video: toInt(raw?.maxSizeBytes?.video, DEFAULTS.attachments.maxSizeBytes.video),
      document: toInt(raw?.maxSizeBytes?.document, DEFAULTS.attachments.maxSizeBytes.document),
      script: toInt(raw?.maxSizeBytes?.script, DEFAULTS.attachments.maxSizeBytes.script),
    },
    maxFiles: {
      image: toInt(raw?.maxFiles?.image, DEFAULTS.attachments.maxFiles.image),
      video: toInt(raw?.maxFiles?.video, DEFAULTS.attachments.maxFiles.video),
      document: toInt(raw?.maxFiles?.document, DEFAULTS.attachments.maxFiles.document),
      script: toInt(raw?.maxFiles?.script, DEFAULTS.attachments.maxFiles.script),
    },
  };

  // 兜底：空数组会导致“允许类型”为 0，上传体验很差；这里强制至少一个类型
  for (const key of ['image', 'video', 'document', 'script']) {
    const list = out.allowedTypes[key];
    if (!Array.isArray(list) || list.length === 0) {
      out.allowedTypes[key] = DEFAULTS.attachments.allowedTypes[key];
    }
  }

  // 基本范围校验（防止一键把服务打挂）
  if (out.cacheTtlSeconds < 0) out.cacheTtlSeconds = DEFAULTS.attachments.cacheTtlSeconds;
  for (const k of ['image', 'video', 'document', 'script']) {
    if (out.maxFiles[k] < 1 || out.maxFiles[k] > 500) out.maxFiles[k] = DEFAULTS.attachments.maxFiles[k];
    if (out.maxSizeBytes[k] < 1024 || out.maxSizeBytes[k] > 1024 * 1024 * 1024 * 1024) {
      out.maxSizeBytes[k] = DEFAULTS.attachments.maxSizeBytes[k];
    }
  }

  return out;
}

function validateConfig(raw) {
  return {
    attachments: normalizeAttachments(raw?.attachments),
  };
}

function seedFromEnv() {
  // 迁移策略：只在 settings.json 不存在时读取 env 并落盘一次；之后不再依赖 env。
  const seeded = safeClone(DEFAULTS);

  seeded.attachments.enableDeduplication = toBool(
    process.env.ATTACHMENTS_ENABLE_DEDUPLICATION,
    DEFAULTS.attachments.enableDeduplication
  );
  seeded.attachments.enableRange = toBool(process.env.ATTACHMENTS_ENABLE_RANGE, DEFAULTS.attachments.enableRange);
  seeded.attachments.cacheTtlSeconds = toInt(process.env.ATTACHMENTS_CACHE_TTL, DEFAULTS.attachments.cacheTtlSeconds);

  seeded.attachments.allowedTypes.image = toCsvList(
    process.env.ATTACHMENTS_ALLOWED_IMAGE_TYPES,
    DEFAULTS.attachments.allowedTypes.image.join(',')
  );
  seeded.attachments.allowedTypes.video = toCsvList(
    process.env.ATTACHMENTS_ALLOWED_VIDEO_TYPES,
    DEFAULTS.attachments.allowedTypes.video.join(',')
  );
  seeded.attachments.allowedTypes.document = toCsvList(
    process.env.ATTACHMENTS_ALLOWED_DOCUMENT_TYPES,
    DEFAULTS.attachments.allowedTypes.document.join(',')
  );
  seeded.attachments.allowedTypes.script = toCsvList(
    process.env.ATTACHMENTS_ALLOWED_SCRIPT_TYPES,
    DEFAULTS.attachments.allowedTypes.script.join(',')
  );

  seeded.attachments.maxSizeBytes.image = toInt(
    process.env.ATTACHMENTS_MAX_IMAGE_SIZE,
    DEFAULTS.attachments.maxSizeBytes.image
  );
  seeded.attachments.maxSizeBytes.video = toInt(
    process.env.ATTACHMENTS_MAX_VIDEO_SIZE,
    DEFAULTS.attachments.maxSizeBytes.video
  );
  seeded.attachments.maxSizeBytes.document = toInt(
    process.env.ATTACHMENTS_MAX_DOCUMENT_SIZE,
    DEFAULTS.attachments.maxSizeBytes.document
  );
  seeded.attachments.maxSizeBytes.script = toInt(
    process.env.ATTACHMENTS_MAX_SCRIPT_SIZE,
    DEFAULTS.attachments.maxSizeBytes.script
  );

  seeded.attachments.maxFiles.image = toInt(process.env.ATTACHMENTS_MAX_IMAGE_FILES, DEFAULTS.attachments.maxFiles.image);
  seeded.attachments.maxFiles.video = toInt(process.env.ATTACHMENTS_MAX_VIDEO_FILES, DEFAULTS.attachments.maxFiles.video);
  seeded.attachments.maxFiles.document = toInt(
    process.env.ATTACHMENTS_MAX_DOCUMENT_FILES,
    DEFAULTS.attachments.maxFiles.document
  );
  seeded.attachments.maxFiles.script = toInt(process.env.ATTACHMENTS_MAX_SCRIPT_FILES, DEFAULTS.attachments.maxFiles.script);

  return validateConfig(seeded);
}

class ServerSettingsService {
  constructor() {
    this.config = null;
    this.init();
  }

  init() {
    ensureDir();
    if (!fs.existsSync(SETTINGS_PATH)) {
      const seeded = seedFromEnv();
      atomicWriteJson(SETTINGS_PATH, seeded);
      this.config = seeded;
      return;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
      this.config = validateConfig(raw);
    } catch (e) {
      // 文件损坏：不覆盖原文件，回退到默认并提示手动修复
      // eslint-disable-next-line no-console
      console.error('[server-settings] settings.json 读取失败，将使用默认值：', e.message || e);
      this.config = validateConfig(DEFAULTS);
    }
  }

  getConfig() {
    return safeClone(this.config);
  }

  getAttachments() {
    return safeClone(this.config.attachments);
  }

  updateAttachments(patch, audit = null) {
    if (!patch || typeof patch !== 'object') {
      throw new HttpError(400, '无效的更新数据：必须是对象');
    }

    const next = safeClone(this.config);
    const current = next.attachments;

    if (patch.enableDeduplication !== undefined) {
      if (typeof patch.enableDeduplication !== 'boolean') {
        throw new HttpError(400, 'enableDeduplication 必须是布尔值');
      }
      current.enableDeduplication = patch.enableDeduplication;
    }

    if (patch.enableRange !== undefined) {
      if (typeof patch.enableRange !== 'boolean') {
        throw new HttpError(400, 'enableRange 必须是布尔值');
      }
      current.enableRange = patch.enableRange;
    }

    if (patch.cacheTtlSeconds !== undefined) {
      const v = toInt(patch.cacheTtlSeconds, -1);
      if (v < 0 || v > 365 * 24 * 60 * 60) {
        throw new HttpError(400, 'cacheTtlSeconds 超出范围');
      }
      current.cacheTtlSeconds = v;
    }

    const mergeMap = (target, source, name, validator) => {
      if (source === undefined) return;
      if (!source || typeof source !== 'object') {
        throw new HttpError(400, `${name} 必须是对象`);
      }
      for (const key of ['image', 'video', 'document', 'script']) {
        if (source[key] === undefined) continue;
        const nextValue = validator(source[key], key);
        target[key] = nextValue;
      }
    };

    mergeMap(current.maxSizeBytes, patch.maxSizeBytes, 'maxSizeBytes', (value, key) => {
      const v = toInt(value, -1);
      if (v < 1024 || v > 1024 * 1024 * 1024 * 1024) {
        throw new HttpError(400, `maxSizeBytes.${key} 超出范围`);
      }
      return v;
    });

    mergeMap(current.maxFiles, patch.maxFiles, 'maxFiles', (value, key) => {
      const v = toInt(value, -1);
      if (v < 1 || v > 500) {
        throw new HttpError(400, `maxFiles.${key} 超出范围`);
      }
      return v;
    });

    mergeMap(current.allowedTypes, patch.allowedTypes, 'allowedTypes', (value, key) => {
      const list = Array.isArray(value) ? value : toCsvList(value, '');
      const cleaned = list.map((s) => String(s).trim()).filter(Boolean);
      if (cleaned.length === 0) {
        throw new HttpError(400, `allowedTypes.${key} 不能为空`);
      }
      return cleaned;
    });

    next.attachments = normalizeAttachments(current);
    const validated = validateConfig(next);

    const backupName = backupCurrentSettings();
    atomicWriteJson(SETTINGS_PATH, validated);
    this.config = validated;

    if (audit && typeof audit === 'object') {
      // eslint-disable-next-line no-console
      console.log('[server-settings] updated attachments', {
        userId: audit.userId,
        username: audit.username,
        ip: audit.ip,
        backup: backupName,
      });
    }

    return this.getAttachments();
  }

  listBackups() {
    return listBackups();
  }

  restoreBackup(backupName) {
    if (!backupName || typeof backupName !== 'string') {
      throw new HttpError(400, 'backupName 不能为空');
    }
    if (!backupName.startsWith('settings.json.bak-')) {
      throw new HttpError(400, 'backupName 非法');
    }
    const backupPath = path.join(SETTINGS_DIR, backupName);
    if (!fs.existsSync(backupPath)) {
      throw new HttpError(404, '备份不存在');
    }

    backupCurrentSettings();
    fs.copyFileSync(backupPath, SETTINGS_PATH);
    this.init();
    return this.getConfig();
  }
}

module.exports = new ServerSettingsService();
