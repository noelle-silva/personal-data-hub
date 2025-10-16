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
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Fab
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { styled as muiStyled } from '@mui/material/styles';
import {
  ClearAll,
  Search as SearchIcon,
  Add as AddIcon
} from '@mui/icons-material';
import QuoteTagMultiSelect from '../components/QuoteTagMultiSelect';
import QuoteGrid from '../components/QuoteGrid';
import QuoteFormModal from '../components/QuoteFormModal';
import {
  fetchAvailableQuoteTags,
  fetchQuotesByFilter,
  fetchAllQuotesPaged,
  selectSelectedQuoteTags,
  selectQuoteFilterItems,
  selectQuoteFilterStatus,
  selectQuoteFilterError,
  selectQuoteFilterQuery,
  selectQuoteFilterSort,
  selectQuoteFilterPagination,
  selectQuoteFilterHasMore,
  setQuery,
  setSelectedTags,
  setSort,
  setPage,
  resetFilter
} from '../store/quotesFilterSlice';
import { createQuote } from '../store/quotesSlice';

// 样式化的页面标题
const PageTitle = muiStyled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  textAlign: 'center',
}));

// 样式化的工具栏
const Toolbar = muiStyled(Box)(({ theme }) => ({
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
const ControlsContainer = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

// 样式化的搜索框
const SearchField = muiStyled(TextField)(({ theme }) => ({
  minWidth: 300,
  '& .MuiOutlinedInput-root': {
    borderRadius: 16, // 16px 圆角，符合交互组件规范
  },
}));

// 样式化的排序控件
const SortControl = muiStyled(FormControl)(({ theme }) => ({
  minWidth: 180,
  '& .MuiOutlinedInput-root': {
    borderRadius: 16, // 16px 圆角，符合交互组件规范
  },
}));

// 样式化的已选标签容器
const SelectedTagsContainer = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

// 样式化的提示信息
const InfoAlert = muiStyled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 16,
}));

const Quotes = () => {
  const dispatch = useDispatch();
  const selectedTags = useSelector(selectSelectedQuoteTags);
  const items = useSelector(selectQuoteFilterItems);
  const status = useSelector(selectQuoteFilterStatus);
  const error = useSelector(selectQuoteFilterError);
  const query = useSelector(selectQuoteFilterQuery);
  const sort = useSelector(selectQuoteFilterSort);
  const pagination = useSelector(selectQuoteFilterPagination);
  const hasMore = useSelector(selectQuoteFilterHasMore);
  
  // 本地状态
  const [showError, setShowError] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const debounceTimerRef = useRef(null);
  
  // 组件挂载时获取可用标签
  useEffect(() => {
    dispatch(fetchAvailableQuoteTags());
  }, [dispatch]);
  
  // 监听错误状态变化
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);
  
  // 默认加载所有引用体（当没有搜索条件和标签时）
  useEffect(() => {
    if (!query && selectedTags.length === 0) {
      dispatch(fetchAllQuotesPaged({
        page: 1,
        limit: 20,
        sort
      }));
    }
  }, [sort, dispatch, query, selectedTags.length]); // 添加 query 和 selectedTags.length 依赖，确保清空时重新加载

  // 防抖处理搜索查询变化
  useEffect(() => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 如果没有搜索条件和标签，不执行筛选逻辑
    if (!query && selectedTags.length === 0) {
      return;
    }
    
    // 设置新的定时器，300ms后执行搜索
    debounceTimerRef.current = setTimeout(() => {
      dispatch(fetchQuotesByFilter({
        query,
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
  }, [query, selectedTags, sort, dispatch]);
  
  // 处理搜索查询变化
  const handleQueryChange = (event) => {
    dispatch(setQuery(event.target.value));
  };
  
  // 处理排序变化
  const handleSortChange = (event) => {
    dispatch(setSort(event.target.value));
  };
  
  // 处理清空筛选
  const handleClearFilter = () => {
    dispatch(resetFilter());
  };
  
  // 处理加载更多
  const handleLoadMore = (options = {}) => {
    if (options.refresh) {
      // 刷新当前页
      if (query || selectedTags.length > 0) {
        // 筛选模式
        dispatch(fetchQuotesByFilter({
          query,
          tags: selectedTags,
          mode: 'all',
          page: pagination.page,
          limit: 20,
          sort
        }));
      } else {
        // 默认模式
        dispatch(fetchAllQuotesPaged({
          page: pagination.page,
          limit: 20,
          sort
        }));
      }
    } else if (hasMore) {
      // 加载下一页
      dispatch(setPage(pagination.page + 1));
      if (query || selectedTags.length > 0) {
        // 筛选模式
        dispatch(fetchQuotesByFilter({
          query,
          tags: selectedTags,
          mode: 'all',
          page: pagination.page + 1,
          limit: 20,
          sort
        }));
      } else {
        // 默认模式
        dispatch(fetchAllQuotesPaged({
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
  
  // 关闭成功提示
  const handleCloseSuccess = () => {
    setSuccessMessage('');
  };
  
  // 处理打开创建模态框
  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
  };
  
  // 处理关闭创建模态框
  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
  };
  
  // 处理创建引用体
  const handleCreateQuote = async (quoteData) => {
    try {
      await dispatch(createQuote(quoteData)).unwrap();
      setSuccessMessage('引用体创建成功');
      
      // 刷新当前列表（保留筛选和分页状态）
      if (query || selectedTags.length > 0) {
        // 筛选模式
        dispatch(fetchQuotesByFilter({
          query,
          tags: selectedTags,
          mode: 'all',
          page: pagination.page,
          limit: 20,
          sort
        }));
      } else {
        // 默认模式
        dispatch(fetchAllQuotesPaged({
          page: pagination.page,
          limit: 20,
          sort
        }));
      }
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
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
        引用体
      </PageTitle>
      
      {/* 工具栏 */}
      <Toolbar>
        <ControlsContainer>
          <SearchField
            variant="outlined"
            size="small"
            placeholder="搜索引用体..."
            value={query}
            onChange={handleQueryChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          
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
            startIcon={<ClearAll />}
            onClick={handleClearFilter}
            disabled={!query && selectedTags.length === 0}
            sx={{
              borderRadius: 16,
            }}
          >
            清空筛选
          </Button>
          
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
            新建引用体
          </Button>
        </ControlsContainer>
      </Toolbar>
      
      {/* 标签选择器 */}
      <QuoteTagMultiSelect />
      
      {/* 已选标签展示 */}
      {renderSelectedTags()}
      
      {/* 提示信息 */}
      {!query && selectedTags.length === 0 ? (
        <InfoAlert severity="info">
          未输入关键词或选择标签时将显示全部引用体，可随时筛选。
        </InfoAlert>
      ) : (
        <InfoAlert severity="info">
          系统将返回匹配的引用体。
        </InfoAlert>
      )}
      
      {/* 引用体列表 */}
      <QuoteGrid
        items={items}
        status={status}
        error={error}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        emptyMessage={(!query && selectedTags.length === 0) ? "暂无引用体" : "没有找到匹配的引用体"}
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
      
      {/* 成功提示 */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      
      {/* 创建引用体模态框 */}
      <QuoteFormModal
        open={createModalOpen}
        handleClose={handleCloseCreateModal}
        onSave={handleCreateQuote}
      />
      
      {/* 浮动创建按钮（移动端友好） */}
      <Fab
        color="primary"
        aria-label="添加引用体"
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

export default Quotes;