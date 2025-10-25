import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

/**
 * 主题预览条组件
 * 显示当前主题的主要颜色，用于直观确认变体差异
 */
const ThemePreviewBar = () => {
  const theme = useTheme();
  
  const colorSwatches = [
    { name: '主色', color: theme.palette.primary.main, contrastText: theme.palette.primary.contrastText },
    { name: '辅色', color: theme.palette.secondary.main, contrastText: theme.palette.secondary.contrastText },
    { name: '第三色', color: theme.palette.tertiary.main, contrastText: theme.palette.tertiary.contrastText },
    { name: '背景', color: theme.palette.background.default, contrastText: theme.palette.text.primary },
    { name: '表面', color: theme.palette.surface.main, contrastText: theme.palette.surface.contrastText },
    { name: '主容器', color: theme.palette.primaryContainer.main, contrastText: theme.palette.primaryContainer.contrastText },
    { name: '辅容器', color: theme.palette.secondaryContainer.main, contrastText: theme.palette.secondaryContainer.contrastText },
    { name: '第三容器', color: theme.palette.tertiaryContainer.main, contrastText: theme.palette.tertiaryContainer.contrastText },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
        主题颜色预览
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        切换主题变体时，以下颜色会随之变化
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1,
        p: 2,
        backgroundColor: theme.palette.background.default,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
      }}>
        {colorSwatches.map((swatch, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 80,
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 40,
                backgroundColor: swatch.color,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 0.5,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                  pointerEvents: 'none',
                },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: swatch.contrastText,
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textShadow: `0 1px 2px ${swatch.color}`,
                  zIndex: 1,
                }}
              >
                {swatch.name}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '9px',
                color: theme.palette.text.secondary,
                textAlign: 'center',
                maxWidth: 60,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {swatch.color}
            </Typography>
          </Box>
        ))}
      </Box>
      
      <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.surface.main, borderRadius: 1 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>当前主题信息：</strong>
        </Typography>
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
          <div>模式: {theme.palette.mode === 'dark' ? '深色' : '浅色'}</div>
          <div>主色: {theme.palette.primary.main}</div>
          <div>背景: {theme.palette.background.default}</div>
          <div>表面: {theme.palette.surface.main}</div>
        </Typography>
      </Box>
    </Box>
  );
};

export default ThemePreviewBar;