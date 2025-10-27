import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';

/**
 * 生成图片HTML表达式
 * @param {Object} attachment - 附件对象
 * @returns {string} HTML表达式
 */
const generateImageExpression = (attachment) => {
  const attachmentId = attachment._id || attachment.id;
  const attachmentName = attachment.originalName || attachment.name || '图片';
  
  // HTML转义处理
  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
  
  const escapedName = escapeHtml(attachmentName);
  
  return `<img src="attach://${attachmentId}" alt="${escapedName}" title="${escapedName}" />`;
};

/**
 * 生成视频HTML表达式
 * @param {Object} attachment - 附件对象
 * @returns {string} HTML表达式
 */
const generateVideoExpression = (attachment) => {
  const attachmentId = attachment._id || attachment.id;
  const attachmentName = attachment.originalName || attachment.name || '视频';
  
  // HTML转义处理
  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
  
  const escapedName = escapeHtml(attachmentName);
  
  return `<video src="attach://${attachmentId}" title="${escapedName}" controls></video>`;
};

/**
 * 附件引用复制按钮组件
 * 提供统一的附件引用复制功能，支持图片和视频的HTML表达式复制
 */
const AttachmentCopyButton = ({ 
  attachment, 
  type, // 'image' | 'video'
  size = 'small', 
  sx = {},
  tooltip,
  onClick 
}) => {
  const [copyTooltip, setCopyTooltip] = useState(tooltip || '复制引用');

  // 根据附件类型生成表达式
  const generateExpression = () => {
    if (!attachment) return '';
    
    switch (type) {
      case 'image':
        return generateImageExpression(attachment);
      case 'video':
        return generateVideoExpression(attachment);
      default:
        // 默认返回 attach:// 格式
        const attachmentId = attachment._id || attachment.id;
        return `attach://${attachmentId}`;
    }
  };

  // 处理复制操作
  const handleCopyAction = async (e) => {
    e.stopPropagation();
    
    // 如果提供了自定义的 onClick 处理函数，优先使用
    if (onClick) {
      onClick(e);
      return;
    }
    
    const expression = generateExpression();
    
    if (!expression) {
      console.error('无法生成附件引用表达式');
      setCopyTooltip('复制失败');
      setTimeout(() => setCopyTooltip(tooltip || '复制引用'), 2000);
      return;
    }
    
    try {
      // 优先使用现代 clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(expression);
      } else {
        // 降级方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = expression;
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
      setTimeout(() => setCopyTooltip(tooltip || '复制引用'), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      setCopyTooltip('复制失败');
      setTimeout(() => setCopyTooltip(tooltip || '复制引用'), 2000);
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
        aria-label="复制引用"
      >
        <ContentCopyIcon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
};

export default AttachmentCopyButton;