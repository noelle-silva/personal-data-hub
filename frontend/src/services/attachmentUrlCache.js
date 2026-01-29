/**
 * 附件 URL 工具（桌面端专用）
 * 不使用签名URL：所有附件资源统一走本机网关 `/attachments/:id`
 */

import { ensureDesktopGatewayReady } from './desktopGateway';

let cachedGateway = '';

const getGateway = async () => {
  const fromWindow = typeof window !== 'undefined' ? (window.__PDH_GATEWAY_URL__ || '') : '';
  if (fromWindow) {
    cachedGateway = fromWindow;
    return fromWindow;
  }
  if (cachedGateway) return cachedGateway;
  cachedGateway = await ensureDesktopGatewayReady();
  return cachedGateway;
};

export const getAttachmentUrlCached = async (attachmentId) => {
  if (!attachmentId) return '';
  const gateway = await getGateway();
  return `${gateway}/attachments/${attachmentId}`;
};

export const getAttachmentUrlsBatchCached = async (attachmentIds) => {
  const ids = Array.isArray(attachmentIds) ? attachmentIds.filter(Boolean) : [];
  if (ids.length === 0) return {};
  const gateway = await getGateway();
  const results = {};
  for (const id of ids) {
    results[id] = `${gateway}/attachments/${id}`;
  }
  return results;
};

export const extractAttachmentIds = (content) => {
  if (!content || typeof content !== 'string') return [];
  const regex = /attach:\/\/([a-fA-F0-9]{24})/g;
  const ids = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.add(match[1]);
  }
  return Array.from(ids);
};

export const replaceWithAttachmentUrls = async (content) => {
  if (!content || typeof content !== 'string') return content;
  const ids = extractAttachmentIds(content);
  if (ids.length === 0) return content;

  const gateway = await getGateway();
  return content.replace(/attach:\/\/([a-fA-F0-9]{24})/g, (_match, id) => {
    return `${gateway}/attachments/${id}`;
  });
};

