import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// 样式化的对话框
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 20, // 20px 圆角，符合主要容器规范
    maxWidth: '500px',
    width: '90%',
  },
}));

// 样式化的对话框标题
const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(3),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

// 样式化的对话框内容
const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
}));

// 样式化的对话框操作区
const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(3),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

// 样式化的信息容器
const InfoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const WindowsLimitPrompt = ({ open, onClose, onContinue }) => {
  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      aria-labelledby="windows-limit-dialog-title"
      aria-describedby="windows-limit-dialog-description"
    >
      <StyledDialogTitle id="windows-limit-dialog-title">
        <Typography variant="h6" component="h2">
          窗口数量提醒
        </Typography>
      </StyledDialogTitle>
      
      <StyledDialogContent id="windows-limit-dialog-description">
        <InfoContainer>
          <Alert 
            severity="warning" 
            sx={{ borderRadius: 12 }}
          >
            您已经打开了 20 个窗口，这可能会影响系统性能。
          </Alert>
          
          <Typography variant="body1">
            为了保持良好的使用体验，我们建议您：
          </Typography>
          
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              关闭不再需要的窗口
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              使用最小化功能暂时隐藏窗口
            </Typography>
            <Typography component="li" variant="body2">
              在同一窗口中查看相关内容
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            您仍然可以继续打开新窗口，但请注意系统资源使用情况。
          </Typography>
        </InfoContainer>
      </StyledDialogContent>
      
      <StyledDialogActions>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 16,
            px: 3,
          }}
        >
          取消
        </Button>
        <Button 
          onClick={onContinue}
          variant="contained"
          autoFocus
          sx={{
            borderRadius: 16,
            px: 3,
          }}
        >
          继续打开
        </Button>
      </StyledDialogActions>
    </StyledDialog>
  );
};

export default WindowsLimitPrompt;