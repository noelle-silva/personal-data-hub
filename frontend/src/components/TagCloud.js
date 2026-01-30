import React from 'react';
import { Box, Chip, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// 标签云容器 - 玻璃拟态风格
const TagCloudContainer = styled(Box)(({ theme }) => ({
  borderRadius: 20,
  padding: theme.spacing(3),
  marginBottom: theme.spacing(4),
  background: 'rgba(255, 255, 255, 0.25)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 40px rgba(31, 38, 135, 0.2)',
  },
}));

// 标签芯片 - 玻璃拟态风格
const TagChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'size' && prop !== 'color',
})(({ theme, size, color }) => ({
  margin: theme.spacing(0.5),
  background: 'rgba(255, 255, 255, 0.3)',
  backdropFilter: 'blur(5px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  color: theme.palette.text.primary,
  fontWeight: 500,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    background: color || 'rgba(255, 255, 255, 0.5)',
    transform: 'translateY(-2px) scale(1.05)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
  },
  ...(size === 'small' && {
    height: 28,
    fontSize: '0.75rem',
  }),
  ...(size === 'medium' && {
    height: 32,
    fontSize: '0.875rem',
  }),
  ...(size === 'large' && {
    height: 36,
    fontSize: '1rem',
    fontWeight: 600,
  }),
}));

const TagCloud = ({ tags = [], onTagClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  // 如果没有提供标签，使用默认标签
  const defaultTags = [
    { name: '学习', count: 15, color: theme.palette?.primary?.main || '#1976d2' },
    { name: '工作', count: 12, color: theme.palette?.success?.main || '#2e7d32' },
    { name: '技术', count: 8, color: theme.palette?.info?.main || '#0288d1' },
    { name: '生活', count: 6, color: theme.palette?.warning?.main || '#ed6c02' },
    { name: '阅读', count: 10, color: theme.palette?.secondary?.main || '#9c27b0' },
    { name: '项目', count: 7, color: theme.palette?.error?.main || '#d32f2f' },
    { name: '笔记', count: 9, color: '#7b1fa2' },
    { name: '灵感', count: 4, color: '#00897b' },
    { name: '总结', count: 5, color: '#3949ab' },
    { name: '计划', count: 3, color: '#c2185b' },
  ];

  const displayTags = tags.length > 0 ? tags : defaultTags;

  // 根据标签数量确定大小
  const getTagSize = (count) => {
    if (count >= 10) return 'large';
    if (count >= 5) return 'medium';
    return 'small';
  };

  // 处理标签点击
  const handleTagClick = (tag) => {
    if (onTagClick) {
      onTagClick(tag);
    } else {
      // 默认行为：导航到标签过滤页面
      navigate(`/标签/${encodeURIComponent(tag.name)}`);
    }
  };

  // 生成随机颜色（如果没有提供）
  const generateRandomColor = () => {
    const colors = [
      theme.palette?.primary?.main || '#1976d2',
      theme.palette?.success?.main || '#2e7d32',
      theme.palette?.info?.main || '#0288d1',
      theme.palette?.warning?.main || '#ed6c02',
      theme.palette?.secondary?.main || '#9c27b0',
      theme.palette?.error?.main || '#d32f2f',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <TagCloudContainer>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        热门标签
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {displayTags.map((tag, index) => (
          <TagChip
            key={index}
            label={`${tag.name} (${tag.count})`}
            size={getTagSize(tag.count)}
            color={tag.color || generateRandomColor()}
            variant="outlined"
            clickable
            onClick={() => handleTagClick(tag)}
          />
        ))}
      </Box>
      {tags.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          显示默认标签，实际使用时将显示您的文档标签
        </Typography>
      )}
    </TagCloudContainer>
  );
};

export default TagCloud;
