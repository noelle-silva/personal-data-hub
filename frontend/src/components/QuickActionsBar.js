import React, { useState } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  FormatQuote as QuoteIcon,
  AttachFile as AttachFileIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import QuoteFormModal from './QuoteFormModal';
import apiClient from '../services/apiClient';

// 快捷操作条容器 - 玻璃拟态风格
const QuickActionsContainer = styled(Box)(({ theme }) => ({
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

// 快捷操作按钮 - 玻璃拟态风格
const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 16,
  padding: theme.spacing(1.5, 2.5),
  margin: theme.spacing(0.5),
  background: 'rgba(255, 255, 255, 0.3)',
  backdropFilter: 'blur(5px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  color: theme.palette.text.primary,
  fontWeight: 500,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.2s ease-in-out',
  flexDirection: 'column',
  minWidth: 100,
  height: 90,
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.5)',
    transform: 'translateY(-3px)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
  },
}));

// 图标容器
const IconContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  display: 'flex',
  justifyContent: 'center',
}));

const QuickActionsBar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  // 处理打开收藏夹创建模态框
  const handleOpenQuoteModal = () => {
    setQuoteModalOpen(true);
  };

  // 处理关闭收藏夹创建模态框
  const handleCloseQuoteModal = () => {
    setQuoteModalOpen(false);
  };

  const actions = [
    {
      icon: <QuoteIcon />,
      label: '新建收藏夹',
      onClick: handleOpenQuoteModal,
      color: theme.palette?.warning?.main || '#ed6c02',
    },
    {
      icon: <AttachFileIcon />,
      label: '附件',
      onClick: () => navigate('/附件'),
      color: theme.palette?.info?.main || '#0288d1',
    },
    {
      icon: <SettingsIcon />,
      label: '设置',
      onClick: () => navigate('/设置'),
      color: theme.palette?.grey?.[600] || '#757575',
    },
  ];

  return (
    <QuickActionsContainer>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        快捷操作
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {actions.map((action, index) => (
          <ActionButton
            key={index}
            variant="contained"
            onClick={action.onClick}
            sx={{
              '& .MuiSvgIcon-root': {
                color: action.color,
                fontSize: 28,
              },
            }}
          >
            <IconContainer>
              {action.icon}
            </IconContainer>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              {action.label}
            </Typography>
          </ActionButton>
        ))}
      </Box>
      
      {/* 收藏夹创建模态框 */}
      <QuoteFormModal
        open={quoteModalOpen}
        handleClose={handleCloseQuoteModal}
        onSave={async (quoteData) => {
          try {
            const response = await apiClient.post('/quotes', quoteData);
            console.log('收藏夹创建成功:', response.data);
            // 创建成功后可以添加额外的处理逻辑，比如显示成功提示
            return response.data;
          } catch (error) {
            console.error('创建收藏夹失败:', error);
            const errorMessage = error.response?.data?.message || error.message || '创建收藏夹失败，请重试';
            alert(errorMessage);
            throw error;
          }
        }}
      />
    </QuickActionsContainer>
  );
};

export default QuickActionsBar;
