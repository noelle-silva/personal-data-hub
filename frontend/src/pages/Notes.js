import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Fab,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';
import DocumentCardGrid from '../components/DocumentCardGrid';
import DocumentFormModal from '../components/DocumentFormModal';
import apiClient from '../services/apiClient';

// 样式化的页面标题
const PageTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  textAlign: 'center',
}));

// 样式化的操作栏
const ActionBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(2),
    alignItems: 'stretch',
  },
}));

const Notes = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // 处理打开创建模态框
  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
  };

  // 处理关闭创建模态框
  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
  };

  // 处理创建文档
  const handleCreateDocument = async (documentData) => {
    try {
      const response = await apiClient.post('/documents', documentData);

      const result = response.data;
      console.log('文档创建成功:', result);
      
      // 创建成功后关闭模态框
      setCreateModalOpen(false);
      
      // 触发文档创建事件，通知DocumentCardGrid刷新
      const event = new CustomEvent('documentCreated', { detail: result.data });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('创建文档失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '创建文档失败，请重试';
      alert(errorMessage);
    }
  };

  return (
    <Container maxWidth="xl">
      <PageTitle variant="h3" component="h1">
        我的学习笔记
      </PageTitle>
      
      {/* 操作栏 */}
      <ActionBar>
        <Box />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
          sx={{
            borderRadius: 16,
            px: 3,
            py: 1,
          }}
        >
          新建笔记
        </Button>
      </ActionBar>

      {/* 文档卡片网格 */}
      <DocumentCardGrid />

      {/* 创建笔记模态框 */}
      <DocumentFormModal
        open={createModalOpen}
        handleClose={handleCloseCreateModal}
        onSave={handleCreateDocument}
        mode="create"
      />

      {/* 浮动创建按钮（移动端友好） */}
      <Fab
        color="primary"
        aria-label="添加笔记"
        onClick={handleOpenCreateModal}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
          borderRadius: 16,
          zIndex: 1000,
        }}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
};

export default Notes;