import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Paper,
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
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ListItemIcon from '@mui/material/ListItemIcon';
import apiClient from '../services/apiClient';
import ListItemText from '@mui/material/ListItemText';
import NoteIcon from '@mui/icons-material/Note';
import LaunchIcon from '@mui/icons-material/Launch';
import UndoIcon from '@mui/icons-material/Undo';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CodeIcon from '@mui/icons-material/Code';
import HtmlIcon from '@mui/icons-material/Html';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CollapsibleRelationModule from './CollapsibleRelationModule';
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
import { useDispatch } from 'react-redux';
import DocumentPickerDialog from './DocumentPickerDialog';
import AttachmentPickerDialog from './AttachmentPickerDialog';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';
import HtmlSandboxRenderer from './HtmlSandboxRenderer';
import { openAttachmentWindowAndFetch, openQuoteWindowAndFetch } from '../store/windowsSlice';
import { getAttachmentMetadata } from '../services/attachments';
import QuoteFormModal from './QuoteFormModal';
import { createQuote } from '../store/quotesSlice';
import CodeEditor from './CodeEditor';

// 内容区域
const ContentBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  flexGrow: 1,
  overflow: 'hidden',
  minWidth: 0, // 允许flex子项收缩
}));

// 左侧关系区域
const RelationsBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isCollapsed'
})(({ theme, isCollapsed }) => ({
  width: isCollapsed ? 0 : '40%',
  minWidth: isCollapsed ? 0 : 300,
  padding: isCollapsed ? 0 : theme.spacing(2),
  borderRight: isCollapsed ? 'none' : `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  overflowY: 'auto',
  transition: 'width 0.3s ease, padding 0.3s ease, border-right 0.3s ease',
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
  width: '100%',
  padding: theme.spacing(3),
  overflowY: 'auto',
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0, // 允许flex子项收缩
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
  // 移除 maxHeight: 200,
  // 移除 overflowY: 'auto',
  // 移除滚动条相关样式
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
  // 移除 maxHeight: 200,
  // 移除 overflowY: 'auto',
  // 移除滚动条相关样式
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

// 引用附件列表容器
const ReferencedAttachmentsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  // 移除 maxHeight: 200,
  // 移除 overflowY: 'auto',
  // 移除滚动条相关样式
}));

// 引用附件项
const ReferencedAttachmentItem = styled(Box)(({ theme }) => ({
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

// 编辑器容器 - 大屏使用 Grid，小屏使用 Flex
const EditorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  overflow: 'visible',
  minWidth: 0, // 允许flex子项收缩
  [theme.breakpoints.up('lg')]: {
    display: 'grid',
    gridTemplateColumns: '60% 40%',
    gridTemplateRows: 'auto 1fr',
    gridTemplateAreas: `
      "editor preview-header"
      "editor preview-content"
    `,
    gap: 0,
  },
  [theme.breakpoints.down('lg')]: {
    flexDirection: 'column',
  },
}));

// 编辑器中间栏
const EditorMiddleColumn = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderRight: `1px solid ${theme.palette.border}`,
  overflowY: 'visible',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0, // 允许flex子项收缩
  [theme.breakpoints.up('lg')]: {
    gridArea: 'editor',
    borderRight: `1px solid ${theme.palette.border}`,
    borderBottom: 'none',
  },
  [theme.breakpoints.down('lg')]: {
    borderRight: 'none',
    borderBottom: `1px solid ${theme.palette.border}`,
  },
}));

// 编辑器右侧栏
const EditorRightColumn = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  overflowY: 'visible',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0, // 允许flex子项收缩
  [theme.breakpoints.up('lg')]: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto 1fr',
    gridTemplateAreas: `
      "preview-header"
      "preview-content"
    `,
    gap: theme.spacing(1),
  },
  [theme.breakpoints.down('lg')]: {
    display: props => props.showPreview ? 'flex' : 'none',
  },
}));

// 预览区域标题
const PreviewHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.border}`,
  [theme.breakpoints.up('lg')]: {
    gridArea: 'preview-header',
    marginBottom: 0,
  },
  [theme.breakpoints.down('lg')]: {
    marginBottom: theme.spacing(1),
  },
}));

// 预览内容区域
const PreviewContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'visible',
  border: `1px solid ${theme.palette.border}`,
  borderRadius: 12,
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  minWidth: 0, // 允许flex子项收缩
  [theme.breakpoints.up('lg')]: {
    gridArea: 'preview-content',
  },
}));

// 小屏预览切换按钮
const PreviewToggleContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.border}`,
  display: 'flex',
  justifyContent: 'center',
  [theme.breakpoints.up('lg')]: {
    display: 'none',
  },
}));

// 可排序的引用文档项组件
const SortableReferencedDocItem = ({ doc, index, onRemove, isEditing, onViewDocument }) => {
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
      onClick={() => !isEditing && onViewDocument && onViewDocument(doc)}
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
        <Tooltip title="查看笔记详情">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewDocument) onViewDocument(doc);
            }}
            aria-label="查看笔记详情"
          >
            <LaunchIcon fontSize="small" />
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
      </Box>
    </ReferencedDocItem>
  );
};

// 可排序的引用附件项组件
const SortableReferencedAttachmentItem = ({ attachment, index, onRemove, isEditing, onViewAttachment, onCopyAttachmentLink }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attachment._id || attachment });

  const [copyTooltip, setCopyTooltip] = useState('复制链接');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取附件类别显示名称
  const getCategoryLabel = (category) => {
    const categoryMap = {
      image: '图片',
      video: '视频',
      document: '文档',
      script: '程序与脚本'
    };
    return categoryMap[category] || category;
  };

  // 处理复制附件链接
  const handleCopyAction = async (e) => {
    e.stopPropagation();
    const attachmentId = attachment._id || attachment;
    const link = `attach://${attachmentId}`;
    
    try {
      // 优先使用现代 clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        // 降级方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = link;
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
      setTimeout(() => setCopyTooltip('复制链接'), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      setCopyTooltip('复制失败');
      setTimeout(() => setCopyTooltip('复制链接'), 2000);
    }
  };

  return (
    <ReferencedAttachmentItem
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: isEditing ? 'grab' : 'pointer',
        '&:active': { cursor: isEditing ? 'grabbing' : 'pointer' }
      }}
      onClick={() => !isEditing && onViewAttachment && onViewAttachment(attachment._id)}
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
      <AttachFileIcon sx={{ mr: 1, color: 'primary.main' }} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight="medium" noWrap>
          {attachment.originalName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <Chip
            label={getCategoryLabel(attachment.category)}
            size="small"
            variant="outlined"
            sx={{ height: 18, fontSize: '0.6rem' }}
          />
          <Typography variant="caption" color="text.secondary" noWrap>
            {formatFileSize(attachment.size)}
          </Typography>
        </Box>
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
              aria-label="复制链接"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="查看附件详情">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewAttachment) onViewAttachment(attachment);
            }}
            aria-label="查看附件详情"
          >
            <LaunchIcon fontSize="small" />
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
      </Box>
    </ReferencedAttachmentItem>
  );
};

// 自适应 textarea 高度的 hook - 已废弃，改用 CodeEditor
// const useAutoResizeTextarea = () => {
//   const textareaRef = useRef(null);
//
//   const resizeTextarea = useCallback(() => {
//     const textarea = textareaRef.current;
//     if (textarea) {
//       // 重置高度以获取正确的 scrollHeight
//       textarea.style.height = '0px';
//       // 设置最小高度为 100px，最大高度为容器的可用高度
//       const newHeight = Math.max(100, Math.min(textarea.scrollHeight, textarea.parentElement.clientHeight - 32));
//       textarea.style.height = `${newHeight}px`;
//     }
//   }, []);
//
//   return { textareaRef, resizeTextarea };
// };

const DocumentDetailContent = ({
  document,
  onSave,
  onDelete,
  onSaveReferences,
  onSaveAttachmentReferences,
  onViewDocument,
  selectedDocumentStatus,
  isSidebarCollapsed,
  onEditModeChange,
  externalTitle,
  onViewDisplayChange,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const [isEditing, setIsEditing] = useState(false);
  // const { textareaRef, resizeTextarea } = useAutoResizeTextarea(); // 已废弃，改用 CodeEditor
  const [isReferencesEditing, setIsReferencesEditing] = useState(false);
  const [isAttachmentReferencesEditing, setIsAttachmentReferencesEditing] = useState(false);
  const [contentType, setContentType] = useState('html'); // 'html' 或 'text'
  const [editorType, setEditorType] = useState('markdown'); // 'markdown' 或 'html'
  const [editorUIMode, setEditorUIMode] = useState('code'); // 'code' 或 'text'
  const [showPreview, setShowPreview] = useState(isLargeScreen);
  const [previewContent, setPreviewContent] = useState('');
  const previewTimeoutRef = useRef(null);
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
  const [quoteFormModalOpen, setQuoteFormModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // 引用列表相关状态
  const [referencedDocuments, setReferencedDocuments] = useState([]);
  const [originalReferencedIds, setOriginalReferencedIds] = useState([]);
  const [isReferencesDirty, setIsReferencesDirty] = useState(false);
  const [isDocumentPickerOpen, setIsDocumentPickerOpen] = useState(false);
  const [referencingQuotes, setReferencingQuotes] = useState([]);
  const [quotesPagination, setQuotesPagination] = useState(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  
  // 展开/收起状态管理
  const [quotesExpanded, setQuotesExpanded] = useState(true);
  const [referencesExpanded, setReferencesExpanded] = useState(true);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(true);
  
  // 引用附件相关状态
  const [referencedAttachments, setReferencedAttachments] = useState([]);
  const [originalAttachmentIds, setOriginalAttachmentIds] = useState([]);
  const [isAttachmentReferencesDirty, setIsAttachmentReferencesDirty] = useState(false);
  const [isAttachmentPickerOpen, setIsAttachmentPickerOpen] = useState(false);
  
  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
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
      setIsEditing(false);
      setTagInput('');
      setIsEditing(false);
      
      // 设置默认显示类型
      if (document.htmlContent) {
        setContentType('html');
      } else {
        setContentType('text');
      }
      
      // 设置默认编辑器类型
      if (document.htmlContent) {
        setEditorType('html');
      } else {
        setEditorType('markdown');
      }
      
      // 初始化预览内容
      if (document.htmlContent) {
        setPreviewContent(document.htmlContent);
      } else {
        setPreviewContent(document.content || '');
      }
      
      // 初始化引用列表
      const refs = document.referencedDocumentIds || [];
      setReferencedDocuments(refs);
      setOriginalReferencedIds(refs.map(ref => typeof ref === 'string' ? ref : ref._id));
      setIsReferencesDirty(false);
      setIsReferencesEditing(false);
      
      // 初始化引用附件列表
      const attachmentRefs = document.referencedAttachmentIds || [];
      const normalizedAttachmentRefs = attachmentRefs.map(ref => {
        if (typeof ref === 'string') {
          return { _id: ref, originalName: '加载中...', category: 'image', mimeType: '', size: 0 };
        }
        return ref;
      });
      setReferencedAttachments(normalizedAttachmentRefs);
      setOriginalAttachmentIds(attachmentRefs.map(ref => typeof ref === 'string' ? ref : ref._id));
      setIsAttachmentReferencesDirty(false);
      
      // 初始化引用此文档的引用体列表
      setReferencingQuotes(document.referencingQuotes || []);
      setQuotesPagination(document.referencingQuotesPagination || null);
    }
  }, [document]);

  // 监听显示内容变化，通知父组件（用于注入功能）
  useEffect(() => {
    if (!onViewDisplayChange) return;
    
    let displayContent = '';
    let displaySubtype = 'text';
    
    if (isEditing) {
      // 编辑模式：根据当前编辑器类型决定内容
      if (editorType === 'html') {
        displayContent = formData.htmlContent || '';
        displaySubtype = 'html';
      } else {
        displayContent = formData.content || '';
        displaySubtype = 'text';
      }
    } else {
      // 只读模式：根据当前显示类型决定内容
      if (contentType === 'html') {
        displayContent = document.htmlContent || '';
        displaySubtype = 'html';
      } else {
        displayContent = document.content || '';
        displaySubtype = 'text';
      }
    }
    
    onViewDisplayChange({
      content: displayContent,
      subtype: displaySubtype
    });
  }, [isEditing, editorType, contentType, formData.content, formData.htmlContent, document.content, document.htmlContent, onViewDisplayChange]);

  // 响应式处理预览显示
  useEffect(() => {
    setShowPreview(isLargeScreen);
  }, [isLargeScreen]);

  // 更新预览内容（带节流）
  const updatePreviewContent = useCallback(() => {
    if (editorType === 'markdown') {
      setPreviewContent(formData.content);
    } else {
      setPreviewContent(formData.htmlContent);
    }
  }, [editorType, formData.content, formData.htmlContent]);

  // 初始化预览内容
  useEffect(() => {
    updatePreviewContent();
  }, [updatePreviewContent]);

  // 处理内容变化，带节流更新预览
  const handleContentChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除该字段的错误
    // if (errors[name]) {
    //   setErrors(prev => ({
    //     ...prev,
    //     [name]: ''
    //   }));
    // }

    // 节流更新预览内容
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    previewTimeoutRef.current = setTimeout(() => {
      updatePreviewContent();
    }, 300);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  // 监听容器大小变化和进入编辑模式时调整 textarea 高度 - 已废弃，CodeEditor 自动处理
  // useEffect(() => {
  //   if (isEditing && textareaRef.current) {
  //     // 初始调整
  //     setTimeout(resizeTextarea, 0);
  //
  //     // 监听容器大小变化
  //     let resizeObserver;
  //     if (window.ResizeObserver) {
  //       resizeObserver = new ResizeObserver(() => {
  //         setTimeout(resizeTextarea, 0);
  //       });
  //
  //       // 监听 textarea 的父容器
  //       const parentElement = textareaRef.current.parentElement;
  //       if (parentElement) {
  //         resizeObserver.observe(parentElement);
  //       }
  //     }
  //
  //     // 监听窗口大小变化
  //     const handleResize = () => {
  //       setTimeout(resizeTextarea, 0);
  //     };
  //     window.addEventListener('resize', handleResize);
  //
  //     return () => {
  //       window.removeEventListener('resize', handleResize);
  //       if (resizeObserver && textareaRef.current?.parentElement) {
  //         resizeObserver.unobserve(textareaRef.current.parentElement);
  //       }
  //     };
  //   }
  // }, [isEditing, resizeTextarea]);

  // 处理表单字段变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 同步外部标题到表单数据（编辑模式下）
  useEffect(() => {
    if (isEditing && externalTitle !== undefined && externalTitle !== formData.title) {
      setFormData(prev => ({
        ...prev,
        title: externalTitle
      }));
    }
  }, [externalTitle, isEditing, formData.title]);

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
      
      // 恢复默认编辑器类型
      if (document.htmlContent) {
        setEditorType('html');
      } else {
        setEditorType('markdown');
      }
      
      // 恢复默认预览内容
      if (document.htmlContent) {
        setPreviewContent(document.htmlContent);
      } else {
        setPreviewContent(document.content || '');
      }
    } else {
      // 进入编辑模式时，根据当前内容设置编辑器类型
      if (document.htmlContent) {
        setEditorType('html');
      } else {
        setEditorType('markdown');
      }
      
      // 初始化预览内容
      if (editorType === 'markdown') {
        setPreviewContent(formData.content);
      } else {
        setPreviewContent(formData.htmlContent);
      }
      
      // 进入编辑模式时调整 textarea 高度 - 已废弃，CodeEditor 自动处理
      // if (!isEditing) {
      //   setTimeout(resizeTextarea, 0);
      // }
    }
    const newIsEditing = !isEditing;
    setIsEditing(newIsEditing);
    
    // 通知父组件编辑模式变化
    if (onEditModeChange) {
      onEditModeChange(newIsEditing);
    }
  };

  // 保存编辑
  const handleSave = () => {
    if (formData.title.trim()) {
      onSave(document._id, formData);
      setIsEditing(false);
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
  const handleViewQuoteDetail = async (quote) => {
    try {
      // 使用新的引用体窗口系统
      await dispatch(openQuoteWindowAndFetch({
        quoteId: quote._id,
        label: quote.title || '查看引用体详情',
        source: 'document-detail'
      })).unwrap();
    } catch (error) {
      console.error('打开引用体窗口失败:', error);
    }
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

  // 处理附件拖拽结束
  const handleAttachmentDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setReferencedAttachments((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
      setIsAttachmentReferencesDirty(true);
    }
  };

  // 处理添加附件引用
  const handleAddAttachmentReferences = async (selectedIds) => {
    console.log('[handleAddAttachmentReferences] 开始添加附件引用, selectedIds:', selectedIds);
    try {
      // 获取新添加的附件详情
      const newAttachments = [];
      for (const id of selectedIds) {
        // 如果已经存在，跳过（重复添加去重）
        if (referencedAttachments.some(att => att._id === id)) {
          console.log(`[handleAddAttachmentReferences] 附件 ${id} 已存在，跳过`);
          continue;
        }
        
        try {
          console.log(`[handleAddAttachmentReferences] 正在获取附件 ${id} 的元数据`);
          const metadataResponse = await getAttachmentMetadata(id);
          console.log(`[handleAddAttachmentReferences] 获取附件 ${id} 元数据成功:`, metadataResponse.data);
          newAttachments.push(metadataResponse.data);
        } catch (error) {
          console.error(`[handleAddAttachmentReferences] 获取附件 ${id} 详情失败:`, error);
        }
      }
      
      console.log(`[handleAddAttachmentReferences] 成功获取 ${newAttachments.length} 个附件，准备添加到列表`);
      // 添加到引用列表
      setReferencedAttachments(prev => {
        const updated = [...prev, ...newAttachments];
        console.log(`[handleAddAttachmentReferences] 更新后的引用附件列表:`, updated);
        return updated;
      });
      setIsAttachmentReferencesDirty(true);
      console.log(`[handleAddAttachmentReferences] 设置附件引用为脏状态`);
    } catch (error) {
      console.error('[handleAddAttachmentReferences] 添加附件引用失败:', error);
    }
  };

  // 处理移除附件引用
  const handleRemoveAttachmentReference = (index) => {
    setReferencedAttachments(prev => prev.filter((_, i) => i !== index));
    setIsAttachmentReferencesDirty(true);
  };

  // 处理保存附件引用列表
  const handleSaveAttachmentReferences = async () => {
    if (!isAttachmentReferencesDirty || !onSaveAttachmentReferences) return;
    
    try {
      const referencedAttachmentIds = referencedAttachments.map(att => att._id);
      await onSaveAttachmentReferences(document._id, referencedAttachmentIds);
      
      setOriginalAttachmentIds(referencedAttachmentIds);
      setIsAttachmentReferencesDirty(false);
    } catch (error) {
      console.error('保存附件引用列表失败:', error);
    }
  };

  // 处理重置附件引用列表
  const handleResetAttachmentReferences = () => {
    // 恢复到原始状态
    const refs = document.referencedAttachmentIds || [];
    const normalizedRefs = refs.map(ref => {
      if (typeof ref === 'string') {
        return { _id: ref, originalName: '加载中...', category: 'image', mimeType: '', size: 0 };
      }
      return ref;
    });
    
    setReferencedAttachments(normalizedRefs);
    setIsAttachmentReferencesDirty(false);
  };

  // 处理查看附件详情
  const handleViewAttachment = async (attachmentId) => {
    try {
      // 打开附件详情窗口
      await dispatch(openAttachmentWindowAndFetch({
        attachmentId,
        label: '查看附件详情',
        source: 'document-detail'
      })).unwrap();
    } catch (error) {
      console.error('打开附件窗口失败:', error);
    }
  };

  // 处理打开引用体创建模态框
  const handleOpenQuoteFormModal = () => {
    setActionsMenuAnchorEl(null);
    setQuoteFormModalOpen(true);
  };

  // 处理关闭引用体创建模态框
  const handleCloseQuoteFormModal = () => {
    setQuoteFormModalOpen(false);
  };

  // 处理创建引用体
  const handleCreateQuote = async (quoteData) => {
    try {
      await dispatch(createQuote(quoteData)).unwrap();
      setSuccessMessage('引用体创建成功');
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  // 确保在文档数据存在时才渲染
  if (!document) return null;

  return (
    <>
      <ContentBox id="document-detail-content">
        {/* 左侧关系区域 */}
        <RelationsBox isCollapsed={isSidebarCollapsed}>
          {/* 引用此笔记的引用体 */}
          <CollapsibleRelationModule
            title="引用此笔记的引用体"
            count={referencingQuotes.length}
            expanded={quotesExpanded}
            onExpandedChange={setQuotesExpanded}
          >
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
          </CollapsibleRelationModule>

          {/* 此笔记引用的笔记 */}
          <CollapsibleRelationModule
            title="此笔记引用的笔记"
            count={referencedDocuments.length}
            expanded={referencesExpanded}
            onExpandedChange={setReferencesExpanded}
            actions={
              isReferencesEditing ? (
                <>
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
                  {isReferencesDirty && (
                    <>
                      <Tooltip title="保存引用">
                        <IconButton
                          size="small"
                          onClick={handleSaveReferences}
                          sx={{
                            borderRadius: 16,
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
                </>
              ) : (
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
              )
            }
          >
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
                        onViewDocument={onViewDocument}
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
            
          </CollapsibleRelationModule>

          {/* 此笔记引用的附件 */}
          <CollapsibleRelationModule
            title="引用的附件"
            count={referencedAttachments.length}
            expanded={attachmentsExpanded}
            onExpandedChange={setAttachmentsExpanded}
            actions={
              isAttachmentReferencesEditing ? (
                <>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setIsAttachmentPickerOpen(true)}
                    sx={{
                      borderRadius: 16,
                    }}
                  >
                    添加附件
                  </Button>
                  {isAttachmentReferencesDirty && onSaveAttachmentReferences && (
                    <>
                      <Tooltip title="保存附件">
                        <IconButton
                          size="small"
                          onClick={handleSaveAttachmentReferences}
                          sx={{
                            borderRadius: 16,
                            color: 'success.main',
                          }}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="重置附件">
                        <IconButton
                          size="small"
                          onClick={handleResetAttachmentReferences}
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
                        setIsAttachmentReferencesEditing(false);
                        handleResetAttachmentReferences();
                      }}
                      sx={{
                        borderRadius: 16,
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Tooltip title="编辑引用">
                  <IconButton
                    size="small"
                    onClick={() => setIsAttachmentReferencesEditing(true)}
                    sx={{
                      borderRadius: 16,
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )
            }
          >
            
            {referencedAttachments.length === 0 ? (
              <EmptyStateContainer>
                <Typography variant="body2">
                  暂无引用的附件
                </Typography>
              </EmptyStateContainer>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleAttachmentDragEnd}
              >
                <SortableContext
                  items={referencedAttachments.map(att => att._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ReferencedAttachmentsContainer>
                    {referencedAttachments.map((attachment, index) => (
                      <SortableReferencedAttachmentItem
                        key={attachment._id}
                        attachment={attachment}
                        index={index}
                        onRemove={handleRemoveAttachmentReference}
                        isEditing={isAttachmentReferencesEditing}
                        onViewAttachment={handleViewAttachment}
                        onCopyAttachmentLink={(attachmentId) => {
                          navigator.clipboard.writeText(`attach://${attachmentId}`);
                        }}
                      />
                    ))}
                  </ReferencedAttachmentsContainer>
                </SortableContext>
              </DndContext>
            )}
          </CollapsibleRelationModule>
        </RelationsBox>

        {/* 右侧内容区域 */}
        <RightContentBox>
          {/* 编辑模式和非编辑模式下的顶部按钮栏 */}
          <Box sx={{
            position: 'sticky',
            top: -24, // 修改为负值，向上移动24px（相当于RightContentBox的padding值）
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            p: 1,
            backgroundColor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}>
            {/* 左侧按钮组 */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* 编辑/保存按钮 */}
              <Button
                variant={isEditing ? "contained" : "outlined"}
                size="small"
                startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
                onClick={isEditing ? handleSave : toggleEditMode}
                sx={{
                  borderRadius: 16,
                  fontSize: '0.8rem',
                  px: 2,
                  py: 0.5,
                  minWidth: 'auto',
                  fontWeight: 'medium',
                }}
              >
                {isEditing ? '保存' : '编辑'}
              </Button>
              
              {/* 编辑模式下的取消按钮 */}
              {isEditing && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={toggleEditMode}
                  sx={{
                    borderRadius: 16,
                    fontSize: '0.8rem',
                    px: 2,
                    py: 0.5,
                    minWidth: 'auto',
                    fontWeight: 'medium',
                  }}
                >
                  取消
                </Button>
              )}
            </Box>
            
            {/* 右侧按钮组 */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* 非编辑模式下的更多操作按钮 */}
              {!isEditing && (
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
              )}
              
              {/* 编辑模式下的UI模式切换按钮 */}
              {isEditing && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={editorUIMode === 'code' ? <EditNoteIcon /> : <CodeIcon />}
                  onClick={() => setEditorUIMode(editorUIMode === 'code' ? 'text' : 'code')}
                  sx={{
                    borderRadius: 16,
                    fontSize: '0.8rem',
                    px: 2,
                    py: 0.5,
                    minWidth: 'auto',
                    fontWeight: 'medium',
                  }}
                >
                  {editorUIMode === 'code' ? '切换到文本编辑器' : '切换到代码编辑器'}
                </Button>
              )}
              
              {/* 非编辑模式下的内容类型切换按钮 */}
              {!isEditing && document.content && document.htmlContent && (
                <ToggleButtonGroup
                  value={contentType}
                  exclusive
                  onChange={(e, newType) => newType && setContentType(newType)}
                  size="small"
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
            </Box>
          </Box>
          
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
              
              {/* 编辑模式：Markdown/HTML 切换 */}
              {isEditing && (
                <ToggleButtonGroup
                  value={editorType}
                  exclusive
                  onChange={(e, newType) => newType && setEditorType(newType)}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      borderRadius: 16,
                      textTransform: 'none',
                      fontWeight: 'bold',
                    },
                    '& .MuiToggleButton-root.Mui-selected': {
                      color: 'white',
                      backgroundColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ToggleButton value="markdown" aria-label="markdown">
                    Markdown
                  </ToggleButton>
                  <ToggleButton value="html" aria-label="html">
                    HTML
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
              
              {/* HTML/文本切换按钮已移动到顶部按钮栏 */}
            </Box>
            
            {isEditing ? (
              <EditorContainer>
                {/* 小屏预览切换按钮 */}
                {!isLargeScreen && (
                  <PreviewToggleContainer>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showPreview}
                          onChange={(e) => setShowPreview(e.target.checked)}
                          icon={<VisibilityOffIcon />}
                          checkedIcon={<VisibilityIcon />}
                        />
                      }
                      label="显示预览"
                    />
                  </PreviewToggleContainer>
                )}
                
                {/* 大屏预览头部 - 放在 Grid 的顶部右列 */}
                {isLargeScreen && (
                  <PreviewHeader>
                    <Typography variant="h6">
                      实时预览
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {editorType === 'markdown' ? 'Markdown' : 'HTML'}
                    </Typography>
                  </PreviewHeader>
                )}
                
                {/* 左侧编辑器 */}
                <EditorMiddleColumn>
                  {editorUIMode === 'code' ? (
                    <CodeEditor
                      value={editorType === 'markdown' ? formData.content : formData.htmlContent}
                      onChange={(value) => handleContentChange(editorType === 'markdown' ? 'content' : 'htmlContent', value)}
                      language={editorType === 'markdown' ? 'markdown' : 'html'}
                      mode="fillContainer"
                      minHeight={200}
                      debounceMs={300}
                    />
                  ) : (
                    <TextField
                      value={editorType === 'markdown' ? formData.content : formData.htmlContent}
                      onChange={(e) => handleContentChange(editorType === 'markdown' ? 'content' : 'htmlContent', e.target.value)}
                      fullWidth
                      variant="outlined"
                      multiline
                      minRows={6}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 16,
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          lineHeight: 1.5,
                        },
                      }}
                      placeholder={editorType === 'markdown' ? '请输入 Markdown 内容...' : '请输入 HTML 内容...'}
                    />
                  )}
                </EditorMiddleColumn>
                
                {/* 右侧预览 */}
                <EditorRightColumn showPreview={showPreview}>
                  {/* 小屏预览头部 */}
                  {!isLargeScreen && (
                    <PreviewHeader>
                      <Typography variant="h6">
                        实时预览
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setShowPreview(!showPreview)}
                        aria-label={showPreview ? '隐藏预览' : '显示预览'}
                      >
                        {showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </PreviewHeader>
                  )}
                  <PreviewContent>
                    {editorType === 'markdown' ? (
                      <MarkdownInlineRenderer content={previewContent} />
                    ) : (
                      <HtmlSandboxRenderer content={previewContent} />
                    )}
                  </PreviewContent>
                </EditorRightColumn>
              </EditorContainer>
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
              创建时间:
            </Box>
            {formatDate(document.createdAt)}
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
        {/* 编辑按钮和更多操作按钮已移到顶部栏 */}
      </MetaInfoContainer>

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
        <MenuItem onClick={handleOpenQuoteFormModal}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <FormatQuoteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="基于此笔记创建引用体"
            primaryTypographyProps={{
              fontWeight: 600,
            }}
          />
        </MenuItem>
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

      {/* 文档选择对话框 */}
      <DocumentPickerDialog
        open={isDocumentPickerOpen}
        handleClose={() => setIsDocumentPickerOpen(false)}
        onConfirm={handleAddReferences}
        excludeIds={referencedDocuments.map(doc => typeof doc === 'string' ? doc : doc._id)}
        hiddenIds={[document._id]} // 隐藏当前笔记，防止自我引用
      />
      
      {/* 附件选择对话框 */}
      <AttachmentPickerDialog
        open={isAttachmentPickerOpen}
        onClose={() => setIsAttachmentPickerOpen(false)}
        onConfirm={handleAddAttachmentReferences}
        excludeIds={referencedAttachments.map(att => typeof att === 'string' ? att : att._id)}
        initialSelectedIds={referencedAttachments.map(att => typeof att === 'string' ? att : att._id)}
      />


      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          确认删除
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
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

      {/* 创建引用体模态框 */}
      <QuoteFormModal
        open={quoteFormModalOpen}
        handleClose={handleCloseQuoteFormModal}
        initialDocumentId={document._id}
        onSave={handleCreateQuote}
      />

      {/* 成功提示 */}
      {successMessage && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
        >
          <Alert
            severity="success"
            onClose={() => setSuccessMessage('')}
            sx={{
              borderRadius: 16,
            }}
          >
            {successMessage}
          </Alert>
        </Box>
      )}
    </>
  );
};

export default DocumentDetailContent;