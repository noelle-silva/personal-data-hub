/**
 * 附件选择对话框组件
 * 用于选择现有附件作为引用对象
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Pagination,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { getAttachments, searchAttachments } from '../services/attachments';

// 附件类别映射
const CATEGORY_MAP = {
  image: '图片',
  video: '视频',
  document: '文档',
  script: '程序与脚本'
};

/**
 * 附件选择对话框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.open - 是否打开对话框
 * @param {Function} props.onClose - 关闭对话框回调
 * @param {Function} props.onConfirm - 确认选择回调
 * @param {string[]} props.excludeIds - 需要排除的附件ID数组
 * @param {string[]} props.initialSelectedIds - 初始选中的附件ID数组
 */
const AttachmentPickerDialog = ({
  open,
  onClose = () => {}, // 默认空函数，防止未传入时出错
  onConfirm,
  excludeIds = [],
  initialSelectedIds = []
}) => {
  // 状态管理
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);

  // 每页显示数量
  const pageSize = 20;

  // 生成稳定的 excludeIds 键，避免每次渲染都触发重新加载
  const excludeIdsKey = useMemo(() => {
    return JSON.stringify(excludeIds.sort());
  }, [excludeIds]);

  // 监听认证错误事件
  // 加载附件列表
  const loadAttachments = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      let response;
      const params = {
        page,
        limit: pageSize,
        sort: '-createdAt'
      };

      if (category) {
        params.category = category;
      }

      if (searchTerm.trim()) {
        response = await searchAttachments({
          q: searchTerm.trim(),
          ...params
        });
      } else {
        response = await getAttachments(params);
      }

      // 过滤掉需要排除的附件
      const filteredAttachments = response.data.filter(
        attachment => !excludeIds.includes(attachment._id)
      );

      setAttachments(filteredAttachments);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error) {
      console.error('加载附件列表失败:', error);
      setError(error.message || '加载附件列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, category, searchTerm, excludeIdsKey]);

  // 初始化和参数变化时加载附件
  useEffect(() => {
    if (open) {
      loadAttachments();
    }
  }, [open, loadAttachments]);

  // 处理搜索
  const handleSearch = () => {
    setPage(1);
    loadAttachments();
  };

  // 处理类别变化
  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
    setPage(1);
  };

  // 处理分页变化
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // 处理附件选择
  const handleToggleAttachment = (attachmentId) => {
    setSelectedIds(prev => {
      if (prev.includes(attachmentId)) {
        return prev.filter(id => id !== attachmentId);
      } else {
        return [...prev, attachmentId];
      }
    });
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedIds.length === attachments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(attachments.map(att => att._id));
    }
  };

  // 处理确认
  const handleConfirm = () => {
    onConfirm(selectedIds);
    handleClose();
  };

  // 处理关闭
  const handleClose = () => {
    setSearchTerm('');
    setCategory('');
    setPage(1);
    setSelectedIds(initialSelectedIds);
    setError('');
    onClose();
  };

  // 处理刷新
  const handleRefresh = () => {
    loadAttachments();
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">选择附件</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* 搜索和筛选区域 */}
        <Box mb={2}>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="搜索附件"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              variant="outlined"
              size="small"
              fullWidth
              InputProps={{
                endAdornment: (
                  <IconButton onClick={handleSearch} size="small">
                    <SearchIcon />
                  </IconButton>
                )
              }}
            />
            <IconButton onClick={handleRefresh} size="small" title="刷新">
              <RefreshIcon />
            </IconButton>
          </Box>
          
          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>附件类别</InputLabel>
            <Select
              value={category}
              onChange={handleCategoryChange}
              label="附件类别"
            >
              <MenuItem value="">全部</MenuItem>
              {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 全选按钮 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2">
            已选择 {selectedIds.length} 个附件
          </Typography>
          <Button
            size="small"
            onClick={handleSelectAll}
            disabled={attachments.length === 0}
          >
            {selectedIds.length === attachments.length ? '取消全选' : '全选'}
          </Button>
        </Box>

        {/* 附件列表 */}
        <Box
          sx={{
            maxHeight: 400,
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 1
          }}
        >
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : attachments.length === 0 ? (
            <Box display="flex" justifyContent="center" p={4}>
              <Typography variant="body2" color="textSecondary">
                {searchTerm.trim() || category ? '没有找到匹配的附件' : '暂无附件'}
              </Typography>
            </Box>
          ) : (
            attachments.map((attachment) => (
              <Box
                key={attachment._id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: '#f5f5f5'
                  }
                }}
              >
                <Checkbox
                  checked={selectedIds.includes(attachment._id)}
                  onChange={() => handleToggleAttachment(attachment._id)}
                />
                <Box flexGrow={1}>
                  <Typography variant="body2" noWrap>
                    {attachment.originalName}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <Chip
                      label={CATEGORY_MAP[attachment.category] || attachment.category}
                      size="small"
                      variant="outlined"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {formatFileSize(attachment.size)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {attachment.mimeType}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))
          )}
        </Box>

        {/* 分页 */}
        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={selectedIds.length === 0}
        >
          确认选择 ({selectedIds.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AttachmentPickerDialog;