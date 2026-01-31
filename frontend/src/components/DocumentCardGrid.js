import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DocumentCard from './DocumentCard';
import DocumentDetailModal from './legacy/DocumentDetailModal';
import {
  fetchDocuments,
  selectAllDocuments,
  selectDocumentsStatus,
  selectDocumentsError,
  selectSelectedDocument,
  selectIsModalOpen,
  openDocumentModal,
  closeDocumentModal,
} from '../store/documentsSlice';
import {
  openWindowAndFetch
} from '../store/windowsSlice';
import apiClient from '../services/apiClient';

 // 标题样式
 const PageTitle = styled(Typography)(({ theme }) => ({
   marginBottom: theme.spacing(4),
   fontWeight: 'bold',
   color: theme.palette.primary.main,
   textAlign: 'center',
 }));
 
 const CardsWrapper = styled(Box)(({ theme }) => ({
   display: 'grid',
   gap: theme.spacing(3),
   gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
   alignItems: 'stretch',
   width: '100%',
 }));

// 加载状态容器
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '400px',
  flexDirection: 'column',
  gap: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: 20,
  padding: theme.spacing(4),
}));

const DocumentCardGrid = () => {
  const dispatch = useDispatch();
  const documents = useSelector(selectAllDocuments);
  const status = useSelector(selectDocumentsStatus);
  const error = useSelector(selectDocumentsError);
  const selectedDocument = useSelector(selectSelectedDocument);
  const isModalOpen = useSelector(selectIsModalOpen);

  // 获取文档数据
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchDocuments());
    }
  }, [status, dispatch]);

  // 监听文档创建事件
  useEffect(() => {
    const handleDocumentCreated = () => {
      dispatch(fetchDocuments());
    };

    window.addEventListener('documentCreated', handleDocumentCreated);
    return () => {
      window.removeEventListener('documentCreated', handleDocumentCreated);
    };
  }, [dispatch]);

  // 处理查看详情
  const handleViewDetail = async (document) => {
    try {
      // 使用新的 openWindowAndFetch thunk，原子化创建窗口和获取文档
      await dispatch(openWindowAndFetch({
        docId: document._id,
        label: document.title || '加载中...',
        source: 'document-grid'
      })).unwrap();
    } catch (error) {
      console.error('获取文档详情失败:', error);
    }
  };

  // 处理关闭弹窗
  const handleCloseModal = () => {
    dispatch(closeDocumentModal());
  };

  // 处理保存编辑
  const handleSaveDocument = async (id, documentData) => {
    try {
      const response = await apiClient.put(`/documents/${id}`, documentData);
      const result = response.data;
      console.log('文档更新成功:', result);
      
      // 更新本地状态
      dispatch(fetchDocuments());
      
      // 更新选中的文档
      dispatch(openDocumentModal(result.data));
    } catch (error) {
      console.error('更新文档失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新文档失败，请重试';
      alert(errorMessage);
    }
  };

  // 处理保存引用关系
  const handleSaveReferences = async (id, referencedDocumentIds) => {
    try {
      const response = await apiClient.put(`/documents/${id}`, { referencedDocumentIds }, {
        params: {
          populate: 'full',
          include: 'referencingQuotes',
          quotesLimit: 20
        }
      });

      const result = response.data;
      console.log('引用关系更新成功:', result);
      
      // 更新选中的文档
      dispatch(openDocumentModal(result.data));
      
      return result.data;
    } catch (error) {
      console.error('更新引用关系失败:', error);
      alert('更新引用关系失败，请重试');
      throw error;
    }
  };

  // 处理删除文档
  const handleDeleteDocument = async (id) => {
    try {
      const response = await apiClient.delete(`/documents/${id}`);
      const result = response.data;
      console.log('文档删除成功:', result);
      
      // 刷新文档列表
      dispatch(fetchDocuments());
    } catch (error) {
      console.error('删除文档失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除文档失败，请重试';
      alert(errorMessage);
    }
  };

  // 渲染加载状态
  const renderLoading = () => (
    <LoadingContainer>
      <CircularProgress
        size={60}
        thickness={4}
        sx={{
          color: 'primary.main',
        }}
      />
      <Typography
        variant="h6"
        color="text.secondary"
        sx={{
          mt: 2,
        }}
      >
        正在加载学习笔记...
      </Typography>
    </LoadingContainer>
  );

  // 渲染错误状态
  const renderError = () => (
    <Container maxWidth="md">
      <Alert
        severity="error"
        sx={{
          mt: 4,
          borderRadius: 16,
          backgroundColor: 'errorContainer.main',
          color: 'errorContainer.contrastText',
        }}
      >
        <Typography variant="h6">加载失败</Typography>
        <Typography variant="body2">
          {error || '无法加载学习笔记，请稍后重试。'}
        </Typography>
      </Alert>
    </Container>
  );

  // 渲染空状态
  const renderEmpty = () => (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          textAlign: 'center',
          backgroundColor: 'surfaceVariant.main',
          borderRadius: 20,
          padding: (theme) => theme.spacing(4),
        }}
      >
        <Typography
          variant="h6"
          color="text.secondary"
          gutterBottom
          sx={{
            mb: 2,
          }}
        >
          暂无学习笔记
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            maxWidth: '80%',
          }}
        >
          还没有创建任何学习笔记，开始添加你的第一条笔记吧！
        </Typography>
      </Box>
    </Container>
  );

  // 渲染文档卡片
  const renderDocuments = () => {
    if (documents.length === 0) {
      return renderEmpty();
    }

    return (
      <CardsWrapper>
        {documents.map((document) => (
          <Box
            key={document._id}
            sx={{
              display: 'flex',
              width: '100%',
            }}
          >
            <DocumentCard document={document} onViewDetail={handleViewDetail} />
          </Box>
        ))}
      </CardsWrapper>
    );
  };

  // 根据状态渲染不同内容
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return renderLoading();
      case 'failed':
        return renderError();
      case 'succeeded':
      case 'idle':
      default:
        return renderDocuments();
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <PageTitle variant="h3" component="h1">
        我的学习笔记
      </PageTitle>
      {renderContent()}
      
      {/* 详情弹窗 */}
      <DocumentDetailModal
        open={isModalOpen}
        handleClose={handleCloseModal}
        document={selectedDocument}
        onSave={handleSaveDocument}
        onDelete={handleDeleteDocument}
        onSaveReferences={handleSaveReferences}
      />
    </Box>
  );
};

export default DocumentCardGrid;
