import React, { useRef, useEffect, useLayoutEffect, useState, useMemo, useCallback } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { generateTabActionFancyCssUnscoped, generateQuoteActionFancyCssUnscoped, generateAttachmentActionFancyCssUnscoped } from '../utils/tabActionStyles';
import { replaceWithSignedUrls, extractAttachmentIds } from '../services/attachmentUrlCache';

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
 * HTML 沙盒渲染组件
 * 使用 iframe 沙盒安全地渲染 HTML 内容
 */
const HtmlSandboxRenderer = ({
  content,
  fallbackContent = null,
  cacheKey = null,
  ttl
}) => {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [height, setHeight] = useState(200); // 初始高度
  const [messageReceived, setMessageReceived] = useState(false); // 跟踪是否收到消息
  const [processedContent, setProcessedContent] = useState(null); // 预处理后的内容
  const [processingContent, setProcessingContent] = useState(false); // 内容处理状态
  
  // 生成唯一的沙盒ID，用于消息通信
  const sandboxId = useMemo(() => {
    return `html-sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 预处理内容，替换 attach:// 引用
  const preprocessContent = useCallback(async (contentToProcess) => {
    if (!contentToProcess) return contentToProcess;
    
    // 检查是否包含 attach:// 引用
    const attachmentIds = extractAttachmentIds(contentToProcess);
    if (attachmentIds.length === 0) return contentToProcess;
    
    try {
      setProcessingContent(true);
      const processed = await replaceWithSignedUrls(contentToProcess, ttl);
      return processed;
    } catch (err) {
      console.error('[HtmlSandboxRenderer] 预理内容失败', err);
      // 失败时返回原内容
      return contentToProcess;
    } finally {
      setProcessingContent(false);
    }
  }, [ttl]);

  // 当内容变化时预处理
  useEffect(() => {
    let isMounted = true;
    
    const process = async () => {
      setLoading(true);
      setError(null);
      setMessageReceived(false);
      
      const processed = await preprocessContent(content);
      if (isMounted) {
        setProcessedContent(processed);
      }
    };
    
    process();
    
    return () => {
      isMounted = false;
    };
  }, [content, preprocessContent]);

  // 生成完整的 HTML 文档
  const fullHtml = useMemo(() => {
    if (!processedContent) return '';

    // 处理链接安全属性
    const safeContent = processedContent.replace(/<a\s+([^>]*?)>/gi, (match, attrs) => {
      // 检查是否已有 rel 属性
      if (!attrs.includes('rel=')) {
        // 检查是否是特殊协议（mailto, tel），这些不需要 noopener noreferrer
        const isSpecialProtocol = /href=["']?(mailto|tel):/i.test(attrs);
        if (!isSpecialProtocol) {
          attrs += ' rel="noopener noreferrer"';
        }
      }
      return `<a ${attrs}>`;
    });

    // 检测内容是否已定义 base 标签
    const hasExistingBase = /<base[^>]*>/i.test(content);
    
    // 生成 head 内容
    let headContent = `
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HTML 内容</title>`;
    
    // 根据需要添加 base 标签
    if (!hasExistingBase) {
      headContent += `
        <base target="_blank">`;
    }

    // 添加资源加载调试脚本（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      headContent += `
        <script>
          // 监听资源加载状态
          window.addEventListener('error', function(e) {
            if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
              console.error('HtmlSandboxRenderer: 资源加载失败', e.target.src || e.target.href, e.error);
            }
          }, true);
          
          // 监听模块加载失败
          window.addEventListener('unhandledrejection', function(e) {
            console.error('HtmlSandboxRenderer: 模块加载失败', e.reason);
          });
        </script>`;
    }

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        ${headContent}
        <style>
          /* 基础样式重置 */
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            line-height: 1.6;
            color: #333;
            word-wrap: break-word;
            overflow-wrap: break-word;
            overflow: hidden; /* 禁止内部滚动，由外部容器控制 */
          }
          
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
          
          /* 默认链接样式 */
          a {
            color: #1976d2;
            text-decoration: none;
          }
          
          a:hover {
            text-decoration: underline;
          }
          
          /* 图片响应式 */
          img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
          }
          
          /* 视频响应式 */
          video {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            background-color: #000;
          }
          
          /* 表格样式 */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          /* 代码块样式 */
          pre {
            background-color: #f5f5f5;
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
          }
          
          code {
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
          }
          
          pre code {
            background-color: transparent;
            padding: 0;
          }
          
          /* 项目特有动作按钮样式 */
          ${generateTabActionFancyCssUnscoped()}
          
          /* 引用体专用动作按钮样式 */
          ${generateQuoteActionFancyCssUnscoped()}
          
          /* 附件专用动作按钮样式 */
          ${generateAttachmentActionFancyCssUnscoped()}
        </style>
      </head>
      <body>
        <div class="html-content">
          ${safeContent}
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
              
              // 添加心跳重发机制，防止父页面错过首次消息
              setTimeout(sendHeight, 50);
              setTimeout(sendHeight, 150);
              setTimeout(sendHeight, 300);
            } else {
              // 降级方案：定时检查高度
              sendHeight();
              setInterval(sendHeight, 500);
            }
            
            // 监听图片加载完成
            const images = document.querySelectorAll('img');
            if (images.length > 0) {
              let loadedCount = 0;
              images.forEach(img => {
                if (img.complete) {
                  loadedCount++;
                } else {
                  img.addEventListener('load', () => {
                    loadedCount++;
                    if (loadedCount === images.length) {
                      sendHeight();
                    }
                  });
                }
              });
            }
            
            // 监听动态内容变化
            const observer = new MutationObserver(() => {
              clearTimeout(resizeTimeout);
              resizeTimeout = setTimeout(sendHeight, 200);
              // 处理新添加的 x-tab-action 元素
              processTabActions();
            });
            
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
              characterData: true
            });
            
            // 处理 x-tab-action 元素
            function processTabActions() {
              const tabActions = document.querySelectorAll('x-tab-action');
              tabActions.forEach(element => {
                // 跳过已处理的元素
                if (element.hasAttribute('data-processed')) return;
                
                const action = element.getAttribute('data-action');
                const docId = element.getAttribute('data-doc-id');
                const quoteId = element.getAttribute('data-quote-id');
                const attachmentId = element.getAttribute('data-attachment-id');
                const variant = element.getAttribute('data-variant') || 'primary';
                // 优先使用 data-label，然后是元素内容，最后回退到默认文本
                const text = element.getAttribute('data-label')?.trim() ||
                           element.textContent?.trim() ||
                           element.innerHTML?.trim() ||
                           '查看详情';
                
                // 处理 open-document 动作
                if (action === 'open-document' && docId) {
                  // 创建按钮元素
                  const button = document.createElement('button');
                  button.className = 'tab-action-button';
                  button.setAttribute('data-variant', variant);
                  button.textContent = text;
                  button.setAttribute('title', '打开笔记: ' + docId);
                  
                  // 添加点击事件
                  button.addEventListener('click', () => {
                    // 发送消息到父窗口和顶层窗口，增强鲁棒性
                    const messageData = {
                      type: 'tab-action',
                      id: sandboxId,
                      action: action,
                      docId: docId,
                      label: text,
                      variant: variant,
                      source: 'html-sandbox'
                    };
                    
                    // 同时向 parent 和 top 发送，确保在嵌套场景下也能收到消息
                    window.parent.postMessage(messageData, '*');
                    if (window.top !== window.parent) {
                      window.top.postMessage(messageData, '*');
                    }
                  });
                  
                  // 替换原始元素
                  element.parentNode.replaceChild(button, element);
                  button.setAttribute('data-processed', 'true');
                }
                
                // 处理 open-quote 动作
                if (action === 'open-quote' && quoteId) {
                  // 创建按钮元素，使用引用体专用样式
                  const button = document.createElement('button');
                  button.className = 'quote-action-button';
                  button.setAttribute('data-variant', variant);
                  button.textContent = text;
                  button.setAttribute('title', '打开引用体: ' + quoteId);
                  
                  // 添加点击事件
                  button.addEventListener('click', () => {
                    // 发送消息到父窗口和顶层窗口，增强鲁棒性
                    const messageData = {
                      type: 'tab-action',
                      id: sandboxId,
                      action: action,
                      quoteId: quoteId,
                      label: text,
                      variant: variant,
                      source: 'html-sandbox'
                    };
                    
                    // 同时向 parent 和 top 发送，确保在嵌套场景下也能收到消息
                    window.parent.postMessage(messageData, '*');
                    if (window.top !== window.parent) {
                      window.top.postMessage(messageData, '*');
                    }
                  });
                  
                  // 替换原始元素
                  element.parentNode.replaceChild(button, element);
                  button.setAttribute('data-processed', 'true');
                }
                
                // 处理 open-attachment 动作
                if (action === 'open-attachment' && attachmentId) {
                  // 创建按钮元素，使用附件专用样式
                  const button = document.createElement('button');
                  button.className = 'attachment-action-button';
                  button.setAttribute('data-variant', variant);
                  button.textContent = text;
                  button.setAttribute('title', '打开附件: ' + attachmentId);
                  
                  // 添加点击事件
                  button.addEventListener('click', () => {
                    // 发送消息到父窗口和顶层窗口，增强鲁棒性
                    const messageData = {
                      type: 'tab-action',
                      id: sandboxId,
                      action: action,
                      attachmentId: attachmentId,
                      label: text,
                      variant: variant,
                      source: 'html-sandbox'
                    };
                    
                    // 同时向 parent 和 top 发送，确保在嵌套场景下也能收到消息
                    window.parent.postMessage(messageData, '*');
                    if (window.top !== window.parent) {
                      window.top.postMessage(messageData, '*');
                    }
                  });
                  
                  // 替换原始元素
                  element.parentNode.replaceChild(button, element);
                  button.setAttribute('data-processed', 'true');
                }
                
                // 对于其他不支持的 action，标记为已处理以避免重复处理
                if (!element.hasAttribute('data-processed')) {
                  element.setAttribute('data-processed', 'true');
                }
              });
            }
            
            // 初始处理
            processTabActions();
          })();
        </script>
      </body>
      </html>
    `;
  }, [processedContent, sandboxId]);

  // 处理来自 iframe 的消息
  const handleMessage = useCallback((event) => {
    // 验证消息类型和ID
    if (event.data && event.data.type === 'sandbox-resize' && event.data.id === sandboxId) {
      setHeight(event.data.height);
      setLoading(false);
      setError(null);
      setMessageReceived(true);
    }
    
    // 处理来自 HTML 内容的 tab-action 事件（仅开发环境调试）
    if (event.data && event.data.type === 'tab-action' && event.data.id === sandboxId) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('HtmlSandboxRenderer: 收到 tab-action 事件', event.data);
      }
      // 注意：这里只是调试输出，实际功能将在后续步骤中实现
    }
  }, [sandboxId]);

  // iframe 加载完成时的兜底处理
  const handleIframeLoad = useCallback(() => {
    // 如果已经收到消息，不需要处理
    if (messageReceived) return;
    
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument) {
        const doc = iframe.contentDocument;
        const bodyHeight = doc.body ? doc.body.scrollHeight : 200;
        const totalHeight = bodyHeight + 32; // 加一些内边距
        
        setHeight(totalHeight);
        setLoading(false);
        setError(null);
        
        // 开发环境下输出调试信息
        if (process.env.NODE_ENV === 'development') {
          console.debug('HtmlSandboxRenderer: 使用 onLoad 兜底设置高度', totalHeight);
        }
      }
    } catch (err) {
      // 如果访问失败，设置默认高度并结束加载
      setHeight(200);
      setLoading(false);
      setError(null);
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('HtmlSandboxRenderer: onLoad 兜底处理失败，使用默认高度', err);
      }
    }
  }, [messageReceived]);

  // 设置和清理消息监听（使用 useLayoutEffect 确保在浏览器绘制前注册）
  useLayoutEffect(() => {
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  // 监听内容变化
  useEffect(() => {
    setLoading(true);
    setError(null);
    setMessageReceived(false); // 重置消息接收状态
  }, [content]);

  // 如果没有内容，显示空状态
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
      {(loading || processingContent) && (
        <LoadingContainer>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {processingContent ? '正在处理附件引用...' : '正在渲染HTML内容...'}
          </Typography>
        </LoadingContainer>
      )}
      
      <StyledIframe
        ref={iframeRef}
        srcDoc={fullHtml}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        onLoad={handleIframeLoad}
        style={{
          height: loading ? 0 : height,
          display: loading ? 'none' : 'block',
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.3s ease, height 0.3s ease',
        }}
        title="HTML 内容渲染"
      />
    </RendererContainer>
  );
};

export default HtmlSandboxRenderer;
