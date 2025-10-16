import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { renderMarkdownToHtml, generateBaseStyles, generateHighlightStyles, generateKatexStyles } from '../utils/markdownRenderer';

// 样式化的容器
const RendererContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  position: 'relative',
  minHeight: 100,
}));

// 样式化的加载状态
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  minHeight: 200,
}));

// 样式化的错误状态
const ErrorContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.errorContainer.main || '#ffebee',
  color: theme.palette.errorContainer.contrastText || '#c62828',
  borderRadius: 16,
  marginTop: theme.spacing(1),
}));

// 样式化的iframe
const StyledIframe = styled('iframe')(({ theme }) => ({
  width: '100%',
  border: 'none',
  borderRadius: 0,
  backgroundColor: 'transparent',
}));

/**
 * Markdown 沙盒渲染组件
 * 使用 iframe 沙盒安全地渲染 Markdown 内容
 */
const MarkdownSandboxRenderer = ({
  content,
  fallbackContent = null,
  cacheKey = null
}) => {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [height, setHeight] = useState(200); // 初始高度
  
  // 生成唯一的沙盒ID，用于消息通信
  const sandboxId = useMemo(() => {
    return `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 渲染 Markdown 为 HTML
  const renderedHtml = useMemo(() => {
    try {
      if (!content) return '';
      return renderMarkdownToHtml(content, cacheKey);
    } catch (err) {
      console.error('Markdown 渲染错误:', err);
      setError('渲染失败，请检查内容格式');
      return '';
    }
  }, [content, cacheKey]);

  // 生成完整的 HTML 文档
  const fullHtml = useMemo(() => {
    if (!renderedHtml) return '';

    const baseStyles = generateBaseStyles();
    const highlightStyles = generateHighlightStyles();
    const katexStyles = generateKatexStyles();
    
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Markdown 内容</title>
        <base target="_blank">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
        <style>
          ${baseStyles}
          ${highlightStyles}
          ${katexStyles}
          
          /* 滚动条样式 */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          
          /* 确保内容不会溢出，并禁止内部滚动 */
          body {
            box-sizing: border-box;
            word-wrap: break-word;
            overflow-wrap: break-word;
            overflow: hidden; /* 禁止内部滚动，由外部容器控制 */
            margin: 0;
            padding: 16px;
          }
        </style>
      </head>
      <body>
        <div class="markdown-content">
          ${renderedHtml}
        </div>
        
        <script>
          (function() {
            const sandboxId = '${sandboxId}';
            let resizeTimeout;
            
            // 发送高度消息给父窗口
            function sendHeight() {
              const height = document.body.scrollHeight + 32; // 加一些内边距
              window.parent.postMessage({
                type: 'sandbox-resize',
                id: sandboxId,
                height: height
              }, '*');
            }
            
            // 使用 ResizeObserver 监听内容变化
            if (window.ResizeObserver) {
              const resizeObserver = new ResizeObserver(() => {
                // 使用防抖避免频繁更新
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(sendHeight, 100);
              });
              
              // 观察 body 元素
              resizeObserver.observe(document.body);
              
              // 初始发送高度
              sendHeight();
            } else {
              // 降级方案：定时检查高度
              sendHeight();
              setInterval(sendHeight, 500);
            }
          })();
        </script>
      </body>
      </html>
    `;
  }, [renderedHtml, sandboxId]);

  // 处理来自 iframe 的消息
  const handleMessage = useCallback((event) => {
    // 验证消息类型和ID
    if (event.data && event.data.type === 'sandbox-resize' && event.data.id === sandboxId) {
      setHeight(event.data.height);
      setLoading(false);
      setError(null);
    }
  }, [sandboxId]);

  // 设置和清理消息监听
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  // 监听内容变化
  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [content]);

  // 如果没有内容，显示空状态
  if (!content) {
    return (
      <RendererContainer>
        <LoadingContainer>
          <Typography variant="body2" color="text.secondary">
            暂无内容
          </Typography>
        </LoadingContainer>
      </RendererContainer>
    );
  }

  // 如果有错误，显示错误状态
  if (error) {
    return (
      <RendererContainer>
        <ErrorContainer>
          <Typography variant="body2">
            {error}
          </Typography>
          {fallbackContent && (
            <Box sx={{ mt: 2 }}>
              {fallbackContent}
            </Box>
          )}
        </ErrorContainer>
      </RendererContainer>
    );
  }

  return (
    <RendererContainer>
      {loading && (
        <LoadingContainer>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            正在渲染内容...
          </Typography>
        </LoadingContainer>
      )}
      
      <StyledIframe
        ref={iframeRef}
        srcDoc={fullHtml}
        style={{
          height: loading ? 0 : height,
          display: loading ? 'none' : 'block',
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.3s ease, height 0.3s ease',
        }}
        title="Markdown 内容渲染"
      />
    </RendererContainer>
  );
};

export default MarkdownSandboxRenderer;