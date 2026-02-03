export const ATTACHMENT_EMBED_WIDTH_PERCENT_STORAGE_KEY = 'pdh_attachmentEmbedWidthPercent';
export const DEFAULT_ATTACHMENT_EMBED_WIDTH_PERCENT = 100;

const clampInt = (value, min, max) => {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

export const getAttachmentEmbedWidthPercent = () => {
  try {
    const raw = localStorage.getItem(ATTACHMENT_EMBED_WIDTH_PERCENT_STORAGE_KEY);
    const n = clampInt(raw ?? DEFAULT_ATTACHMENT_EMBED_WIDTH_PERCENT, 10, 100);
    return n ?? DEFAULT_ATTACHMENT_EMBED_WIDTH_PERCENT;
  } catch (_e) {
    return DEFAULT_ATTACHMENT_EMBED_WIDTH_PERCENT;
  }
};

export const setAttachmentEmbedWidthPercent = (value) => {
  const n = clampInt(value ?? DEFAULT_ATTACHMENT_EMBED_WIDTH_PERCENT, 10, 100);
  try {
    localStorage.setItem(
      ATTACHMENT_EMBED_WIDTH_PERCENT_STORAGE_KEY,
      String(n ?? DEFAULT_ATTACHMENT_EMBED_WIDTH_PERCENT)
    );
  } catch (_e) {
    // ignore
  }
  return n ?? DEFAULT_ATTACHMENT_EMBED_WIDTH_PERCENT;
};

export const escapeHtmlAttribute = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
};

export const buildAttachmentImageHtml = ({ attachmentId, name, widthPercent }) => {
  const safeId = String(attachmentId || '').trim();
  const safeName = escapeHtmlAttribute(name || '图片');
  const w = clampInt(widthPercent ?? getAttachmentEmbedWidthPercent(), 10, 100) ?? DEFAULT_ATTACHMENT_EMBED_WIDTH_PERCENT;
  const style = `width:${w}%;max-width:100%;height:auto;display:block;margin:0 auto;`;
  return `<img src="attach://${safeId}" alt="${safeName}" title="${safeName}" data-pdh-width="${w}" style="${style}" />`;
};

export const buildAttachmentVideoHtml = ({ attachmentId, name, widthPercent }) => {
  const safeId = String(attachmentId || '').trim();
  const safeName = escapeHtmlAttribute(name || '视频');
  const w = clampInt(widthPercent ?? getAttachmentEmbedWidthPercent(), 10, 100) ?? DEFAULT_ATTACHMENT_EMBED_WIDTH_PERCENT;
  const style = `width:${w}%;max-width:100%;height:auto;display:block;margin:0 auto;background:#000;`;
  return `<video src="attach://${safeId}" title="${safeName}" controls data-pdh-width="${w}" style="${style}"></video>`;
};

