import React, { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import parse, { domToReact } from 'html-react-parser';
import {
  generateTabActionFancyCssScoped,
  generateQuoteActionFancyCssScoped,
  generateAttachmentActionFancyCssScoped,
} from '../utils/tabActionStyles';
import { replaceWithAttachmentUrls, extractAttachmentIds } from '../services/attachmentUrlCache';
import AttachmentImage from './AttachmentImage';
import AttachmentVideo from './AttachmentVideo';

const RendererContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  position: 'relative',
  minHeight: 100,
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  minHeight: 200,
}));

const ErrorContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.errorContainer.main || '#ffebee',
  color: theme.palette.errorContainer.contrastText || '#c62828',
  borderRadius: 16,
  marginTop: theme.spacing(1),
}));

const SCOPE_CLASS = 'pdh-html-note';

const extractDocParts = (html) => {
  if (!html) return { styleText: '', bodyHtml: '' };

  const hasDocLevelTags = /<!DOCTYPE|<html|<head|<body/i.test(html);
  if (!hasDocLevelTags) return { styleText: '', bodyHtml: html };

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 不执行脚本：避免把脚本带入 App 上下文
    doc.querySelectorAll('script').forEach((el) => el.remove());

    const styleText = Array.from(doc.querySelectorAll('style'))
      .map((el) => el.textContent || '')
      .filter(Boolean)
      .join('\n');

    const bodyHtml = doc.body ? doc.body.innerHTML : html;
    return { styleText, bodyHtml };
  } catch (_e) {
    return { styleText: '', bodyHtml: html };
  }
};

const getTextFromDomNodes = (nodes) => {
  if (!Array.isArray(nodes)) return '';
  let text = '';
  for (const n of nodes) {
    if (!n) continue;
    if (n.type === 'text' && typeof n.data === 'string') text += n.data;
    if (Array.isArray(n.children) && n.children.length > 0) text += getTextFromDomNodes(n.children);
  }
  return text.trim();
};

/**
 * HTML 内联渲染组件（不使用 iframe）
 * 适用场景：桌面端(Tauri)下避免 iframe/srcDoc 卡死。
 *
 * 注意：不会执行 <script>，且用户自定义 <style> 可能影响全局样式（你自己写的就自己负责）。
 */
const HtmlInlineRenderer = ({ content, fallbackContent = null, cacheKey = null, ttl }) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [bodyHtml, setBodyHtml] = useState('');
  const [styleText, setStyleText] = useState('');

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setError(null);
      setProcessing(true);

      try {
        const raw = String(content || '');
        if (!raw.trim()) {
          if (alive) {
            setBodyHtml('');
            setStyleText('');
          }
          return;
        }

        const ids = extractAttachmentIds(raw);
        const processed = ids.length > 0 ? await replaceWithAttachmentUrls(raw) : raw;
        const parts = extractDocParts(processed);
        if (alive) {
          setBodyHtml(parts.bodyHtml || '');
          setStyleText(parts.styleText || '');
        }
      } catch (e) {
        if (alive) {
          setError(e?.message || 'HTML 渲染失败');
        }
      } finally {
        if (alive) setProcessing(false);
      }
    };

    run();

    return () => {
      alive = false;
    };
  }, [content, cacheKey, ttl]);

  const scopedActionStyles = useMemo(() => {
    const tab = generateTabActionFancyCssScoped(SCOPE_CLASS);
    const quote = generateQuoteActionFancyCssScoped(SCOPE_CLASS);
    const attachment = generateAttachmentActionFancyCssScoped(SCOPE_CLASS);
    return `${tab}\n${quote}\n${attachment}`;
  }, []);

  const parsed = useMemo(() => {
    const rawBody = String(bodyHtml || '');
    if (!rawBody.trim()) return null;

    const ensureAnchorAttrs = (attribs) => {
      const next = { ...(attribs || {}) };
      const href = String(next.href || '');
      const isSpecial = /^\s*(mailto:|tel:)/i.test(href);
      if (!isSpecial) {
        if (!next.target) next.target = '_blank';
        const rel = String(next.rel || '');
        if (!/\bnoopener\b/i.test(rel) || !/\bnoreferrer\b/i.test(rel)) {
          next.rel = `${rel} noopener noreferrer`.trim();
        }
      }
      return next;
    };

    return parse(rawBody, {
      replace: (node) => {
        if (!node || node.type !== 'tag') return undefined;

        if (node.name === 'script') return <></>;

        if (node.name === 'a') {
          const attribs = ensureAnchorAttrs(node.attribs);
          return <a {...attribs}>{domToReact(node.children || [])}</a>;
        }

        if (node.name === 'img' && node.attribs?.src && String(node.attribs.src).startsWith('attach://')) {
          const attachmentId = String(node.attribs.src).slice('attach://'.length).trim();
          const widthPercentRaw = node.attribs['data-pdh-width'];
          const widthPercent = Number.parseInt(String(widthPercentRaw || ''), 10);
          const style = Number.isFinite(widthPercent)
            ? { width: `${widthPercent}%`, maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }
            : { maxWidth: '100%', height: 'auto' };

          return (
            <AttachmentImage
              id={attachmentId}
              alt={node.attribs.alt || ''}
              title={node.attribs.title || ''}
              style={style}
              ttl={ttl}
            />
          );
        }

        if (node.name === 'video' && node.attribs?.src && String(node.attribs.src).startsWith('attach://')) {
          const attachmentId = String(node.attribs.src).slice('attach://'.length).trim();
          const widthPercentRaw = node.attribs['data-pdh-width'];
          const widthPercent = Number.parseInt(String(widthPercentRaw || ''), 10);
          const style = Number.isFinite(widthPercent)
            ? { width: `${widthPercent}%`, maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }
            : { maxWidth: '100%', height: 'auto' };

          return (
            <AttachmentVideo
              id={attachmentId}
              title={node.attribs.title || ''}
              style={style}
              controls={node.attribs.controls !== undefined}
              ttl={ttl}
            />
          );
        }

        if (node.name === 'x-tab-action') {
          const action = String(node.attribs?.['data-action'] || '').trim();
          const docId = String(node.attribs?.['data-doc-id'] || '').trim();
          const quoteId = String(node.attribs?.['data-quote-id'] || '').trim();
          const attachmentId = String(node.attribs?.['data-attachment-id'] || '').trim();
          const variant = String(node.attribs?.['data-variant'] || 'primary').trim() || 'primary';

          const label = getTextFromDomNodes(node.children) || undefined;
          const className =
            action === 'open-quote'
              ? 'quote-action-button'
              : action === 'open-attachment'
                ? 'attachment-action-button'
                : 'tab-action-button';

          const handleClick = () => {
            const messageData = {
              type: 'tab-action',
              action,
              docId: docId || undefined,
              quoteId: quoteId || undefined,
              attachmentId: attachmentId || undefined,
              label,
              variant,
              source: 'html-inline',
            };
            try {
              window.postMessage(messageData, window.location.origin);
            } catch (_e) {
              // ignore
            }
          };

          return (
            <button type="button" className={className} data-variant={variant} onClick={handleClick}>
              {domToReact(node.children || []) || '打开'}
            </button>
          );
        }

        return undefined;
      },
    });
  }, [bodyHtml, ttl]);

  if (!content) {
    return (
      <RendererContainer>
        <LoadingContainer>
          <Typography variant="body2" color="text.secondary">
            暂无HTML内容
          </Typography>
        </LoadingContainer>
      </RendererContainer>
    );
  }

  if (error) {
    return (
      <RendererContainer>
        <ErrorContainer>
          <Typography variant="body2">{error}</Typography>
          {fallbackContent && <Box sx={{ mt: 2 }}>{fallbackContent}</Box>}
        </ErrorContainer>
      </RendererContainer>
    );
  }

  return (
    <RendererContainer>
      {processing && (
        <LoadingContainer>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            正在渲染HTML内容...
          </Typography>
        </LoadingContainer>
      )}

      {!processing && (
        <Box
          className={SCOPE_CLASS}
          sx={{
            padding: 2,
            lineHeight: 1.6,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          <style>{scopedActionStyles}</style>
          {styleText ? <style>{styleText}</style> : null}
          {parsed}
        </Box>
      )}
    </RendererContainer>
  );
};

export default HtmlInlineRenderer;

