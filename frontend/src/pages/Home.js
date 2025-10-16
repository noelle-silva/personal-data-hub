import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Fab,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import apiClient from '../services/apiClient';
import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Note as NoteIcon,
  Tag as TagIcon,
  ArrowForward as ArrowForwardIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import DocumentFormModal from '../components/DocumentFormModal';
import DocumentDetailModal from '../components/DocumentDetailModal';
import {
  fetchDocuments,
  fetchDocumentById,
  selectAllDocuments,
  selectDocumentsStatus,
  selectSelectedDocument,
  selectIsModalOpen,
  openDocumentModal,
  closeDocumentModal,
} from '../store/documentsSlice';

// 样式化的欢迎卡片
const WelcomeCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: 20,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: theme.palette.primary.contrastText,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  padding: theme.spacing(4),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.1)',
    transform: 'skewY(-5deg) translateY(-20px)',
  },
}));

// 样式化的统计卡片
const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: 20,
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

// 样式化的统计图标容器
const StatIconContainer = styled(Avatar)(({ theme, color }) => ({
  backgroundColor: color,
  width: 56,
  height: 56,
  marginBottom: theme.spacing(2),
}));

// 样式化的最近更新列表
const RecentUpdatesCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: 20,
  display: 'flex',
  flexDirection: 'column',
}));

// 样式化的空状态容器
const EmptyStateContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200,
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const documents = useSelector(selectAllDocuments);
  const status = useSelector(selectDocumentsStatus);
  const selectedDocument = useSelector(selectSelectedDocument);
  const isModalOpen = useSelector(selectIsModalOpen);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // 获取文档数据
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchDocuments());
    }
  }, [status, dispatch]);

  // 计算统计数据
  const getStatistics = () => {
    if (!documents.length) return { total: 0, recentCount: 0, tagCount: 0 };
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = documents.filter(doc => new Date(doc.updatedAt) > oneWeekAgo).length;
    
    const allTags = documents.reduce((tags, doc) => {
      return tags.concat(doc.tags || []);
    }, []);
    const uniqueTags = [...new Set(allTags)];
    
    return {
      total: documents.length,
      recentCount,
      tagCount: uniqueTags.length,
    };
  };

  // 获取最近更新的文档
  const getRecentDocuments = () => {
    return [...documents]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '昨天';
    if (diffDays <= 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  // 处理打开创建模态框
  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
  };

  // 处理关闭创建模态框
  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
  };

  // 处理打开文档详情模态框
  const handleOpenDocumentModal = async (document) => {
    try {
      // 先显示一个加载中的弹窗，提供即时反馈
      dispatch(openDocumentModal({
        _id: document._id,
        title: document.title,
        content: '加载中...',
        tags: document.tags || [],
        source: document.source || ''
      }));
      
      // 然后获取完整数据
      await dispatch(fetchDocumentById(document._id)).unwrap();
      
      // 数据加载完成后，再次打开弹窗，此时会使用 store 中的完整数据
      dispatch(openDocumentModal());
    } catch (error) {
      console.error('获取文档详情失败:', error);
    }
  };

  // 处理关闭文档详情模态框
  const handleCloseDocumentModal = () => {
    dispatch(closeDocumentModal());
  };

  // 处理保存文档编辑
  const handleSaveDocument = async (id, documentData) => {
    try {
      const response = await apiClient.put(`/documents/${id}`, documentData);
      const result = response.data;
      console.log('文档更新成功:', result);
      
      // 更新Redux状态
      dispatch(fetchDocuments());
      
      // 更新当前选中的文档
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
      
      // 更新当前选中的文档
      dispatch(openDocumentModal(result.data));
      
      return result.data;
    } catch (error) {
      console.error('更新引用关系失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新引用关系失败，请重试';
      alert(errorMessage);
      throw error;
    }
  };

  // 处理删除文档
  const handleDeleteDocument = async (id) => {
    try {
      const response = await apiClient.delete(`/documents/${id}`);

      console.log('文档删除成功');
      
      // 刷新Redux状态
      dispatch(fetchDocuments());
    } catch (error) {
      console.error('删除文档失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除文档失败，请重试';
      alert(errorMessage);
    }
  };

  // 处理创建文档
  const handleCreateDocument = async (documentData) => {
    try {
      const response = await apiClient.post('/documents', documentData);

      const result = response.data;
      console.log('文档创建成功:', result);
      
      // 创建成功后关闭模态框
      setCreateModalOpen(false);
      
      // 刷新文档列表
      const event = new CustomEvent('documentCreated', { detail: result.data });
      window.dispatchEvent(event);
      
      // 刷新Redux状态
      dispatch(fetchDocuments());
    } catch (error) {
      console.error('创建文档失败:', error);
      alert('创建文档失败，请重试');
    }
  };

  // 渲染加载状态
  if (status === 'loading') {
    return (
      <Container maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" color="text.secondary">
            正在加载数据...
          </Typography>
        </Box>
      </Container>
    );
  }

  const stats = getStatistics();
  const recentDocuments = getRecentDocuments();

  return (
    <Container maxWidth="xl">
      {/* 欢迎区域 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <WelcomeCard>
            <Typography variant="h3" component="h1" gutterBottom>
              欢迎回来
            </Typography>
            <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
              开始管理您的学习笔记
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
              sx={{
                borderRadius: 16,
                px: 4,
                py: 1.5,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'inherit',
                backdropFilter: 'blur(4px)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              创建新笔记
            </Button>
          </WelcomeCard>
        </Grid>
        
        {/* 快速操作 */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/笔记')}
                sx={{
                  height: '100%',
                  borderRadius: 16,
                  py: 2,
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <NoteIcon fontSize="large" />
                浏览笔记
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/设置')}
                sx={{
                  height: '100%',
                  borderRadius: 16,
                  py: 2,
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <TagIcon fontSize="large" />
                系统设置
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* 统计数据 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <StatIconContainer color="primary.main">
                <NoteIcon />
              </StatIconContainer>
              <Typography variant="h4" component="div" gutterBottom>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总笔记数
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <StatIconContainer color="secondary.main">
                <TrendingUpIcon />
              </StatIconContainer>
              <Typography variant="h4" component="div" gutterBottom>
                {stats.recentCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                本周更新
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <StatIconContainer color="tertiary.main">
                <TagIcon />
              </StatIconContainer>
              <Typography variant="h4" component="div" gutterBottom>
                {stats.tagCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                标签数量
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <StatIconContainer color="error.main">
                <UpdateIcon />
              </StatIconContainer>
              <Typography variant="h4" component="div" gutterBottom>
                {recentDocuments.length > 0 ? formatDate(recentDocuments[0].updatedAt) : '无'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                最近更新
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* 最近更新 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <RecentUpdatesCard>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom>
                最近更新的笔记
              </Typography>
              
              {recentDocuments.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {recentDocuments.map((doc, index) => (
                    <ListItem
                      key={doc._id}
                      button
                      onClick={() => handleOpenDocumentModal(doc)}
                      sx={{
                        borderRadius: 12,
                        mb: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon>
                        <NoteIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.title}
                        secondary={formatDate(doc.updatedAt)}
                        primaryTypographyProps={{
                          fontWeight: 'medium',
                          noWrap: true,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <EmptyStateContainer>
                  <NoteIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body2">
                    暂无笔记，开始创建您的第一条笔记吧！
                  </Typography>
                </EmptyStateContainer>
              )}
            </CardContent>
          </RecentUpdatesCard>
        </Grid>
        
        {/* 热门标签 */}
        <Grid item xs={12} md={6}>
          <RecentUpdatesCard>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom>
                热门标签
              </Typography>
              
              {documents.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(() => {
                    const tagCounts = {};
                    documents.forEach(doc => {
                      (doc.tags || []).forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                      });
                    });
                    
                    return Object.entries(tagCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([tag, count]) => (
                        <Chip
                          key={tag}
                          label={`${tag} (${count})`}
                          variant="outlined"
                          size="small"
                          clickable
                          onClick={() => navigate('/笔记')}
                          sx={{
                            borderRadius: 12,
                          }}
                        />
                      ));
                  })()}
                </Box>
              ) : (
                <EmptyStateContainer>
                  <TagIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body2">
                    暂无标签，创建笔记时添加标签吧！
                  </Typography>
                </EmptyStateContainer>
              )}
            </CardContent>
          </RecentUpdatesCard>
        </Grid>
      </Grid>

      {/* 创建笔记模态框 */}
      <DocumentFormModal
        open={createModalOpen}
        handleClose={handleCloseCreateModal}
        onSave={handleCreateDocument}
        mode="create"
      />

      {/* 文档详情模态框 */}
      <DocumentDetailModal
        open={isModalOpen}
        handleClose={handleCloseDocumentModal}
        document={selectedDocument}
        onSave={handleSaveDocument}
        onDelete={handleDeleteDocument}
        onSaveReferences={handleSaveReferences}
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

export default Home;