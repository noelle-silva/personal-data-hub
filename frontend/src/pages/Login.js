/**
 * 登录页面
 * 提供用户登录功能
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  useTheme,
  alpha
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, clearError, selectAuthLoading, selectAuthError, selectIsAuthenticated } from '../store/authSlice';

// 样式化容器
const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
}));

// 样式化登录卡片
const LoginCard = styled(Card)(({ theme }) => ({
  maxWidth: 400,
  width: '100%',
  padding: theme.spacing(4),
  boxShadow: theme.shadows[8],
  borderRadius: theme.spacing(2),
}));

// 样式化标题
const LoginTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(3),
  textAlign: 'center',
  color: theme.palette.primary.main,
}));

// 样式化表单
const LoginForm = styled('form')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

// 样式化登录按钮
const LoginButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5),
  fontWeight: 600,
  marginTop: theme.spacing(2),
}));

/**
 * 登录页面组件
 */
const LoginPage = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redux 状态
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  // 本地状态
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // 如果已经登录，重定向到目标页面或首页
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // 清除错误信息
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除错误信息
    if (error) {
      dispatch(clearError());
    }
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      return;
    }
    
    try {
      await dispatch(login({
        username: formData.username.trim(),
        password: formData.password.trim()
      })).unwrap();
    } catch (error) {
      // 错误已经在 Redux 中处理
      console.error('登录失败:', error);
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <StyledContainer maxWidth="sm">
      <LoginCard>
        <CardContent>
          <LoginTitle variant="h4" component="h1">
            系统登录
          </LoginTitle>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <LoginForm onSubmit={handleSubmit}>
            <TextField
              label="用户名"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              variant="outlined"
              fullWidth
              disabled={isLoading}
              autoFocus
            />
            
            <TextField
              label="密码"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              variant="outlined"
              fullWidth
              disabled={isLoading}
            />
            
            <LoginButton
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={isLoading || !formData.username.trim() || !formData.password.trim()}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? '登录中...' : '登录'}
            </LoginButton>
          </LoginForm>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              请输入管理员账号和密码进行登录
            </Typography>
          </Box>
        </CardContent>
      </LoginCard>
    </StyledContainer>
  );
};

export default LoginPage;