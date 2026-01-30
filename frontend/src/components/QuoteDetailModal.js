/**
 * @deprecated 此组件已被新的窗口系统替代
 * 请使用 QuoteWindow 和 QuoteDetailContent 组件
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import apiClient from '../services/apiClient';
import { styled } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Note as NoteIcon,
  Launch as LaunchIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  DragIndicator as DragIndicatorIcon,
  Undo as UndoIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import {
  fetchDocumentById,
  openDocumentModal
} from '../store/documentsSlice';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DocumentPickerDialog from './DocumentPickerDialog';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';
import CodeEditor from './CodeEditor';

// 样式化的对话框
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 20, // 20px 圆角，符合主要容器规范
    maxWidth: '1200px', // 增加最大宽度
    width: '95%', // 增加默认宽度
    maxHeight: '90vh',
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
  overflowY: 'hidden', // 禁用整体滚动，由各分区独立控制
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(90vh - 120px)', // 减去标题栏和操作栏的高度
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 4,
  },
}));

// 左侧栏容器样式
const LeftPanelContainer = styled(Box)(({ theme }) => ({
  paddingRight: theme.spacing(2),
  height: '100%',
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 4,
  },
}));

// 右侧栏容器样式
const RightPanelContainer = styled(Box)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));
// 右侧栏内容区域样式
const RightPanelContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 4,
  },
}));

// 样式化的对话框操作区
const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(3),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

// 样式化的标签容器
const TagsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

// 样式化的引用文档容器
const ReferencedDocsContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: 16,
}));

// 样式化的引用文档标题
const ReferencedDocsTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(2),
  color: theme.palette.primary.main,
}));

// 样式化的引用文档列表
const ReferencedDocsList = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(2),
}));

// 样式化的引用文档项
const ReferencedDocItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.surfaceVariant.main,
  borderRadius: 16,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.surfaceVariant.dark,
  },
}));

// 格式化相对时间
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays <= 7) return `${diffDays}天前`;
  if (diffDays <= 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays <= 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
};

// 可排序的引用文档项组件
const SortableReferencedDocItem = ({ doc, index, onRemove, onView, isEditing }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc._id || doc });

  const [copyTooltip, setCopyTooltip] = useState('复制标记');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // HTML 转义函数
  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // 处理复制标记
  const handleCopyAction = async (e) => {
    e.stopPropagation();
    const docId = doc._id || doc;
    const docTitle = doc.title || '查看详情';
    const escapedTitle = escapeHtml(docTitle);
    
    // 生成包含 data-label 和笔记标题的标记
    const actionMarkup = `<x-tab-action data-action="open-document" data-doc-id="${docId}" data-label="${escapedTitle}">${escapedTitle}</x-tab-action>`;
    
    try {
      // 优先使用现代 clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(actionMarkup);
      } else {
        // 降级方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = actionMarkup;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      // 显示成功反馈
      setCopyTooltip('已复制');
      setTimeout(() => setCopyTooltip('复制标记'), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      setCopyTooltip('复制失败');
      setTimeout(() => setCopyTooltip('复制标记'), 2000);
    }
  };

  return (
    <ReferencedDocItem
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: isEditing ? 'grab' : 'pointer',
        '&:active': { cursor: isEditing ? 'grabbing' : 'pointer' }
      }}
    >
      {isEditing && (
        <Box
          {...attributes}
          {...listeners}
          sx={{
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' }
          }}
          aria-label="拖拽排序"
        >
          <DragIndicatorIcon color="action" fontSize="small" />
        </Box>
      )}
      <NoteIcon sx={{ mr: 2, color: 'primary.main' }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" fontWeight="medium">
          {doc.title}
        </Typography>
        {doc.tags && doc.tags.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            {doc.tags.slice(0, 3).map((tag, tagIndex) => (
              <Chip
                key={tagIndex}
                label={tag}
                size="small"
                variant="outlined"
                sx={{
                  mr: 0.5,
                  borderRadius: 8,
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            ))}
            {doc.tags.length > 3 && (
              <Chip
                label={`+${doc.tags.length - 3}`}
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: 8,
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            )}
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={copyTooltip}>
          <IconButton
            size="small"
            onClick={handleCopyAction}
            sx={{
              borderRadius: 16,
              mr: 0.5,
            }}
            aria-label="复制标记"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {isEditing && (
          <Tooltip title="删除引用">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              aria-label="删除引用"
            >
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="查看笔记详情">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onView(doc._id || doc);
            }}
            aria-label="查看笔记详情"
          >
            <LaunchIcon color="action" fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </ReferencedDocItem>
  );
};

const QuoteDetailModal = ({ open, handleClose, quote, onSave, onDelete, onSaveReferences }) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    content: '',
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState(null);
  const isActionsMenuOpen = Boolean(actionsMenuAnchorEl);
  
  // 引用列表相关状态
  const [referencedDocuments, setReferencedDocuments] = useState([]);
  const [originalReferencedIds, setOriginalReferencedIds] = useState([]);
  const [isReferencesDirty, setIsReferencesDirty] = useState(false);
  const [isDocumentPickerOpen, setIsDocumentPickerOpen] = useState(false);
  
  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 当引用体数据变化时，更新表单和引用列表
  useEffect(() => {
    if (quote) {
      setEditForm({
        title: quote.title || '',
        description: quote.description || '',
        content: quote.content || '',
        tags: quote.tags || []
      });
      
      // 初始化引用列表，兼容已填充对象和ID两种形态
      const refs = quote.referencedDocumentIds || [];
      const normalizedRefs = refs.map(ref => {
        if (typeof ref === 'string') {
          return { _id: ref, title: '加载中...', tags: [] };
        }
        return ref;
      });
      
      setReferencedDocuments(normalizedRefs);
      setOriginalReferencedIds(refs.map(ref => typeof ref === 'string' ? ref : ref._id));
      setIsReferencesDirty(false);
    }
  }, [quote]);

  // 处理编辑模式切换
  const handleToggleEdit = () => {
    if (isEditing) {
      // 取消编辑，重置表单
      setEditForm({
        title: quote.title || '',
        description: quote.description || '',
        content: quote.content || '',
        tags: quote.tags || []
      });
      setError('');
    }
    setIsEditing(!isEditing);
  };

  // 处理表单字段变化
  const handleFieldChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
    // 清除错误信息
    if (error) setError('');
  };

  // 处理标签变化
  const handleTagsChange = (event) => {
    const tagsString = event.target.value;
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    handleFieldChange('tags', tags);
  };

  // 处理保存
  const handleSave = async () => {
    // 验证表单
    if (!editForm.title.trim()) {
      setError('标题不能为空');
      return;
    }
    if (!editForm.content.trim()) {
      setError('内容不能为空');
      return;
    }
    if (editForm.description && editForm.description.length > 300) {
      setError('描述不能超过300个字符');
      return;
    }

    setLoading(true);
    try {
      await onSave(quote._id, editForm);
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (window.confirm('确定要删除这个引用体吗？此操作不可撤销。')) {
      setLoading(true);
      try {
        await onDelete(quote._id);
        handleClose();
      } catch (err) {
        setError(err.message || '删除失败');
      } finally {
        setLoading(false);
      }
    }
  };

  // 处理拖拽结束
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setReferencedDocuments((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
      setIsReferencesDirty(true);
    }
  };

  // 处理移除引用
  const handleRemoveReference = (index) => {
    setReferencedDocuments(prev => prev.filter((_, i) => i !== index));
    setIsReferencesDirty(true);
  };

  // 处理添加引用
  const handleAddReferences = async (selectedIds) => {
    try {
      // 获取新添加的文档详情
      const newDocuments = [];
      for (const id of selectedIds) {
        // 如果已经存在，跳过（重复添加去重）
        if (referencedDocuments.some(doc => doc._id === id)) {
          continue;
        }
        
        try {
          const response = await apiClient.get(`/documents/${id}`);
          newDocuments.push(response.data.data);
        } catch (error) {
          console.error(`获取文档 ${id} 详情失败:`, error);
        }
      }
      
      if (newDocuments.length > 0) {
        setReferencedDocuments(prev => [...prev, ...newDocuments]);
        setIsReferencesDirty(true);
      }
    } catch (error) {
      console.error('添加引用失败:', error);
      setError('添加引用失败，请重试');
    }
  };

  // 处理保存引用列表
  const handleSaveReferences = async () => {
    if (!quote || !onSaveReferences) return;
    
    setLoading(true);
    setError('');
    
    try {
      const referencedIds = referencedDocuments.map(doc => doc._id);
      await onSaveReferences(quote._id, referencedIds);
      
      // 重置原始引用ID和脏状态
      setOriginalReferencedIds(referencedIds);
      setIsReferencesDirty(false);
    } catch (err) {
      setError(err.message || '保存引用列表失败');
      // 保存失败回滚本地顺序
      handleResetReferences();
    } finally {
      setLoading(false);
    }
  };

  // 处理撤销引用列表更改
  const handleResetReferences = () => {
    // 恢复到原始引用列表
    const refs = originalReferencedIds.length > 0
      ? originalReferencedIds
      : (quote?.referencedDocumentIds || []);
    
    const normalizedRefs = refs.map(ref => {
      if (typeof ref === 'string') {
        return { _id: ref, title: '加载中...', tags: [] };
      }
      return ref;
    });
    
    setReferencedDocuments(normalizedRefs);
    setIsReferencesDirty(false);
    setError('');
  };

  // 处理查看引用的文档
  const handleViewReferencedDoc = async (docId) => {
    try {
      // 先显示一个加载中的弹窗，提供即时反馈
      dispatch(openDocumentModal({
        _id: docId,
        title: '加载中...',
        content: '加载中...',
        tags: [],
        source: ''
      }));
      
      // 然后获取完整数据
      await dispatch(fetchDocumentById(docId)).unwrap();
      
      // 数据加载完成后，再次打开弹窗，此时会使用 store 中的完整数据
      dispatch(openDocumentModal());
    } catch (error) {
      console.error('获取文档详情失败:', error);
      alert('获取文档详情失败，请重试');
    }
  };

  // 处理关闭对话框
  const handleCloseDialog = () => {
    if (isEditing) {
      handleToggleEdit(); // 先取消编辑
    }
    handleClose();
    setError('');
  };

  const handleOpenActionsMenu = (event) => {
    setActionsMenuAnchorEl(event.currentTarget);
  };

  const handleCloseActionsMenu = () => {
    setActionsMenuAnchorEl(null);
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleCloseDialog}
      maxWidth="md"
      fullWidth
    >
      <StyledDialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="h6" component="h2" sx={{ mr: 2 }}>
            {isEditing ? '编辑引用体' : '引用体详情'}
          </Typography>
          {!isEditing && (
            <Typography variant="caption" color="text.secondary">
              更新于 {quote ? formatRelativeTime(quote.updatedAt) : ''}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* 编辑/保存按钮 */}
          <IconButton
            onClick={isEditing ? handleSave : handleToggleEdit}
            aria-label={isEditing ? "保存" : "编辑"}
            sx={(theme) => ({
              color: isEditing ? 'success.main' : theme.palette.text.secondary,
              borderRadius: 16,
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light'
                  ? 'rgba(0, 0, 0, 0.04)'
                  : 'rgba(255, 255, 255, 0.08)',
              },
            })}
          >
            {isEditing ? <SaveIcon /> : <EditIcon />}
          </IconButton>

          {/* 更多操作按钮 */}
          <IconButton
            onClick={handleOpenActionsMenu}
            aria-controls={isActionsMenuOpen ? 'quote-detail-actions-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={isActionsMenuOpen ? 'true' : undefined}
            sx={(theme) => ({
              color: theme.palette.text.secondary,
              borderRadius: 16,
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light'
                  ? 'rgba(0, 0, 0, 0.04)'
                  : 'rgba(255, 255, 255, 0.08)',
              },
            })}
          >
            <MoreVertIcon />
          </IconButton>

          {/* 关闭按钮 */}
          <IconButton onClick={handleCloseDialog}>
            <CloseIcon />
          </IconButton>
        </Box>
      </StyledDialogTitle>

      <Menu
        id="quote-detail-actions-menu"
        anchorEl={actionsMenuAnchorEl}
        open={isActionsMenuOpen}
        onClose={handleCloseActionsMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 16,
          },
        }}
      >
        <MenuItem onClick={handleDelete}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <DeleteIcon color="error" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="删除引用体"
            primaryTypographyProps={{
              color: 'error.main',
              fontWeight: 600,
            }}
          />
        </MenuItem>
      </Menu>

      <StyledDialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* 左侧栏：引用的笔记 */}
            <LeftPanelContainer sx={{ width: '35%' }}>
              <ReferencedDocsContainer>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <ReferencedDocsTitle variant="subtitle1">
                    引用的笔记 ({referencedDocuments.length})
                  </ReferencedDocsTitle>
                  <IconButton
                    size="small"
                    onClick={() => setIsDocumentPickerOpen(true)}
                    aria-label="添加引用笔记"
                    sx={{
                      borderRadius: 16,
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                {/* 引用列表操作按钮 */}
                {isReferencesDirty && (
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSaveReferences}
                      disabled={loading}
                      startIcon={<SaveIcon />}
                      sx={{ borderRadius: 16 }}
                    >
                      保存引用
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResetReferences}
                      startIcon={<UndoIcon />}
                      sx={{ borderRadius: 16 }}
                    >
                      撤销
                    </Button>
                  </Box>
                )}
                
                {referencedDocuments.length > 0 ? (
                  isEditing ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={referencedDocuments.map(doc => doc._id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <ReferencedDocsList>
                          {referencedDocuments.map((doc, index) => (
                            <SortableReferencedDocItem
                              key={doc._id}
                              doc={doc}
                              index={index}
                              onRemove={handleRemoveReference}
                              onView={handleViewReferencedDoc}
                              isEditing={isEditing}
                            />
                          ))}
                        </ReferencedDocsList>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <ReferencedDocsList>
                      {referencedDocuments.map((doc, index) => (
                        <SortableReferencedDocItem
                          key={doc._id}
                          doc={doc}
                          index={index}
                          onRemove={handleRemoveReference}
                          onView={handleViewReferencedDoc}
                          isEditing={isEditing}
                        />
                      ))}
                    </ReferencedDocsList>
                  )
                ) : (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 4,
                    color: 'text.secondary'
                  }}>
                    <NoteIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body2">
                      暂无引用笔记
                    </Typography>
                    <Typography variant="caption" sx={{ mt: 1 }}>
                      点击上方加号按钮添加
                    </Typography>
                  </Box>
                )}
              </ReferencedDocsContainer>
            </LeftPanelContainer>

            {/* 右侧栏：标题、标签、描述、内容 */}
            <RightPanelContainer sx={{ width: '65%' }}>
              <RightPanelContent>
                {/* 标题 */}
                <Box sx={{ mb: 2 }}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      label="标题"
                      value={editForm.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      variant="outlined"
                      error={!editForm.title.trim()}
                      helperText={!editForm.title.trim() ? '标题不能为空' : ''}
                    />
                  ) : (
                    <Typography variant="h5" component="h3" fontWeight="bold">
                      {quote?.title}
                    </Typography>
                  )}
                </Box>

                {/* 描述 */}
                <Box sx={{ mb: 2 }}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      label="描述"
                      value={editForm.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      variant="outlined"
                      multiline
                      rows={2}
                      inputProps={{ maxLength: 300 }}
                      helperText={`${editForm.description.length}/300`}
                    />
                  ) : (
                    quote?.description && (
                      <Typography variant="body1" color="text.secondary">
                        {quote.description}
                      </Typography>
                    )
                  )}
                </Box>

                {/* 标签 - 移除了"标签"字样 */}
                <Box sx={{ mb: 2 }}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      value={editForm.tags.join(', ')}
                      onChange={handleTagsChange}
                      variant="outlined"
                      placeholder="输入标签，用逗号分隔"
                      helperText="例如：JavaScript, React, 前端"
                    />
                  ) : (
                    <TagsContainer>
                      {quote?.tags?.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderRadius: 12, // 12px 圆角，符合辅助组件规范
                          }}
                        />
                      ))}
                    </TagsContainer>
                  )}
                </Box>

                {/* 内容 */}
                <Box>
                  {isEditing ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                        内容 *
                      </Typography>
                      <CodeEditor
                        value={editForm.content}
                        onChange={(value) => handleFieldChange('content', value)}
                        language="markdown"
                        mode="autoSize"
                        minHeight={200}
                        maxHeight="50vh"
                        debounceMs={300}
                      />
                      {!editForm.content.trim() && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                          内容不能为空
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 100 }}>
                      <MarkdownInlineRenderer
                        content={quote?.content}
                        cacheKey={quote?._id && quote?.updatedAt ? `${quote._id}|${quote.updatedAt}` : null}
                        fallbackContent={
                          <Typography
                            variant="body1"
                            paragraph
                            sx={{
                              lineHeight: 1.8,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              width: '100%',
                            }}
                          >
                            {quote?.content}
                          </Typography>
                        }
                      />
                    </Box>
                  )}
                </Box>
              </RightPanelContent>

              {/* 更新时间区域已移至顶部标题栏 */}
            </RightPanelContainer>
          </Box>
        )}
      </StyledDialogContent>

      {/* 编辑模式的操作按钮 */}
      {isEditing && (
        <StyledDialogActions>
          <Button
            startIcon={<CancelIcon />}
            onClick={handleToggleEdit}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSave}
            variant="contained"
            disabled={loading}
          >
            保存
          </Button>
        </StyledDialogActions>
      )}
      
      {/* 文档选择对话框 */}
      <DocumentPickerDialog
        open={isDocumentPickerOpen}
        handleClose={() => setIsDocumentPickerOpen(false)}
        onConfirm={handleAddReferences}
        excludeIds={referencedDocuments.map(doc => doc._id)}
        initialSelectedIds={referencedDocuments.map(doc => doc._id)}
      />
    </StyledDialog>
  );
};

export default QuoteDetailModal;
