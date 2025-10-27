import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';

// 预览容器
const PreviewContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0, // 确保容器可以正确收缩
  minWidth: 0, // 允许flex子项收缩
}));

// 预览头部
const PreviewHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.border}`,
  marginBottom: theme.spacing(1),
}));

// 预览内容区域
const PreviewContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  border: `1px solid ${theme.palette.border}`,
  borderRadius: 12,
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  minWidth: 0, // 允许flex子项收缩
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 4,
  },
}));

/**
 * Markdown预览组件
 * 通用的Markdown内容预览显示组件
 * @param {Object} props
 * @param {string} props.content - 要预览的内容
 * @param {string} props.cacheKey - 缓存键，用于优化渲染性能
 */
const MarkdownPreview = ({ content, cacheKey }) => {
  return (
    <PreviewContainer>
      <PreviewHeader>
        <Typography variant="h6" component="h2">
          预览
        </Typography>
      </PreviewHeader>
      <PreviewContent>
        <MarkdownInlineRenderer 
          content={content} 
          cacheKey={cacheKey}
          scopeClass="quote-markdown-preview"
        />
      </PreviewContent>
    </PreviewContainer>
  );
};

export default MarkdownPreview;