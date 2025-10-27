import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Box,
  Typography,
  Chip,
  IconButton,
  Paper,
  Backdrop,
  TextField,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import apiClient from '../services/apiClient';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import NoteIcon from '@mui/icons-material/Note';
import LaunchIcon from '@mui/icons-material/Launch';
import UndoIcon from '@mui/icons-material/Undo';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CodeIcon from '@mui/icons-material/Code';
import HtmlIcon from '@mui/icons-material/Html';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useSelector } from 'react-redux';
import { selectSelectedDocumentStatus } from '../store/documentsSlice';
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
import QuoteDetailModal from './QuoteDetailModal';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';
import HtmlSandboxRenderer from './HtmlSandboxRenderer';
import CodeEditor from './CodeEditor';

// 样式化的模态框容器
const ModalContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  maxWidth: 1200,
  maxHeight: '90vh',
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[24],
  borderRadius: 20, // 设置为 20px 圆角，与卡片保持一致
  outline: 'none',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${theme.palette.border}`,
  transition: 'background-color 0.3s ease, border-color 0.3s ease',
  zIndex: 1400, // 确保模态框显示在最上层，高于搜索下拉框
}));

// 标题区域
const HeaderBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderBottom: `1px solid ${theme.palette.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  backgroundColor: theme.palette.surfaceVariant,
  transition: 'background-color 0.3s ease',
}));

// 内容区域
const ContentBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  flexGrow: 1,
  overflow: 'hidden',
}));

// 左侧关系区域
const RelationsBox = styled(Box)(({ theme }) => ({
  width: '40%',
  minWidth: 300,
  padding: theme.spacing(2),
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
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

// 右侧内容区域
const RightContentBox = styled(Box)(({ theme }) => ({
  width: '60%',
  padding: theme.spacing(3),
  overflowY: 'auto',
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
}));

// 关系模块容器
const RelationModule = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  borderRadius: 16,
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
}));

// 关系模块标题
const RelationModuleTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

// 引用体列表容器
const QuotesListContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  maxHeight: 200,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 3,
  },
}));

// 引用体项
const QuoteItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.surfaceVariant.main,
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.surfaceVariant.dark,
  },
}));

// 引用文档列表容器
const ReferencedDocsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  maxHeight: 200,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 3,
  },
}));

// 引用文档项
const ReferencedDocItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.surfaceVariant.main,
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.surfaceVariant.dark,
  },
}));

// 操作按钮容器
const ActionsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: theme.spacing(1),
}));

// 空状态容器
const EmptyStateContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  color: theme.palette.text.secondary,
  fontStyle: 'italic',
}));

// 标签容器
const TagsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

// 元信息容器
const MetaInfoContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
}));

// 可排序的引用文档项组件
const SortableReferencedDocItem = ({ doc, index, onRemove, isEditing }) => {
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
            mr: 1,
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
      <NoteIcon sx={{ mr: 1, color: 'primary.main' }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" fontWeight="medium">
          {doc.title}
        </Typography>
        {doc.tags && doc.tags.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            {doc.tags.slice(0, 2).map((tag, tagIndex) => (
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
            {doc.tags.length > 2 && (
              <Chip
                label={`+${doc.tags.length - 2}`}
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
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {!isEditing && (
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
        )}
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
      </Box>
    </ReferencedDocItem>
  );
};

const DocumentDetailModal = ({ open, handleClose, document, onSave, onDelete, onSaveReferences }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isReferencesEditing, setIsReferencesEditing] = useState(false);
  const [contentType, setContentType] = useState('html'); // 'html' 或 'text'
  const [previewHtml, setPreviewHtml] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    htmlContent: '',
    tags: [],
    source: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState(null);
  const isActionsMenuOpen = Boolean(actionsMenuAnchorEl);
  
  // 引用列表相关状态
  const [referencedDocuments, setReferencedDocuments] = useState([]);
  const [originalReferencedIds, setOriginalReferencedIds] = useState([]);
  const [isReferencesDirty, setIsReferencesDirty] = useState(false);
  const [isDocumentPickerOpen, setIsDocumentPickerOpen] = useState(false);
  const [quoteDetailOpen, setQuoteDetailOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [referencingQuotes, setReferencingQuotes] = useState([]);
  const [quotesPagination, setQuotesPagination] = useState(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  
  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 获取单个文档的加载状态
  const selectedDocumentStatus = useSelector(selectSelectedDocumentStatus);
  
  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 初始化表单数据和引用列表
  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title || '',
        content: document.content || '',
        htmlContent: document.htmlContent || '',
        tags: document.tags || [],
        source: document.source || '',
      });
      setTagInput('');
      setIsEditing(false);
      
      // 设置默认显示类型
      if (document.htmlContent) {
        setContentType('html');
      } else {
        setContentType('text');
      }
      
      // 重置预览状态
      setPreviewHtml(false);
      
      // 初始化引用列表
      const refs = document.referencedDocumentIds || [];
      setReferencedDocuments(refs);
      setOriginalReferencedIds(refs.map(ref => typeof ref === 'string' ? ref : ref._id));
      setIsReferencesDirty(false);
      setIsReferencesEditing(false);
      
      // 初始化引用此文档的引用体列表
      setReferencingQuotes(document.referencingQuotes || []);
      setQuotesPagination(document.referencingQuotesPagination || null);
    }
  }, [document]);

  // 处理表单字段变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 切换编辑模式
  const toggleEditMode = () => {
    if (isEditing) {
      // 取消编辑，恢复原始数据
      setFormData({
        title: document.title || '',
        content: document.content || '',
        htmlContent: document.htmlContent || '',
        tags: document.tags || [],
        source: document.source || '',
      });
      setTagInput('');
      setPreviewHtml(false);
    }
    setIsEditing(!isEditing);
  };

  // 保存编辑
  const handleSave = () => {
    if (formData.title.trim()) {
      onSave(document._id, formData);
      setIsEditing(false);
      setPreviewHtml(false);
    }
  };

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // 删除标签
  const handleDeleteTag = (tagToDelete) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToDelete)
    }));
  };

  // 处理标签输入框回车
  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 打开删除确认对话框
  const handleDeleteClick = () => {
    setActionsMenuAnchorEl(null);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    onDelete(document._id);
    handleClose();
  };

  const handleOpenActionsMenu = (event) => {
    setActionsMenuAnchorEl(event.currentTarget);
  };

  const handleCloseActionsMenu = () => {
    setActionsMenuAnchorEl(null);
  };

  // 处理拖拽结束
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setReferencedDocuments((items) => {
        const oldIndex = items.findIndex((item) => 
          (item._id || item) === active.id
        );
        const newIndex = items.findIndex((item) => 
          (item._id || item) === over.id
        );

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
        if (referencedDocuments.some(doc => 
          (doc._id || doc) === id
        )) {
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
    }
  };

  // 处理保存引用
  const handleSaveReferences = async () => {
    if (!document || !onSaveReferences) return;
    
    try {
      const referencedIds = referencedDocuments.map(doc => 
        typeof doc === 'string' ? doc : doc._id
      );
      
      const updatedDocument = await onSaveReferences(document._id, referencedIds);
      
      // 更新本地状态
      setReferencedDocuments(updatedDocument.referencedDocumentIds || []);
      setOriginalReferencedIds(updatedDocument.referencedDocumentIds?.map(ref => 
        typeof ref === 'string' ? ref : ref._id
      ) || []);
      setIsReferencesDirty(false);
      setIsReferencesEditing(false);
    } catch (error) {
      console.error('保存引用失败:', error);
    }
  };

  // 处理重置引用
  const handleResetReferences = useCallback(() => {
    setReferencedDocuments(originalReferencedIds.map(id => ({ _id: id, title: '加载中...' })));
    setIsReferencesDirty(false);
    setIsReferencesEditing(false);
  }, [originalReferencedIds]);

  // 处理查看引用体详情
  const handleViewQuoteDetail = (quote) => {
    setSelectedQuote(quote);
    setQuoteDetailOpen(true);
  };

  // 处理加载更多引用体
  const handleLoadMoreQuotes = async () => {
    if (!document || !quotesPagination || !quotesPagination.hasNext || loadingQuotes) return;
    
    setLoadingQuotes(true);
    try {
      const nextPage = quotesPagination.page + 1;
      const response = await apiClient.get(
        `/documents/${document._id}/referencing-quotes`,
        {
          params: {
            page: nextPage,
            limit: 20,
            populate: 'title'
          }
        }
      );
      
      const data = response.data;
      setReferencingQuotes(prev => [...prev, ...data.data]);
      setQuotesPagination(data.pagination);
    } catch (error) {
      console.error('加载更多引用体失败:', error);
    } finally {
      setLoadingQuotes(false);
    }
  };

  // 处理ESC键关闭
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27 && open) {
        if (quoteDetailOpen) {
          setQuoteDetailOpen(false);
        } else if (deleteDialogOpen) {
          setDeleteDialogOpen(false);
        } else if (isEditing) {
          setIsEditing(false);
          // 恢复原始数据
          setFormData({
            title: document?.title || '',
            content: document?.content || '',
            tags: document?.tags || [],
            source: document?.source || '',
          });
          setTagInput('');
        } else if (isReferencesEditing) {
          setIsReferencesEditing(false);
          handleResetReferences();
        } else {
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleEsc, true); // 使用捕获阶段确保优先级
    return () => {
      window.removeEventListener('keydown', handleEsc, true);
    };
  }, [open, handleClose, isEditing, isReferencesEditing, deleteDialogOpen, document, quoteDetailOpen, handleResetReferences]);

  // 强制恢复 body 样式，确保关闭模态框后页面可以滚动
  useEffect(() => {
    // 当模态框关闭时，强制恢复 body 样式
    if (!open) {
      // 使用 window.document 避免与 props document 冲突
      const body = window.document?.body;
      if (body) {
        body.style.overflow = '';
        body.style.paddingRight = '';
        body.style.position = '';
        
        // 移除可能的 MUI 添加的类
        body.classList.remove('MuiModal-root');
        
        // 开发环境下输出调试信息
        if (process.env.NODE_ENV === 'development') {
          console.debug('DocumentDetailModal: 已恢复 body 样式');
        }
      }
    }
  }, [open]);

  // 确保在模态框打开且有文档数据时才渲染
  if (!open || !document) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="document-detail-modal"
        aria-describedby="document-detail-content"
        closeAfterTransition
        disableScrollLock
        keepMounted
        disableEnforceFocus
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <ModalContainer>
          {/* 标题区域 */}
          <HeaderBox>
            <Typography
              id="document-detail-modal"
              variant="h4"
              component="h2"
              sx={{
                fontWeight: 'bold',
                color: 'primary.main',
                lineHeight: 1.2,
                pr: 2,
              }}
            >
              {isEditing ? (
                <TextField
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  variant="standard"
                  fullWidth
                  sx={{
                    '& .MuiInput-underline:before': {
                      borderBottomColor: 'primary.main',
                    },
                    '& .MuiInput-underline:after': {
                      borderBottomColor: 'primary.main',
                    },
                  }}
                />
              ) : (
                document.title
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* 编辑/保存按钮 */}
              <IconButton
                onClick={isEditing ? handleSave : toggleEditMode}
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
                aria-controls={isActionsMenuOpen ? 'detail-actions-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={isActionsMenuOpen ? 'true' : undefined}
                sx={(theme) => ({
                  transition: theme.transitions.create('transform', {
                    duration: theme.transitions.duration.shortest,
                  }),
                  transform: isActionsMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
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
                <ExpandMoreIcon />
              </IconButton>

              {/* 关闭按钮 */}
              <IconButton
                onClick={handleClose}
                aria-label="关闭"
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
                <CloseIcon />
              </IconButton>
            </Box>
          </HeaderBox>

          <Menu
            id="detail-actions-menu"
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
            <MenuItem onClick={handleDeleteClick}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <DeleteIcon color="error" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="删除笔记"
                primaryTypographyProps={{
                  color: 'error.main',
                  fontWeight: 600,
                }}
              />
            </MenuItem>
          </Menu>
   
          {/* 内容区域 */}
          <ContentBox id="document-detail-content">
            {/* 左侧关系区域 */}
            <RelationsBox>
              {/* 引用此笔记的引用体 */}
              <RelationModule>
                <RelationModuleTitle variant="subtitle2">
                  引用此笔记的引用体
                </RelationModuleTitle>
                {referencingQuotes.length > 0 ? (
                  <>
                    <QuotesListContainer>
                      {referencingQuotes.map((quote, index) => (
                        <QuoteItem
                          key={quote._id}
                          onClick={() => handleViewQuoteDetail(quote)}
                        >
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle2" fontWeight="medium">
                              {quote.title}
                            </Typography>
                            {quote.tags && quote.tags.length > 0 && (
                              <Box sx={{ mt: 0.5 }}>
                                {quote.tags.slice(0, 2).map((tag, tagIndex) => (
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
                                {quote.tags.length > 2 && (
                                  <Chip
                                    label={`+${quote.tags.length - 2}`}
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
                            <Typography variant="caption" color="text.secondary">
                              更新于 {formatDate(quote.updatedAt)}
                            </Typography>
                          </Box>
                          <Tooltip title="查看引用体详情">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewQuoteDetail(quote);
                              }}
                              aria-label="查看引用体详情"
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </QuoteItem>
                      ))}
                    </QuotesListContainer>
                    {quotesPagination && quotesPagination.hasNext && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                        <Button
                          size="small"
                          onClick={handleLoadMoreQuotes}
                          disabled={loadingQuotes}
                          sx={{
                            borderRadius: 16,
                          }}
                        >
                          {loadingQuotes ? '加载中...' : '加载更多'}
                        </Button>
                      </Box>
                    )}
                  </>
                ) : (
                  <EmptyStateContainer>
                    <Typography variant="body2">
                      暂无引用此笔记的引用体
                    </Typography>
                  </EmptyStateContainer>
                )}
              </RelationModule>

              {/* 此笔记引用的笔记 */}
              <RelationModule>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <RelationModuleTitle variant="subtitle2">
                    此笔记引用的笔记
                  </RelationModuleTitle>
                  {!isReferencesEditing && (
                    <Tooltip title="编辑引用">
                      <IconButton
                        size="small"
                        onClick={() => setIsReferencesEditing(true)}
                        sx={{
                          borderRadius: 16,
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                
                {referencedDocuments.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={referencedDocuments.map(doc => doc._id || doc)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ReferencedDocsContainer>
                        {referencedDocuments.map((doc, index) => (
                          <SortableReferencedDocItem
                            key={doc._id || doc}
                            doc={doc}
                            index={index}
                            onRemove={handleRemoveReference}
                            isEditing={isReferencesEditing}
                          />
                        ))}
                      </ReferencedDocsContainer>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <EmptyStateContainer>
                    <Typography variant="body2">
                      暂无引用的笔记
                    </Typography>
                  </EmptyStateContainer>
                )}
                
                {isReferencesEditing && (
                  <ActionsContainer>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setIsDocumentPickerOpen(true)}
                      sx={{
                        borderRadius: 16,
                      }}
                    >
                      添加引用
                    </Button>
                    <Box>
                      {isReferencesDirty && (
                        <>
                          <Tooltip title="保存引用">
                            <IconButton
                              size="small"
                              onClick={handleSaveReferences}
                              sx={{
                                borderRadius: 16,
                                mr: 1,
                                color: 'success.main',
                              }}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="撤销更改">
                            <IconButton
                              size="small"
                              onClick={handleResetReferences}
                              sx={{
                                borderRadius: 16,
                                color: 'action.active',
                              }}
                            >
                              <UndoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="取消编辑">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setIsReferencesEditing(false);
                            handleResetReferences();
                          }}
                          sx={{
                            borderRadius: 16,
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ActionsContainer>
                )}
              </RelationModule>
            </RelationsBox>

            {/* 右侧内容区域 */}
            <RightContentBox>
              {/* 标签 */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  标签
                </Typography>
                {isEditing ? (
                  <TagsContainer>
                    {formData.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        onDelete={() => handleDeleteTag(tag)}
                        size="small"
                        sx={{
                          fontSize: '0.8rem',
                          borderRadius: 12, // 设置为 12px 圆角，符合辅助组件规范
                        }}
                      />
                    ))}
                    <TextField
                      size="small"
                      variant="standard"
                      placeholder="添加标签"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleTagInputKeyPress}
                      sx={{
                        minWidth: 120,
                        '& .MuiInput-underline:before': {
                          borderBottomColor: 'primary.main',
                        },
                        '& .MuiInput-underline:after': {
                          borderBottomColor: 'primary.main',
                        },
                      }}
                      InputProps={{
                        disableUnderline: true,
                        endAdornment: (
                          <IconButton
                            size="small"
                            onClick={handleAddTag}
                            disabled={!tagInput.trim()}
                            sx={{
                              borderRadius: 16,
                              padding: 0.5,
                            }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        ),
                      }}
                    />
                  </TagsContainer>
                ) : (
                  <TagsContainer>
                    {(document.tags || []).map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        variant="outlined"
                        size="small"
                        sx={{
                          fontSize: '0.8rem',
                          borderColor: 'secondary.main',
                          color: 'secondary.main',
                          '&:hover': {
                            backgroundColor: 'secondaryContainer.main',
                            color: 'secondaryContainer.contrastText',
                          },
                        }}
                      />
                    ))}
                  </TagsContainer>
                )}
              </Box>

              {/* 内容 */}
              <Box sx={{ mt: 3, flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">
                    内容
                  </Typography>
                  
                  {/* 内容类型切换 - 仅在非编辑模式且两种内容都存在时显示 */}
                  {!isEditing && document.content && document.htmlContent && (
                    <ToggleButtonGroup
                      value={contentType}
                      exclusive
                      onChange={(e, newType) => newType && setContentType(newType)}
                      size="small"
                      sx={{ mb: 1 }}
                    >
                      <ToggleButton value="html" sx={{ px: 1, py: 0.5 }}>
                        <HtmlIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        HTML
                      </ToggleButton>
                      <ToggleButton value="text" sx={{ px: 1, py: 0.5 }}>
                        <CodeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        文本
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                  
                  {/* HTML预览开关 - 仅在编辑HTML内容时显示 */}
                  {isEditing && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={previewHtml}
                          onChange={(e) => setPreviewHtml(e.target.checked)}
                          size="small"
                        />
                      }
                      label="预览HTML"
                      labelPlacement="start"
                      sx={{ ml: 0 }}
                    />
                  )}
                </Box>
                
                {isEditing ? (
                  <Box>
                    {/* 文本内容编辑 */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                        文本内容（可选）
                      </Typography>
                      <CodeEditor
                        value={formData.content}
                        onChange={(value) => handleChange({ target: { name: 'content', value } })}
                        language="markdown"
                        mode="autoSize"
                        minHeight={160}
                        maxHeight="40vh"
                        debounceMs={300}
                      />
                    </Box>
                    
                    {/* HTML内容编辑 */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                        HTML内容（可选）
                      </Typography>
                      <CodeEditor
                        value={formData.htmlContent}
                        onChange={(value) => handleChange({ target: { name: 'htmlContent', value } })}
                        language="html"
                        mode="autoSize"
                        minHeight={160}
                        maxHeight="40vh"
                        debounceMs={300}
                      />
                    </Box>
                    
                    {/* HTML预览 */}
                    {previewHtml && formData.htmlContent && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          HTML预览
                        </Typography>
                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <HtmlSandboxRenderer
                            content={formData.htmlContent}
                            cacheKey={`preview-${Date.now()}`}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 100 }}>
                    {selectedDocumentStatus === 'loading' || (!document.content && !document.htmlContent) ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" color="text.secondary">
                          正在加载内容...
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        {/* 显示HTML内容 */}
                        {contentType === 'html' && document.htmlContent && (
                          <HtmlSandboxRenderer
                            content={document.htmlContent}
                            cacheKey={document._id && document.updatedAt ? `${document._id}|html|${document.updatedAt}` : null}
                          />
                        )}
                        
                        {/* 显示文本内容 */}
                        {contentType === 'text' && (
                          <MarkdownInlineRenderer
                            content={document.content}
                            cacheKey={document._id && document.updatedAt ? `${document._id}|text|${document.updatedAt}` : null}
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
                                {document.content}
                              </Typography>
                            }
                          />
                        )}
                        
                        {/* 空状态 */}
                        {((contentType === 'html' && !document.htmlContent) ||
                          (contentType === 'text' && !document.content)) && (
                          <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 4,
                            color: 'text.secondary'
                          }}>
                            <Typography variant="body2">
                              {contentType === 'html' ? '暂无HTML内容' : '暂无文本内容'}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </RightContentBox>
          </ContentBox>

          {/* 元信息 */}
          <MetaInfoContainer>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Box component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                  来源:
                </Box>
                {isEditing ? (
                  <TextField
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    variant="standard"
                    size="small"
                    sx={{
                      '& .MuiInput-underline:before': {
                        borderBottomColor: 'primary.main',
                      },
                      '& .MuiInput-underline:after': {
                        borderBottomColor: 'primary.main',
                      },
                    }}
                  />
                ) : (
                  document.source
                )}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Box component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                  更新时间:
                </Box>
                {formatDate(document.updatedAt)}
              </Typography>
            </Box>
          </MetaInfoContainer>
        </ModalContainer>
      </Modal>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">确认删除</DialogTitle>
        <DialogContent id="delete-dialog-description">
          <Typography>
            确定要删除笔记 "{document.title}" 吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 文档选择对话框 */}
      <DocumentPickerDialog
        open={isDocumentPickerOpen}
        handleClose={() => setIsDocumentPickerOpen(false)}
        onConfirm={handleAddReferences}
        excludeIds={[document._id, ...referencedDocuments.map(doc => 
          typeof doc === 'string' ? doc : doc._id
        )]}
      />

      {/* 引用体详情对话框 */}
      {selectedQuote && (
        <QuoteDetailModal
          open={quoteDetailOpen}
          handleClose={() => setQuoteDetailOpen(false)}
          quote={selectedQuote}
        />
      )}
    </>
  );
};

export default DocumentDetailModal;