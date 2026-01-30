import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  styled,
  Alert,
  Snackbar,
  Fab
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { Add as AddIcon } from '@mui/icons-material';
import TagMultiSelect from '../components/TagMultiSelect';
import apiClient from '../services/apiClient';
import DocumentGrid from '../components/DocumentGrid';
import DocumentFormModal from '../components/DocumentFormModal';
import {
  fetchByTags,
  fetchAllDocumentsPaged,
  selectSelectedTags,
  selectTagFilterItems,
  selectTagFilterStatus,
  selectTagFilterError,
  selectTagFilterSort,
  selectTagFilterPagination,
  selectTagFilterHasMore,
  setSelectedTags,
  setSort,
  setPage,
  clearSelectedTags
} from '../store/tagFilterSlice';

// 样式化的页面标题
const PageTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  textAlign: 'center',
}));

// 样式化的工具栏
const Toolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

// 样式化的控制区域
const ControlsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

// 样式化的排序控件
const SortControl = styled(FormControl)(({ theme }) => ({
  minWidth: 180,
  '& .MuiOutlinedInput-root': {
    borderRadius: 16, // 16px 圆角，符合交互组件规范
  },
}));

// 样式化的已选标签容器
const SelectedTagsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

// 样式化的提示信息
const InfoAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 16,
}));

const TagFilter = () => {
  const dispatch = useDispatch();
  const selectedTags = useSelector(selectSelectedTags);
  const items = useSelector(selectTagFilterItems);
  const status = useSelector(selectTagFilterStatus);
  const error = useSelector(selectTagFilterError);
  const sort = useSelector(selectTagFilterSort);
  const pagination = useSelector(selectTagFilterPagination);
  const hasMore = useSelector(selectTagFilterHasMore);
  
  // 本地状态
  const [showError, setShowError] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const debounceTimerRef = useRef(null);
  
  
  // 监听错误状态变化
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);
  
  // 默认加载所有文档（当没有选择标签时）
  useEffect(() => {
    if (status === 'idle' && selectedTags.length === 0) {
      dispatch(fetchAllDocumentsPaged({
        page: 1,
        limit: 20,
        sort
      }));
    }
  }, [status, sort, dispatch, selectedTags.length]); // 添加 status 依赖，防止 StrictMode 重复触发

  // 防抖处理标签选择变化
  useEffect(() => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 如果没有选择标签，不执行筛选逻辑
    if (selectedTags.length === 0) {
      return;
    }
    
    // 设置新的定时器，300ms后执行搜索
    debounceTimerRef.current = setTimeout(() => {
      dispatch(fetchByTags({
        tags: selectedTags,
        mode: 'all',
        page: 1,
        limit: 20,
        sort
      }));
    }, 300);
    
    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedTags, sort, dispatch]);
  
  // 处理排序变化
  const handleSortChange = (event) => {
    dispatch(setSort(event.target.value));
  };
  
  // 处理清空筛选
  const handleClearFilter = () => {
    dispatch(clearSelectedTags());
  };
  
  // 处理加载更多
  const handleLoadMore = (options = {}) => {
    if (options.refresh) {
      // 刷新当前页
      if (selectedTags.length > 0) {
        // 筛选模式
        dispatch(fetchByTags({
          tags: selectedTags,
          mode: 'all',
          page: pagination.page,
          limit: 20,
          sort
        }));
      } else {
        // 默认模式
        dispatch(fetchAllDocumentsPaged({
          page: pagination.page,
          limit: 20,
          sort
        }));
      }
    } else if (hasMore) {
      // 加载下一页
      dispatch(setPage(pagination.page + 1));
      if (selectedTags.length > 0) {
        // 筛选模式
        dispatch(fetchByTags({
          tags: selectedTags,
          mode: 'all',
          page: pagination.page + 1,
          limit: 20,
          sort
        }));
      } else {
        // 默认模式
        dispatch(fetchAllDocumentsPaged({
          page: pagination.page + 1,
          limit: 20,
          sort
        }));
      }
    }
  };
  
  // 关闭错误提示
  const handleCloseError = () => {
    setShowError(false);
  };

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
      
      // 触发文档创建事件，通知DocumentGrid刷新
      const event = new CustomEvent('documentCreated', { detail: result.data });
      window.dispatchEvent(event);

      // 刷新当前筛选结果
      handleLoadMore({ refresh: true });

    } catch (error) {
      console.error('创建文档失败:', error);
      alert('创建文档失败，请重试');
    }
  };
  
  // 渲染已选标签
  const renderSelectedTags = () => {
    if (selectedTags.length === 0) return null;
    
    return (
      <SelectedTagsContainer>
        <Typography variant="body2" color="text.secondary">
          已选择标签：
        </Typography>
        {selectedTags.map((tag, index) => (
          <Chip
            key={index}
            label={tag}
            onDelete={() => {
              const newTags = selectedTags.filter(t => t !== tag);
              dispatch(setSelectedTags(newTags));
            }}
            size="small"
            color="primary"
            variant="outlined"
            sx={{
              borderRadius: 12, // 12px 圆角，符合辅助组件规范
            }}
          />
        ))}
      </SelectedTagsContainer>
    );
  };
  
  return (
    <Container maxWidth="xl">
      <PageTitle variant="h3" component="h1">
        标签筛选
      </PageTitle>
      
      {/* 工具栏 */}
      <Toolbar>
        <ControlsContainer>
          <SortControl variant="outlined" size="small">
            <InputLabel id="sort-select-label">排序方式</InputLabel>
            <Select
              labelId="sort-select-label"
              id="sort-select"
              value={sort}
              onChange={handleSortChange}
              label="排序方式"
            >
              <MenuItem value="-updatedAt">更新时间（新到旧）</MenuItem>
              <MenuItem value="updatedAt">更新时间（旧到新）</MenuItem>
              <MenuItem value="-createdAt">创建时间（新到旧）</MenuItem>
              <MenuItem value="createdAt">创建时间（旧到新）</MenuItem>
              <MenuItem value="title">标题（A-Z）</MenuItem>
              <MenuItem value="-title">标题（Z-A）</MenuItem>
            </Select>
          </SortControl>
          
          <Button
            variant="outlined"
            startIcon={<ClearAllIcon />}
            onClick={handleClearFilter}
            disabled={selectedTags.length === 0}
            sx={{
              borderRadius: 16,
            }}
          >
            清空筛选
          </Button>
        </ControlsContainer>

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
      </Toolbar>
      
      {/* 标签选择器 */}
      <TagMultiSelect />
      
      {/* 已选标签展示 */}
      {renderSelectedTags()}
      
      {/* 提示信息 */}
      {selectedTags.length === 0 ? (
        <InfoAlert severity="info">
          未选择标签时将显示全部笔记，选择标签可进一步筛选。
        </InfoAlert>
      ) : (
        <InfoAlert severity="info">
          系统将返回同时包含所有选中标签的笔记。
        </InfoAlert>
      )}
      
      {/* 文档列表 */}
      <DocumentGrid
        items={items}
        status={status}
        error={error}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        emptyMessage={selectedTags.length === 0 ? "暂无笔记" : "没有找到同时包含所有选中标签的笔记"}
      />
      
      {/* 错误提示 */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error || '加载失败，请重试'}
        </Alert>
      </Snackbar>

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

export default TagFilter;
