import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import parse from 'html-react-parser';
import { renderMarkdownToHtml, generateBaseStylesScoped, generateHighlightStylesScoped, generateKatexStylesScoped } from '../utils/markdownRenderer';
import { generateTabActionFancyCssScoped, generateQuoteActionFancyCssScoped, generateAttachmentActionFancyCssScoped } from '../utils/tabActionStyles';
import { generateAIChatEnhancedStylesScoped } from '../utils/aiChatEnhancedStyles';
import { preprocessAIMessageContent } from '../utils/aiChatPreprocessor';
import AttachmentImage from './AttachmentImage';
import AttachmentVideo from './AttachmentVideo';

// 样式化的容器
const RendererContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  position: 'relative',
  minHeight: 100,
  minWidth: 0, // 允许 Flex 收缩
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

/**
 * 收敛文档级标签，提取可安全内联的 HTML 片段
 * @param {string} html - 可能包含完整 HTML 文档的 HTML 字符串
 * @returns {string} 可安全内联的 HTML 片段
 */
const sanitizeDocLevelHtml = (html) => {
  if (!html) return '';
  
  // 检测是否包含文档级标签
  const hasDocLevelTags = /<!DOCTYPE|<html|<head|<body/i.test(html);
  
  if (!hasDocLevelTags) {
    return html; // 没有文档级标签，直接返回
  }
  
  try {
    // 创建临时 DOM 元素来解析 HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 尝试提取 body 内容
    const bodyElement = tempDiv.querySelector('body');
    if (bodyElement) {
      return bodyElement.innerHTML;
    }
    
    // 如果没有 body，返回所有非文档级标签的内容
    // 移除 head、title、meta、link、script 等文档级标签
    const docLevelSelectors = [
      'head', 'title', 'meta', 'link', 'base', 'style', 'script'
    ];
    
    docLevelSelectors.forEach(selector => {
      const elements = tempDiv.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    return tempDiv.innerHTML;
  } catch (error) {
    console.warn('HTML 结构收敛失败，返回原始内容:', error);
    return html;
  }
};

/**
 * Markdown 内联渲染组件
 * 使用 html-react-parser 将 Markdown 渲染为 React 元素，不使用 iframe
 */
const MarkdownInlineRenderer = ({
  content,
  fallbackContent = null,
  cacheKey = null,
  scopeClass = 'markdown-body',
  enableAIChatEnhancements = false
}) => {
  // 预处理AI聊天内容（如果启用增强功能）
  const preprocessedContent = useMemo(() => {
    if (!content) return '';
    if (enableAIChatEnhancements) {
      return preprocessAIMessageContent(content);
    }
    return content;
  }, [content, enableAIChatEnhancements]);

  // 渲染 Markdown 为 HTML
  const renderedHtml = useMemo(() => {
    try {
      if (!preprocessedContent) return '';
      return renderMarkdownToHtml(preprocessedContent, cacheKey);
    } catch (err) {
      console.error('Markdown 渲染错误:', err);
      return '';
    }
  }, [preprocessedContent, cacheKey]);

  // 生成作用域样式
  const scopedStyles = useMemo(() => {
    if (!renderedHtml) return '';
    
    const baseStyles = generateBaseStylesScoped(scopeClass);
    const highlightStyles = generateHighlightStylesScoped(scopeClass);
    const katexStyles = generateKatexStylesScoped(scopeClass);
    const tabActionStyles = generateTabActionFancyCssScoped(scopeClass);
    const quoteActionStyles = generateQuoteActionFancyCssScoped(scopeClass);
    const attachmentActionStyles = generateAttachmentActionFancyCssScoped(scopeClass);
    
    let styles = `${baseStyles}\n${highlightStyles}\n${katexStyles}\n${tabActionStyles}\n${quoteActionStyles}\n${attachmentActionStyles}`;
    
    // 如果启用AI聊天增强功能，添加增强样式
    if (enableAIChatEnhancements) {
      const enhancedStyles = generateAIChatEnhancedStylesScoped(scopeClass);
      styles += `\n${enhancedStyles}`;
    }
    
    return styles;
  }, [renderedHtml, scopeClass, enableAIChatEnhancements]);

  // 处理特殊元素的替换函数
  const replaceElements = (node) => {
    // 处理 x-tab-action 元素
    if (node.name === 'x-tab-action') {
      const docId = node.attribs && node.attribs['data-doc-id'];
      const quoteId = node.attribs && node.attribs['data-quote-id'];
      const attachmentId = node.attribs && node.attribs['data-attachment-id'];
      const action = node.attribs && node.attribs['data-action'];
      const label = node.attribs && node.attribs['data-label'];
      const variant = node.attribs && node.attribs['data-variant'] || 'primary';
      
      // 处理 open-document 动作
      if (action === 'open-document' && docId) {
        const buttonText = label || node.children && node.children[0] && node.children[0].data || '查看详情';
        
        // 创建一个原生按钮元素，使用共享的炫酷样式
        return (
          <button
            className="tab-action-button"
            data-variant={variant}
            title={`打开笔记: ${docId}`}
            onClick={() => {
              // 发送消息到父窗口
              window.postMessage({
                type: 'tab-action',
                action: 'open-document',
                docId: docId,
                label: buttonText,
                variant: variant,
                source: 'md-inline'
              }, '*');
            }}
          >
            {buttonText}
          </button>
        );
      }
      
      // 处理 open-quote 动作
      if (action === 'open-quote' && quoteId) {
        const buttonText = label || node.children && node.children[0] && node.children[0].data || '查看引用体';
        
        // 创建一个原生按钮元素，使用引用体专用的炫酷样式
        return (
          <button
            className="quote-action-button"
            data-variant={variant}
            title={`打开引用体: ${quoteId}`}
            onClick={() => {
              // 发送消息到父窗口
              window.postMessage({
                type: 'tab-action',
                action: 'open-quote',
                quoteId: quoteId,
                label: buttonText,
                variant: variant,
                source: 'md-inline'
              }, '*');
            }}
          >
            {buttonText}
          </button>
        );
      }
      
      // 处理 open-attachment 动作
      if (action === 'open-attachment' && attachmentId) {
        const buttonText = label || node.children && node.children[0] && node.children[0].data || '查看附件';
        
        // 创建一个原生按钮元素，使用附件专用的炫酷样式
        return (
          <button
            className="attachment-action-button"
            data-variant={variant}
            title={`打开附件: ${attachmentId}`}
            onClick={() => {
              // 发送消息到父窗口
              window.postMessage({
                type: 'tab-action',
                action: 'open-attachment',
                attachmentId: attachmentId,
                label: buttonText,
                variant: variant,
                source: 'md-inline'
              }, '*');
            }}
          >
            {buttonText}
          </button>
        );
      }
    }
    
    // 处理 attach:// 图片引用
    if (node.name === 'img' && node.attribs && node.attribs.src && node.attribs.src.startsWith('attach://')) {
      const attachmentId = node.attribs.src.replace('attach://', '');
      const alt = node.attribs.alt || '';
      const title = node.attribs.title || '';
      const style = node.attribs.style || '';
      
      return (
        <AttachmentImage
          id={attachmentId}
          alt={alt}
          title={title}
          style={style ? { cssText: style } : undefined}
          placeholderWidth={200}
          placeholderHeight={150}
        />
      );
    }
    
    // 处理 attach:// 视频引用
    if (node.name === 'video' && node.attribs && node.attribs.src && node.attribs.src.startsWith('attach://')) {
      const attachmentId = node.attribs.src.replace('attach://', '');
      const title = node.attribs.title || '';
      const style = node.attribs.style || '';
      const controls = node.attribs.controls !== undefined;
      const autoplay = node.attribs.autoplay !== undefined;
      const muted = node.attribs.muted !== undefined;
      const loop = node.attribs.loop !== undefined;
      const poster = node.attribs.poster || '';
      
      return (
        <AttachmentVideo
          id={attachmentId}
          title={title}
          style={style ? { cssText: style } : undefined}
          controls={controls}
          autoplay={autoplay}
          muted={muted}
          loop={loop}
          poster={poster}
          placeholderWidth={300}
          placeholderHeight={200}
        />
      );
    }
    
    return undefined;
  };

  // 安全过滤函数，移除潜在的不安全元素和属性
  const sanitizeElement = (node) => {
    // 移除script标签
    if (node.name === 'script') {
      return null;
    }
    
    // 移除所有on*事件属性
    if (node.attribs) {
      const newAttribs = { ...node.attribs };
      Object.keys(newAttribs).forEach(key => {
        if (key.toLowerCase().startsWith('on')) {
          delete newAttribs[key];
        }
      });
      node.attribs = newAttribs;
    }
    
    return undefined; // 继续处理其他替换逻辑
  };

  // 处理工具结果折叠/展开功能
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current || !enableAIChatEnhancements) return;
    
    // 添加点击事件监听器处理工具结果的折叠/展开
    const handleResultToggle = (event) => {
      // 优先处理新的统一气泡头部
      const aiHeader = event.target.closest('.ai-bubble-header');
      if (aiHeader) {
        const aiBubble = aiHeader.closest('.ai-bubble.collapsible');
        if (aiBubble) {
          aiBubble.classList.toggle('expanded');
          return; // 处理了新气泡就不再处理旧气泡
        }
      }
      
      // 保留原有工具结果事件处理以确保兼容性
      const header = event.target.closest('.vcp-tool-result-header');
      if (header) {
        const bubble = header.closest('.vcp-tool-result-bubble.collapsible');
        if (bubble) {
          bubble.classList.toggle('expanded');
        }
      }
    };
    
    const container = containerRef.current;
    container.addEventListener('click', handleResultToggle);
    
    return () => {
      container.removeEventListener('click', handleResultToggle);
    };
  }, [enableAIChatEnhancements]);

  // 处理代码块复制功能
  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleCodeCopy = async (event) => {
      const copyButton = event.target.closest('.code-copy-button');
      if (!copyButton) return;
      
      event.preventDefault();
      event.stopPropagation();
      
      try {
        // 获取要复制的代码
        const codeText = decodeURIComponent(copyButton.getAttribute('data-code') || '');
        
        // 使用现代 clipboard API
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(codeText);
        } else {
          // 降级方案：使用 document.execCommand
          const textArea = document.createElement('textarea');
          textArea.value = codeText;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        
        // 显示复制成功状态
        const originalHTML = copyButton.innerHTML;
        copyButton.classList.add('copied');
        copyButton.innerHTML = `
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          </svg>
          <span>已复制</span>
        `;
        
        // 2秒后恢复原始状态
        setTimeout(() => {
          copyButton.classList.remove('copied');
          copyButton.innerHTML = originalHTML;
        }, 2000);
        
      } catch (error) {
        console.error('复制代码失败:', error);
        // 可以在这里添加错误提示
      }
    };
    
    const container = containerRef.current;
    container.addEventListener('click', handleCodeCopy);
    
    return () => {
      container.removeEventListener('click', handleCodeCopy);
    };
  }, []);

  // 收敛文档级标签并解析 HTML 为 React 元素
  const parsedContent = useMemo(() => {
    if (!renderedHtml) return null;
    
    try {
      // 收敛文档级标签
      const sanitizedHtml = sanitizeDocLevelHtml(renderedHtml);
      
      // 组合替换函数：先执行安全过滤，再执行其他替换逻辑
      const combinedReplace = (node) => {
        // 先执行安全过滤
        const sanitizeResult = sanitizeElement(node);
        if (sanitizeResult === null) {
          return null; // 完全移除元素
        }
        
        // 然后执行其他替换逻辑
        return replaceElements(node);
      };
      
      return parse(sanitizedHtml, { replace: combinedReplace });
    } catch (err) {
      console.error('HTML 解析错误:', err);
      return null;
    }
  }, [renderedHtml]);

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

  // 如果渲染出错，显示错误状态
  if (!parsedContent) {
    return (
      <RendererContainer>
        <ErrorContainer>
          <Typography variant="body2">
            渲染失败，请检查内容格式
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
    <RendererContainer ref={containerRef}>
      {/* 注入作用域样式 */}
      <style>{scopedStyles}</style>
      
      {/* 渲染内容 */}
      <div className={scopeClass}>
        {parsedContent}
      </div>
    </RendererContainer>
  );
};

export default MarkdownInlineRenderer;