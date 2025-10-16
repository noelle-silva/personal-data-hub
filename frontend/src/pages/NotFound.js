import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// 样式化的404容器
const NotFoundContainer = styled(Box)(({ theme }) => ({
  minHeight: '70vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}));

// 样式化的404卡片
const NotFoundCard = styled(Card)(({ theme }) => ({
  maxWidth: 500,
  borderRadius: 20,
  padding: theme.spacing(4),
  textAlign: 'center',
  boxShadow: theme.shadows[8],
}));

// 样式化的404图标
const NotFoundIcon = styled(SearchOffIcon)(({ theme }) => ({
  fontSize: 80,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(2),
}));

// 样式化的操作按钮容器
const ActionButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  justifyContent: 'center',
  marginTop: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'center',
  },
}));

const NotFound = () => {
  const navigate = useNavigate();

  // 处理返回上一页
  const handleGoBack = () => {
    window.history.back();
  };

  // 处理返回首页
  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Container maxWidth="md">
      <NotFoundContainer>
        <NotFoundCard>
          <CardContent>
            <NotFoundIcon />
            
            <Typography variant="h2" component="h1" gutterBottom>
              404
            </Typography>
            
            <Typography variant="h5" gutterBottom>
              页面未找到
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              抱歉，您访问的页面不存在。可能是页面已被移除、名称已更改或暂时不可用。
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              您可以尝试以下操作：
            </Typography>
            
            <ActionButtonsContainer>
              <Button
                variant="contained"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
                sx={{
                  borderRadius: 16,
                  px: 3,
                }}
              >
                返回首页
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleGoBack}
                sx={{
                  borderRadius: 16,
                  px: 3,
                }}
              >
                返回上页
              </Button>
            </ActionButtonsContainer>
          </CardContent>
        </NotFoundCard>
      </NotFoundContainer>
    </Container>
  );
};

export default NotFound;