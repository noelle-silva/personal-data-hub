import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import apiClient from '../services/apiClient';
import { styled } from '@mui/material/styles';
import {
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
  AttachFile as AttachFileIcon,
  ContentCopy as ContentCopyIcon,
  FormatQuote as FormatQuoteIcon,
  Code as CodeIcon,
  EditNote as EditNoteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import CollapsibleRelationModule from './CollapsibleRelationModule';
import QuoteCopyButton from './QuoteCopyButton';
import DocumentCopyButton from './DocumentCopyButton';
import AttachmentCopyButton from './AttachmentCopyButton';
import { useDispatch } from 'react-redux';
import {
  fetchDocumentById,
  openWindowAndFetch,
  openQuoteWindowAndFetch,
  openAttachmentWindowAndFetch
} from '../store/windowsSlice';
import DocumentPickerDialog from './DocumentPickerDialog';
import AttachmentPickerDialog from './AttachmentPickerDialog';
import QuotePickerDialog from './QuotePickerDialog';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';
import CodeEditor from './CodeEditor';
import MarkdownPreview from './MarkdownPreview';
import { useMediaQuery } from '@mui/material';
import DocumentFormModal from './DocumentFormModal';
import QuoteFormModal from './QuoteFormModal';
import { createDocument as createDocumentService } from '../services/documents';
import { createQuote } from '../store/quotesSlice'; // 添加 createQuote 导入
// import { updateQuote } from '../store/quotesSlice'; // 改为使用 dispatch 方式
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
import { getAttachmentMetadata } from '../services/attachments';

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
  borderRight: isCollapsed ? 'none' : `1px solid ${theme.palette.border}`,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  overflowY: 'auto',
  overscrollBehavior: 'contain',
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
  overscrollBehavior: 'contain',
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

// 引用引用体列表容器
const ReferencedQuotesContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  // 移除 maxHeight: 200,
  // 移除 overflowY: 'auto',
  // 移除滚动条相关样式
}));

// 引用引用体项
const ReferencedQuoteItem = styled(Box)(({ theme }) => ({
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

// 左侧栏容器样式 - 已弃用，使用RelationsBox替代
const LeftPanelContainer = styled(Box)(({ theme }) => ({
  width: '40%',
  minWidth: 300,
  paddingRight: theme.spacing(2),
  height: '100%',
  overflowY: 'auto',
  borderRight: `1px solid ${theme.palette.border}`,
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
  width: '60%',
  paddingLeft: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

// 右侧栏内容区域样式
const RightPanelContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
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

// 样式化的引用附件标题
const ReferencedAttachmentsTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(2),
  color: theme.palette.primary.main,
}));

// 样式化的引用附件列表
const ReferencedAttachmentsList = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(2),
}));

// 样式化的引用引用体标题
const ReferencedQuotesTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(2),
  color: theme.palette.primary.main,
}));

// 样式化的引用引用体列表
const ReferencedQuotesList = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(2),
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

// 编辑器左侧栏
const EditorLeftColumn = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderRight: `1px solid ${theme.palette.border}`,
  overflowY: 'visible',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0, // 确保容器可以正确收缩
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
  minHeight: 0, // 确保容器可以正确收缩
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
  overflow: 'auto',
  overscrollBehavior: 'contain',
  border: `1px solid ${theme.palette.border}`,
  borderRadius: 12,
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  minHeight: 0, // 确保容器可以正确收缩
  minWidth: 0, // 允许flex子项收缩
  [theme.breakpoints.up('lg')]: {
    gridArea: 'preview-content',
  },
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ReferencedDocItem
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: isEditing ? 'grab' : 'pointer',
        '&:active': { cursor: isEditing ? 'grabbing' : 'pointer' }
      }}
      onClick={() => !isEditing && onView && onView(doc._id || doc)}
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
          <DocumentCopyButton document={doc} />
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

// 可排序的引用附件项组件
const SortableReferencedAttachmentItem = ({ attachment, index, onRemove, onView, onCopy, isEditing }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attachment._id || attachment });

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

  return (
    <ReferencedAttachmentItem
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: isEditing ? 'grab' : 'pointer',
        '&:active': { cursor: isEditing ? 'grabbing' : 'pointer' }
      }}
      onClick={() => !isEditing && onView && onView(attachment._id || attachment)}
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
          <>
            {attachment.category === 'image' && (
              <AttachmentCopyButton
                attachment={attachment}
                type="image"
                tooltip="复制图片HTML引用"
                size="small"
              />
            )}
            {attachment.category === 'video' && (
              <AttachmentCopyButton
                attachment={attachment}
                type="video"
                tooltip="复制视频HTML引用"
                size="small"
              />
            )}
            {/* 复制打开附件按钮 */}
            <Tooltip title="复制打开附件按钮">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(attachment._id, attachment.originalName);
                }}
                sx={{
                  borderRadius: 16,
                  mr: 0.5,
                }}
                aria-label="复制打开附件按钮"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
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
    </ReferencedAttachmentItem>
  );
};

// 可排序的引用引用体项组件
const SortableReferencedQuoteItem = ({ quote, index, onRemove, onView, isEditing }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quote._id || quote });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ReferencedQuoteItem
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: isEditing ? 'grab' : 'pointer',
        '&:active': { cursor: isEditing ? 'grabbing' : 'pointer' }
      }}
      onClick={() => !isEditing && onView && onView(quote._id || quote)}
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
      <FormatQuoteIcon sx={{ mr: 1, color: 'primary.main' }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" fontWeight="medium">
          {quote.title}
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
          {quote.content && quote.content.length > 100
            ? `${quote.content.substring(0, 100)}...`
            : quote.content}
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
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {!isEditing && (
          <QuoteCopyButton quote={quote} />
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
    </ReferencedQuoteItem>
  );
};

const QuoteDetailContent = ({
  quote,
  onSave,
  onDelete,
  onSaveReferences,
  onSaveAttachmentReferences,
  onSaveQuoteReferences,
  onViewDocument,
  selectedQuoteStatus,
  isSidebarCollapsed,
  onEditModeChange,
  externalTitle,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: '',
    content: '',
    tags: [],
  });
  
  const [tagInput, setTagInput] = useState(''); // 独立的tagInput状态，与DocumentDetailContent保持一致
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState(null);
  const isActionsMenuOpen = Boolean(actionsMenuAnchorEl);
  const [editorType, setEditorType] = useState('code'); // 'code' 或 'text'
  const [documentFormModalOpen, setDocumentFormModalOpen] = useState(false);
  const [quoteFormModalOpen, setQuoteFormModalOpen] = useState(false);
  
  // 引用列表相关状态
  const [referencedDocuments, setReferencedDocuments] = useState([]);
  const [originalReferencedIds, setOriginalReferencedIds] = useState([]);
  const [isReferencesDirty, setIsReferencesDirty] = useState(false);
  const [isDocumentPickerOpen, setIsDocumentPickerOpen] = useState(false);
  const [isReferencesEditing, setIsReferencesEditing] = useState(false);
  
  // 引用附件相关状态
  const [referencedAttachments, setReferencedAttachments] = useState([]);
  const [originalAttachmentIds, setOriginalAttachmentIds] = useState([]);
  const [isAttachmentReferencesDirty, setIsAttachmentReferencesDirty] = useState(false);
  const [isAttachmentPickerOpen, setIsAttachmentPickerOpen] = useState(false);
  const [isAttachmentReferencesEditing, setIsAttachmentReferencesEditing] = useState(false);
  
  // 引用引用体相关状态
  const [referencedQuotes, setReferencedQuotes] = useState([]);
  const [originalReferencedQuoteIds, setOriginalReferencedQuoteIds] = useState([]);
  const [isQuoteReferencesDirty, setIsQuoteReferencesDirty] = useState(false);
  const [isQuotePickerOpen, setIsQuotePickerOpen] = useState(false);
  const [isQuoteReferencesEditing, setIsQuoteReferencesEditing] = useState(false);
  
  // 展开/收起状态管理
  const [documentsExpanded, setDocumentsExpanded] = useState(true);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(true);
  const [quotesExpanded, setQuotesExpanded] = useState(true);
  
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
        description: quote.description || '',
        content: quote.content || '',
        tags: quote.tags || [],
      });
      setTagInput(''); // 初始化独立的tagInput状态
      
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
      
      // 初始化引用附件列表，兼容已填充对象和ID两种形态
      const attachmentRefs = quote.referencedAttachmentIds || [];
      const normalizedAttachmentRefs = attachmentRefs.map(ref => {
        if (typeof ref === 'string') {
          return { _id: ref, originalName: '加载中...', category: 'image', mimeType: '', size: 0 };
        }
        return ref;
      });
      
      setReferencedAttachments(normalizedAttachmentRefs);
      setOriginalAttachmentIds(attachmentRefs.map(ref => typeof ref === 'string' ? ref : ref._id));
      setIsAttachmentReferencesDirty(false);
      
      // 初始化引用引用体列表，兼容已填充对象和ID两种形态
      const quoteRefs = quote.referencedQuoteIds || [];
      const normalizedQuoteRefs = quoteRefs.map(ref => {
        if (typeof ref === 'string') {
          return { _id: ref, title: '加载中...', tags: [], content: '' };
        }
        return ref;
      });
      
      setReferencedQuotes(normalizedQuoteRefs);
      setOriginalReferencedQuoteIds(quoteRefs.map(ref => typeof ref === 'string' ? ref : ref._id));
      setIsQuoteReferencesDirty(false);
    }
  }, [quote]);

  // 处理编辑模式切换
  const handleToggleEdit = () => {
    if (isEditing) {
      // 取消编辑，重置表单
      setEditForm({
        description: quote.description || '',
        content: quote.content || '',
        tags: quote.tags || [],
      });
      setTagInput('');
      setError('');
    }
    setIsEditing(!isEditing);
    
    // 通知父组件编辑模式变化
    if (onEditModeChange) {
      onEditModeChange(!isEditing);
    }
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
  
  // 添加标签 - 与DocumentDetailContent保持一致
  const handleAddTag = () => {
    if (tagInput.trim() && !editForm.tags.includes(tagInput.trim())) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // 删除标签 - 与DocumentDetailContent保持一致
  const handleDeleteTag = (tagToDelete) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToDelete)
    }));
  };

  // 处理标签输入框回车 - 与DocumentDetailContent保持一致
  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 处理查看文档
  const handleViewDocument = async (doc) => {
    const docId = doc._id || doc;
    const title = doc.title || '查看详情';
    
    try {
      // 使用新的 openWindowAndFetch thunk，原子化创建窗口和获取文档
      await dispatch(openWindowAndFetch({
        docId,
        label: title,
        source: 'quote-detail'
      })).unwrap();
    } catch (error) {
      console.error('获取文档详情失败:', error);
    }
  };

  // 处理保存
  const handleSave = async () => {
    // 标题验证由 QuoteWindow 处理
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
      // 确保tags是数组格式
      const saveData = {
        ...editForm,
        tags: Array.isArray(editForm.tags) ? editForm.tags : [],
      };
      await onSave(quote._id, saveData);
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
          console.error('获取文档详情失败:', error);
        }
      }
      
      // 添加到引用列表
      setReferencedDocuments(prev => [...prev, ...newDocuments]);
      setIsReferencesDirty(true);
    } catch (error) {
      console.error('添加引用失败:', error);
    }
  };

  // 处理保存引用列表
  const handleSaveReferences = async () => {
    if (!isReferencesDirty) return;
    
    try {
      const referencedDocumentIds = referencedDocuments.map(doc => doc._id);
      await onSaveReferences(quote._id, referencedDocumentIds);
      
      setOriginalReferencedIds(referencedDocumentIds);
      setIsReferencesDirty(false);
    } catch (error) {
      console.error('保存引用列表失败:', error);
      setError('保存引用列表失败');
    }
  };

  // 处理重置引用列表
  const handleResetReferences = () => {
    // 恢复到原始状态
    const refs = quote.referencedDocumentIds || [];
    const normalizedRefs = refs.map(ref => {
      if (typeof ref === 'string') {
        return { _id: ref, title: '加载中...', tags: [] };
      }
      return ref;
    });
    
    setReferencedDocuments(normalizedRefs);
    setIsReferencesDirty(false);
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

  // 处理移除附件引用
  const handleRemoveAttachmentReference = (index) => {
    setReferencedAttachments(prev => prev.filter((_, i) => i !== index));
    setIsAttachmentReferencesDirty(true);
  };

  // 处理添加附件引用
  const handleAddAttachmentReferences = async (selectedIds) => {
    console.log('[QuoteDetailContent.handleAddAttachmentReferences] 开始添加附件引用, selectedIds:', selectedIds);
    try {
      // 获取新添加的附件详情
      const newAttachments = [];
      for (const id of selectedIds) {
        // 如果已经存在，跳过（重复添加去重）
        if (referencedAttachments.some(att => att._id === id)) {
          console.log(`[QuoteDetailContent.handleAddAttachmentReferences] 附件 ${id} 已存在，跳过`);
          continue;
        }
        
        try {
          console.log(`[QuoteDetailContent.handleAddAttachmentReferences] 正在获取附件 ${id} 的元数据`);
          const metadataResponse = await getAttachmentMetadata(id);
          console.log(`[QuoteDetailContent.handleAddAttachmentReferences] 获取附件 ${id} 元数据成功:`, metadataResponse.data);
          newAttachments.push(metadataResponse.data);
        } catch (error) {
          console.error(`[QuoteDetailContent.handleAddAttachmentReferences] 获取附件 ${id} 详情失败:`, error);
        }
      }
      
      console.log(`[QuoteDetailContent.handleAddAttachmentReferences] 成功获取 ${newAttachments.length} 个附件，准备添加到列表`);
      // 添加到引用列表
      setReferencedAttachments(prev => {
        const updated = [...prev, ...newAttachments];
        console.log(`[QuoteDetailContent.handleAddAttachmentReferences] 更新后的引用附件列表:`, updated);
        return updated;
      });
      setIsAttachmentReferencesDirty(true);
      console.log(`[QuoteDetailContent.handleAddAttachmentReferences] 设置附件引用为脏状态`);
    } catch (error) {
      console.error('[QuoteDetailContent.handleAddAttachmentReferences] 添加附件引用失败:', error);
    }
  };

  // 处理保存附件引用列表
  const handleSaveAttachmentReferences = async () => {
    if (!isAttachmentReferencesDirty || !onSaveAttachmentReferences) return;
    
    try {
      const referencedAttachmentIds = referencedAttachments.map(att => att._id);
      await onSaveAttachmentReferences(quote._id, referencedAttachmentIds);
      
      setOriginalAttachmentIds(referencedAttachmentIds);
      setIsAttachmentReferencesDirty(false);
    } catch (error) {
      console.error('保存附件引用列表失败:', error);
      setError('保存附件引用列表失败');
    }
  };

  // 处理重置附件引用列表
  const handleResetAttachmentReferences = () => {
    // 恢复到原始状态
    const refs = quote.referencedAttachmentIds || [];
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
        source: 'quote-detail'
      })).unwrap();
    } catch (error) {
      console.error('打开附件窗口失败:', error);
    }
  };

  // 处理复制附件链接
  const handleCopyAttachmentLink = async (attachmentId, attachmentName = '附件') => {
    try {
      // HTML 转义处理
      const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const escapedName = escapeHtml(attachmentName);
      
      // 生成 x-tab-action 标记
      const actionMarkup = `<x-tab-action data-action="open-attachment" data-attachment-id="${attachmentId}" data-label="${escapedName}">${escapedName}</x-tab-action>`;
      
      // 优先使用现代 clipboard API，但在非安全上下文时降级
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
      
      // 可以添加一个提示，这里使用简单的控制台日志
      console.log('已复制到剪贴板:', actionMarkup);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 处理查看引用文档
  const handleViewReferencedDoc = async (docId) => {
    try {
      // 使用新的窗口系统打开文档
      await dispatch(openWindowAndFetch({
        docId,
        label: '查看详情',
        source: 'quote-detail'
      })).unwrap();
    } catch (error) {
      console.error('打开文档窗口失败:', error);
    }
  };

  // 处理打开文档创建模态框
  const handleOpenDocumentFormModal = () => {
    setDocumentFormModalOpen(true);
  };

  // 处理关闭文档创建模态框
  const handleCloseDocumentFormModal = () => {
    setDocumentFormModalOpen(false);
  };

  // 处理打开引用体创建模态框
  const handleOpenQuoteFormModal = () => {
    setQuoteFormModalOpen(true);
  };

  // 处理关闭引用体创建模态框
  const handleCloseQuoteFormModal = () => {
    setQuoteFormModalOpen(false);
  };

  // 处理创建并引用笔记
  const handleCreateAndReferenceDocument = async (documentData) => {
    try {
      // 创建新笔记
      const newDocument = await createDocumentService(documentData);
      
      // 更新当前引用体的引用列表，添加新创建的笔记ID
      const updatedReferencedIds = [...referencedDocuments.map(doc => doc._id || doc), newDocument.data._id];
      
      // 调用 updateQuote 持久化引用关系
      await onSave(quote._id, {
        referencedDocumentIds: updatedReferencedIds
      });
      
      // 乐观更新本地状态
      setReferencedDocuments(prev => [...prev, newDocument.data]);
      return Promise.resolve();
    } catch (error) {
      console.error('创建并引用笔记失败:', error);
      return Promise.reject(error);
    }
  };

  // 处理创建并引用引用体
  const handleCreateAndReferenceQuote = async (quoteData) => {
    try {
      // 创建新引用体
      const newQuote = await dispatch(createQuote(quoteData)).unwrap();
      
      // 更新当前引用体的引用列表，添加新创建的引用体ID
      const updatedReferencedIds = [...referencedQuotes.map(quote => quote._id || quote), newQuote._id];
      
      // 调用 updateQuote 持久化引用关系
      await onSave(quote._id, {
        referencedQuoteIds: updatedReferencedIds
      });
      
      // 乐观更新本地状态
      setReferencedQuotes(prev => [...prev, newQuote]);
      return Promise.resolve();
    } catch (error) {
      console.error('创建并引用引用体失败:', error);
      return Promise.reject(error);
    }
  };

  // 处理引用引用体拖拽结束
  const handleQuoteDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setReferencedQuotes((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
      setIsQuoteReferencesDirty(true);
    }
  };

  // 处理移除引用引用体
  const handleRemoveQuoteReference = (index) => {
    setReferencedQuotes(prev => prev.filter((_, i) => i !== index));
    setIsQuoteReferencesDirty(true);
  };

  // 处理添加引用引用体
  const handleAddQuoteReferences = async (selectedIds) => {
    try {
      // 获取新添加的引用体详情
      const newQuotes = [];
      for (const id of selectedIds) {
        // 如果已经存在，跳过（重复添加去重）
        if (referencedQuotes.some(quote => quote._id === id)) {
          continue;
        }
        
        try {
          const response = await apiClient.get(`/quotes/${id}`);
          newQuotes.push(response.data.data);
        } catch (error) {
          console.error('获取引用体详情失败:', error);
        }
      }
      
      // 添加到引用列表
      setReferencedQuotes(prev => [...prev, ...newQuotes]);
      setIsQuoteReferencesDirty(true);
    } catch (error) {
      console.error('添加引用引用体失败:', error);
    }
  };

  // 处理保存引用引用体列表
  const handleSaveQuoteReferences = async () => {
    if (!isQuoteReferencesDirty || !onSaveQuoteReferences) return;
    
    try {
      const referencedQuoteIds = referencedQuotes.map(quote => quote._id);
      await onSaveQuoteReferences(quote._id, referencedQuoteIds);
      
      setOriginalReferencedQuoteIds(referencedQuoteIds);
      setIsQuoteReferencesDirty(false);
    } catch (error) {
      console.error('保存引用引用体列表失败:', error);
      setError('保存引用引用体列表失败');
    }
  };

  // 处理重置引用引用体列表
  const handleResetQuoteReferences = () => {
    // 恢复到原始状态
    const refs = quote.referencedQuoteIds || [];
    const normalizedRefs = refs.map(ref => {
      if (typeof ref === 'string') {
        return { _id: ref, title: '加载中...', tags: [], content: '' };
      }
      return ref;
    });
    
    setReferencedQuotes(normalizedRefs);
    setIsQuoteReferencesDirty(false);
  };

  // 处理查看引用引用体
  const handleViewReferencedQuote = async (quoteId) => {
    try {
      // 打开引用体详情窗口
      await dispatch(openQuoteWindowAndFetch({
        quoteId,
        label: '查看引用体详情',
        source: 'quote-detail'
      })).unwrap();
    } catch (error) {
      console.error('打开引用体窗口失败:', error);
    }
  };

  // 渲染加载状态
  if (selectedQuoteStatus === 'loading') {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%' 
      }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          正在加载引用体内容...
        </Typography>
      </Box>
    );
  }

  return (
    <ContentBox>
      {/* 左侧关系区域 */}
      <RelationsBox isCollapsed={isSidebarCollapsed}>
        {/* 引用的笔记模块 */}
        <CollapsibleRelationModule
          title="引用的笔记"
          count={referencedDocuments.length}
          expanded={documentsExpanded}
          onExpandedChange={setDocumentsExpanded}
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
              <>
                <Tooltip title="新建并引用笔记">
                  <IconButton
                    size="small"
                    onClick={handleOpenDocumentFormModal}
                    sx={{
                      borderRadius: 16,
                    }}
                    aria-label="新建并引用笔记"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
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
              </>
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
                      onView={handleViewReferencedDoc}
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
          
        </CollapsibleRelationModule>
        
        {/* 引用的附件模块 */}
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
          {referencedAttachments.length > 0 ? (
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
                      onView={handleViewAttachment}
                      onCopy={handleCopyAttachmentLink}
                      isEditing={isAttachmentReferencesEditing}
                    />
                  ))}
                </ReferencedAttachmentsContainer>
              </SortableContext>
            </DndContext>
          ) : (
            <EmptyStateContainer>
              <Typography variant="body2">
                暂无引用的附件
              </Typography>
            </EmptyStateContainer>
          )}
          
        </CollapsibleRelationModule>
        
        {/* 引用的引用体模块 */}
        <CollapsibleRelationModule
          title="引用的引用体"
          count={referencedQuotes.length}
          expanded={quotesExpanded}
          onExpandedChange={setQuotesExpanded}
          actions={
            isQuoteReferencesEditing ? (
              <>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setIsQuotePickerOpen(true)}
                  sx={{
                    borderRadius: 16,
                  }}
                >
                  添加引用体
                </Button>
                {isQuoteReferencesDirty && onSaveQuoteReferences && (
                  <>
                    <Tooltip title="保存引用体">
                      <IconButton
                        size="small"
                        onClick={handleSaveQuoteReferences}
                        sx={{
                          borderRadius: 16,
                          color: 'success.main',
                        }}
                      >
                        <SaveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="重置引用体">
                      <IconButton
                        size="small"
                        onClick={handleResetQuoteReferences}
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
                      setIsQuoteReferencesEditing(false);
                      handleResetQuoteReferences();
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
              <>
                <Tooltip title="新建并引用引用体">
                  <IconButton
                    size="small"
                    onClick={handleOpenQuoteFormModal}
                    sx={{
                      borderRadius: 16,
                    }}
                    aria-label="新建并引用引用体"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="编辑引用">
                  <IconButton
                    size="small"
                    onClick={() => setIsQuoteReferencesEditing(true)}
                    sx={{
                      borderRadius: 16,
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )
          }
        >
          {referencedQuotes.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleQuoteDragEnd}
            >
              <SortableContext
                items={referencedQuotes.map(quote => quote._id)}
                strategy={verticalListSortingStrategy}
              >
                <ReferencedQuotesContainer>
                  {referencedQuotes.map((quote, index) => (
                    <SortableReferencedQuoteItem
                      key={quote._id}
                      quote={quote}
                      index={index}
                      onRemove={handleRemoveQuoteReference}
                      onView={handleViewReferencedQuote}
                      isEditing={isQuoteReferencesEditing}
                    />
                  ))}
                </ReferencedQuotesContainer>
              </SortableContext>
            </DndContext>
          ) : (
            <EmptyStateContainer>
              <Typography variant="body2">
                暂无引用的引用体
              </Typography>
            </EmptyStateContainer>
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
                onClick={isEditing ? handleSave : handleToggleEdit}
                disabled={loading}
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
                  onClick={handleToggleEdit}
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
                  onClick={(e) => setActionsMenuAnchorEl(e.currentTarget)}
                  title="更多操作"
                  sx={{
                    borderRadius: 16,
                    backgroundColor: 'transparent',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'light'
                        ? 'rgba(0, 0, 0, 0.04)'
                        : 'rgba(255, 255, 255, 0.08)',
                    },
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
              )}
              
              {/* 编辑模式下的UI模式切换按钮 */}
              {isEditing && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={editorType === 'code' ? <EditNoteIcon /> : <CodeIcon />}
                  onClick={() => setEditorType(editorType === 'code' ? 'text' : 'code')}
                  sx={{
                    borderRadius: 16,
                    fontSize: '0.8rem',
                    px: 2,
                    py: 0.5,
                    minWidth: 'auto',
                    fontWeight: 'medium',
                  }}
                >
                  {editorType === 'code' ? '切换到文本编辑器' : '切换到代码编辑器'}
                </Button>
              )}
            </Box>
          </Box>
          
          {/* 移除了重复的切换编辑器按钮，现在只在顶部固定条上有切换按钮 */}
          
          {/* 标签 */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              标签
            </Typography>
            {isEditing ? (
              <TagsContainer>
                {editForm.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => handleDeleteTag(tag)} // 使用统一的删除函数
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
                  onKeyPress={handleTagInputKeyPress} // 使用统一的按键处理函数
                  sx={{
                    minWidth: 300, // 增加输入框宽度到300px
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
                        onClick={handleAddTag} // 使用统一的添加函数
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
                {(quote.tags || []).map((tag, index) => (
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
            <Typography variant="subtitle1" sx={{ mb: 1, mt: 3 }}>
              内容
            </Typography>

          {/* 错误提示 */}
          {error && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            </Box>
          )}

          {/* 编辑表单 */}
          {isEditing ? (
            <EditorContainer>
              {/* 左侧编辑区域 */}
              <EditorLeftColumn>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                      内容 *
                    </Typography>
                    {/* 移除了内容区域的切换按钮，现在只在顶部有切换按钮 */}
                  </Box>
                  <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    {editorType === 'code' ? (
                      <CodeEditor
                        value={editForm.content}
                        onChange={(value) => handleFieldChange('content', value)}
                        language="markdown"
                        mode="fillContainer"
                        minHeight={160}
                        maxHeight="none"
                        debounceMs={300}
                      />
                    ) : (
                      <TextField
                        value={editForm.content}
                        onChange={(e) => handleFieldChange('content', e.target.value)}
                        fullWidth
                        variant="outlined"
                        multiline
                        minRows={6}
                        sx={{
                          height: '100%',
                          '& .MuiOutlinedInput-root': {
                            height: '100%',
                            alignItems: 'flex-start', // 确保文本从顶部开始
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            lineHeight: 1.5,
                          },
                          '& .MuiOutlinedInput-multiline': {
                            alignItems: 'flex-start', // 确保多行文本从顶部开始
                          },
                        }}
                        placeholder="请输入内容..."
                      />
                    )}
                  </Box>
                </Box>
              </EditorLeftColumn>
              
              {/* 右侧预览区域 */}
              <EditorRightColumn>
                <PreviewHeader>
                  <Typography variant="h6">
                    预览
                  </Typography>
                </PreviewHeader>
                <PreviewContent>
                  <MarkdownInlineRenderer
                    content={editForm.content}
                    cacheKey={quote._id && editForm.content ? `${quote._id}|edit|${editForm.content.length}` : null}
                    scopeClass="quote-markdown-preview"
                  />
                </PreviewContent>
              </EditorRightColumn>
            </EditorContainer>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* 内容 */}
              <Box>
                <MarkdownInlineRenderer content={quote.content} />
              </Box>
              
            </Box>
          )}

          {/* 底部元信息区域 */}
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
                  描述:
                </Box>
                {isEditing ? (
                  <TextField
                    name="description"
                    value={editForm.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    variant="standard"
                    size="small"
                    sx={{
                      width: 600, // 设置描述输入框宽度为600px
                      '& .MuiInput-underline:before': {
                        borderBottomColor: 'primary.main',
                      },
                      '& .MuiInput-underline:after': {
                        borderBottomColor: 'primary.main',
                      },
                    }}
                  />
                ) : (
                  quote.description || '未设置'
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
                {quote.createdAt ? formatRelativeTime(quote.createdAt) : '未知'}
              </Typography>
              {quote.updatedAt && quote.updatedAt !== quote.createdAt && (
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
                  {formatRelativeTime(quote.updatedAt)}
                </Typography>
              )}
            </Box>
            {/* 编辑按钮和更多操作按钮已移到顶部栏 */}
          </MetaInfoContainer>

      {/* 操作菜单 */}
      <Menu
        anchorEl={actionsMenuAnchorEl}
        open={isActionsMenuOpen}
        onClose={() => setActionsMenuAnchorEl(null)}
      >
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>删除引用体</ListItemText>
        </MenuItem>
      </Menu>

      {/* 文档选择对话框 */}
      <DocumentPickerDialog
        open={isDocumentPickerOpen}
        handleClose={() => setIsDocumentPickerOpen(false)}
        onConfirm={handleAddReferences}
        excludeIds={referencedDocuments.map(doc => doc._id)}
      />
      
      {/* 附件选择对话框 */}
      <AttachmentPickerDialog
        open={isAttachmentPickerOpen}
        onClose={() => setIsAttachmentPickerOpen(false)}
        onConfirm={handleAddAttachmentReferences}
        excludeIds={referencedAttachments.map(att => att._id)}
        initialSelectedIds={referencedAttachments.map(att => att._id)}
      />
      
      {/* 引用体选择对话框 */}
      <QuotePickerDialog
        open={isQuotePickerOpen}
        handleClose={() => setIsQuotePickerOpen(false)}
        onConfirm={handleAddQuoteReferences}
        excludeIds={referencedQuotes.map(quote => quote._id)}
        hiddenIds={[quote._id]} // 传递当前引用体的ID，使其不在列表中显示
      />

      {/* 文档创建模态框 */}
      <DocumentFormModal
        open={documentFormModalOpen}
        handleClose={handleCloseDocumentFormModal}
        onSave={handleCreateAndReferenceDocument}
      />

      {/* 引用体创建模态框 */}
      <QuoteFormModal
        open={quoteFormModalOpen}
        handleClose={handleCloseQuoteFormModal}
        initialDocumentId={quote._id}
        onSave={handleCreateAndReferenceQuote}
        initialQuoteId={quote._id}
      />
    </RightContentBox>
  </ContentBox>
  );
};

export default QuoteDetailContent;