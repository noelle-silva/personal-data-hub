import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';

/**
 * 收藏夹复制按钮组件
 * 提供统一的收藏夹复制功能，可在多个组件中复用
 */
const QuoteCopyButton = ({ 
  quote, 
  size = 'small', 
  sx = {},
  tooltip = '复制标记',
  onClick 
}) => {
  const [copyTooltip, setCopyTooltip] = useState(tooltip);

  // HTML 转义函数
  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // 处理复制标记
  const handleCopyAction = async (e) => {
    e.stopPropagation();
    
    // 如果提供了自定义的 onClick 处理函数，优先使用
    if (onClick) {
      onClick(e);
      return;
    }
    
    const quoteId = quote._id || quote;
    const quoteTitle = quote.title || '查看详情';
    const escapedTitle = escapeHtml(quoteTitle);
    
    // 生成包含 data-label 和收藏夹标题的标记
    const actionMarkup = `<x-tab-action data-action="open-quote" data-quote-id="${quoteId}" data-label="${escapedTitle}">${escapedTitle}</x-tab-action>`;
    
    try {
      // 优先使用现代 clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(actionMarkup);
      } else {
        // 降级方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = actionMarkup;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      // 显示成功反馈
      setCopyTooltip('已复制');
      setTimeout(() => setCopyTooltip(tooltip), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      setCopyTooltip('复制失败');
      setTimeout(() => setCopyTooltip(tooltip), 2000);
    }
  };

  return (
    <Tooltip title={copyTooltip}>
      <IconButton
        size={size}
        onClick={handleCopyAction}
        sx={{
          borderRadius: 16,
          mr: 0.5,
          ...sx
        }}
        aria-label="复制标记"
      >
        <ContentCopyIcon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
};

export default QuoteCopyButton;