import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Chip,
  IconButton,
  Paper,
  Backdrop,
  Button,
  Stack,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import apiClient from '../services/apiClient';
import { getAttachmentProxyUrl } from '../services/serverConfig';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import NoteIcon from '@mui/icons-material/Note';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LaunchIcon from '@mui/icons-material/Launch';
import DeleteIcon from '@mui/icons-material/Delete';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import DocumentPickerDialog from './DocumentPickerDialog';
import AttachmentPickerDialog from './AttachmentPickerDialog';
import QuotePickerDialog from './QuotePickerDialog';

// 样式化的模态框容器
const ModalContainer = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 800,
  maxHeight: '90vh',
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[24],
  borderRadius: 20,
  outline: 'none',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${theme.palette.border}`,
  transition: 'background-color 0.3s ease, border-color 0.3s ease',
}));

// 标题区域
const HeaderBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderBottom: `1px solid ${theme.palette.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: theme.palette.surfaceVariant,
  transition: 'background-color 0.3s ease',
}));

// 内容区域
const ContentBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  overflowY: 'auto',
  flexGrow: 1,
}));

// 标签输入区域
const TagsInputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  alignItems: 'center',
  marginTop: theme.spacing(1),
  minHeight: 40,
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.border}`,
  borderRadius: 16,
  backgroundColor: theme.palette.background.default,
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
  },
}));

// 引用项容器
const ReferenceItemContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1.5),
  marginTop: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  borderRadius: 16,
  border: `1px solid ${theme.palette.border}`,
}));

// 引用项内容
const ReferenceItemContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

// 按钮区域
const ActionsBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderTop: `1px solid ${theme.palette.border}`,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(2),
  backgroundColor: theme.palette.surfaceVariant,
  transition: 'background-color 0.3s ease',
}));

const QuoteFormModal = ({
  open,
  handleClose,
  initialDocumentId = null,
  initialQuoteId = null,
  onSave
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    tags: [],
    referencedDocumentIds: [],
    referencedAttachmentIds: [],
    referencedQuoteIds: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDocumentPickerOpen, setIsDocumentPickerOpen] = useState(false);
  const [isAttachmentPickerOpen, setIsAttachmentPickerOpen] = useState(false);
  const [isQuotePickerOpen, setIsQuotePickerOpen] = useState(false);
  const [referencedDocuments, setReferencedDocuments] = useState([]);
  const [referencedAttachments, setReferencedAttachments] = useState([]);
  const [referencedQuotes, setReferencedQuotes] = useState([]);

  // 初始化表单数据
  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        content: '',
        description: '',
        tags: [],
        referencedDocumentIds: initialDocumentId ? [initialDocumentId] : [],
        referencedAttachmentIds: [],
        referencedQuoteIds: initialQuoteId ? [initialQuoteId] : [],
      });
      setTagInput('');
      setErrors({});
      
      // 如果有初始文档ID，获取文档信息
      if (initialDocumentId) {
        fetchDocumentInfo(initialDocumentId);
      } else {
        setReferencedDocuments([]);
      }
      
      // 如果有初始收藏夹ID，获取收藏夹信息
      if (initialQuoteId) {
        fetchQuoteInfo(initialQuoteId);
      } else {
        setReferencedQuotes([]);
      }
      
      // 如果没有初始附件引用，清空附件列表
      if (!initialDocumentId && !initialQuoteId) {
        setReferencedAttachments([]);
      }
    }
  }, [open, initialDocumentId, initialQuoteId]);

  // 获取文档信息
  const fetchDocumentInfo = async (documentId) => {
    try {
      const response = await apiClient.get(`/documents/${documentId}`);
      setReferencedDocuments([response.data.data]);
    } catch (error) {
      console.error('获取文档信息失败:', error);
    }
  };

  // 获取收藏夹信息
  const fetchQuoteInfo = async (quoteId) => {
    try {
      const response = await apiClient.get(`/quotes/${quoteId}`);
      setReferencedQuotes([response.data.data]);
    } catch (error) {
      console.error('获取收藏夹信息失败:', error);
    }
  };

  // 处理表单字段变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 清除该字段的错误
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
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

  // 处理文档选择
  const handleDocumentSelect = async (selectedIds) => {
    try {
      const newDocuments = [];
      for (const id of selectedIds) {
        // 如果已经存在，跳过
        if (formData.referencedDocumentIds.includes(id)) {
          continue;
        }
        
        const response = await apiClient.get(`/documents/${id}`);
        newDocuments.push(response.data.data);
      }
      
      setReferencedDocuments(prev => [...prev, ...newDocuments]);
      setFormData(prev => ({
        ...prev,
        referencedDocumentIds: [...prev.referencedDocumentIds, ...selectedIds.filter(id => !prev.referencedDocumentIds.includes(id))]
      }));
    } catch (error) {
      console.error('获取文档信息失败:', error);
    }
  };

  // 处理附件选择
  const handleAttachmentSelect = async (selectedIds) => {
    try {
      const newAttachments = [];
      for (const id of selectedIds) {
        // 如果已经存在，跳过
        if (formData.referencedAttachmentIds.includes(id)) {
          continue;
        }
        
        const response = await apiClient.get(`/attachments/${id}/meta`);
        newAttachments.push(response.data.data);
      }
      
      setReferencedAttachments(prev => [...prev, ...newAttachments.filter(att => att && att.originalName)]);
      setFormData(prev => ({
        ...prev,
        referencedAttachmentIds: [...prev.referencedAttachmentIds, ...selectedIds.filter(id => !prev.referencedAttachmentIds.includes(id))]
      }));
    } catch (error) {
      console.error('获取附件信息失败:', error);
    }
  };

  // 处理收藏夹选择
  const handleQuoteSelect = async (selectedIds) => {
    try {
      const newQuotes = [];
      for (const id of selectedIds) {
        // 如果已经存在，跳过
        if (formData.referencedQuoteIds.includes(id)) {
          continue;
        }
        
        const response = await apiClient.get(`/quotes/${id}`);
        newQuotes.push(response.data.data);
      }
      
      setReferencedQuotes(prev => [...prev, ...newQuotes]);
      setFormData(prev => ({
        ...prev,
        referencedQuoteIds: [...prev.referencedQuoteIds, ...selectedIds.filter(id => !prev.referencedQuoteIds.includes(id))]
      }));
    } catch (error) {
      console.error('获取收藏夹信息失败:', error);
    }
  };

  // 移除引用文档
  const handleRemoveDocument = (index) => {
    const newDocuments = [...referencedDocuments];
    const removedDoc = newDocuments.splice(index, 1)[0];
    setReferencedDocuments(newDocuments);
    
    setFormData(prev => ({
      ...prev,
      referencedDocumentIds: prev.referencedDocumentIds.filter(id => id !== removedDoc._id)
    }));
  };

  // 移除引用附件
  const handleRemoveAttachment = (index) => {
    const newAttachments = [...referencedAttachments];
    const removedAttachment = newAttachments.splice(index, 1)[0];
    setReferencedAttachments(newAttachments);
    
    setFormData(prev => ({
      ...prev,
      referencedAttachmentIds: prev.referencedAttachmentIds.filter(id => id !== removedAttachment._id)
    }));
  };

  // 移除引用收藏夹
  const handleRemoveQuote = (index) => {
    const newQuotes = [...referencedQuotes];
    const removedQuote = newQuotes.splice(index, 1)[0];
    setReferencedQuotes(newQuotes);
    
    setFormData(prev => ({
      ...prev,
      referencedQuoteIds: prev.referencedQuoteIds.filter(id => id !== removedQuote._id)
    }));
  };

  // 验证表单
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = '内容不能为空';
    }
    
    if (formData.description && formData.description.length > 300) {
      newErrors.description = '描述不能超过300个字符';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async () => {
    if (validateForm()) {
      setLoading(true);
      try {
        await onSave(formData);
        handleClose();
      } catch (error) {
        setErrors({ submit: error.message || '创建收藏夹失败' });
      } finally {
        setLoading(false);
      }
    }
  };

  // 处理ESC键关闭
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27 && open) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open, handleClose]);

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="quote-form-modal"
        aria-describedby="quote-form-content"
        closeAfterTransition
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
              id="quote-form-modal"
              variant="h4"
              component="h2"
              sx={{
                fontWeight: 'bold',
                color: 'primary.main',
                lineHeight: 1.2,
              }}
            >
              创建新收藏夹
            </Typography>
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
          </HeaderBox>

          {/* 内容区域 */}
          <ContentBox id="quote-form-content">
            <Stack spacing={3}>
              {/* 提交错误信息 */}
              {errors.submit && (
                <Alert severity="error" sx={{ borderRadius: 16 }}>
                  {errors.submit}
                </Alert>
              )}

              {/* 标题输入 */}
              <TextField
                label="标题"
                name="title"
                value={formData.title}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                error={!!errors.title}
                helperText={errors.title}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 16,
                  },
                }}
              />

              {/* 内容输入 */}
              <TextField
                label="内容"
                name="content"
                value={formData.content}
                onChange={handleChange}
                fullWidth
                multiline
                rows={6}
                variant="outlined"
                error={!!errors.content}
                helperText={errors.content}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 16,
                  },
                }}
              />

              {/* 描述输入 */}
              <TextField
                label="描述"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                error={!!errors.description}
                helperText={errors.description || '可选，最多300个字符'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 16,
                  },
                }}
              />

              {/* 标签输入 */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  标签
                </Typography>
                <TagsInputContainer>
                  {formData.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleDeleteTag(tag)}
                      size="small"
                      sx={{
                        borderRadius: 12,
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
                        borderBottomColor: 'transparent',
                      },
                      '& .MuiInput-underline:after': {
                        borderBottomColor: 'transparent',
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
                </TagsInputContainer>
              </Box>

              <Divider />

              {/* 引用笔记 */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NoteIcon fontSize="small" />
                  引用笔记
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setIsDocumentPickerOpen(true)}
                  sx={{
                    borderRadius: 16,
                    mb: 2,
                  }}
                >
                  选择笔记
                </Button>
                
                {/* 已选择的笔记列表 */}
                {referencedDocuments.map((doc, index) => (
                  <ReferenceItemContainer key={doc._id}>
                    <ReferenceItemContent>
                      <NoteIcon color="primary" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2">{doc.title}</Typography>
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
                        <IconButton
                          size="small"
                          onClick={() => window.open(`/documents/${doc._id}`, '_blank')}
                          aria-label="查看笔记"
                        >
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveDocument(index)}
                          aria-label="移除引用"
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Box>
                    </ReferenceItemContent>
                  </ReferenceItemContainer>
                ))}
              </Box>

              <Divider />

              {/* 引用附件 */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachFileIcon fontSize="small" />
                  引用附件
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setIsAttachmentPickerOpen(true)}
                  sx={{
                    borderRadius: 16,
                    mb: 2,
                  }}
                >
                  选择附件
                </Button>
                
                {/* 已选择的附件列表 */}
                {referencedAttachments.map((attachment, index) => (
                  <ReferenceItemContainer key={attachment._id}>
                    <ReferenceItemContent>
                      <AttachFileIcon color="primary" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2">{attachment.originalName}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {attachment.category} • {attachment.size}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const url = getAttachmentProxyUrl(attachment._id);
                            if (url) window.open(url, '_blank');
                          }}
                          aria-label="查看附件"
                        >
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveAttachment(index)}
                          aria-label="移除引用"
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Box>
                    </ReferenceItemContent>
                  </ReferenceItemContainer>
                ))}
              </Box>

              <Divider />

              {/* 引用收藏夹 */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormatQuoteIcon fontSize="small" />
                  引用收藏夹
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setIsQuotePickerOpen(true)}
                  sx={{
                    borderRadius: 16,
                    mb: 2,
                  }}
                >
                  选择收藏夹
                </Button>
                
                {/* 已选择的收藏夹列表 */}
                {referencedQuotes.map((quote, index) => (
                  <ReferenceItemContainer key={quote._id}>
                    <ReferenceItemContent>
                      <FormatQuoteIcon color="primary" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2">{quote.title}</Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                          {quote.content.length > 100
                            ? `${quote.content.substring(0, 100)}...`
                            : quote.content}
                        </Typography>
                        {quote.tags && quote.tags.length > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            {quote.tags.slice(0, 3).map((tag, tagIndex) => (
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
                            {quote.tags.length > 3 && (
                              <Chip
                                label={`+${quote.tags.length - 3}`}
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
                        <IconButton
                          size="small"
                          onClick={() => window.open(`/quotes/${quote._id}`, '_blank')}
                          aria-label="查看收藏夹"
                        >
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveQuote(index)}
                          aria-label="移除引用"
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Box>
                    </ReferenceItemContent>
                  </ReferenceItemContainer>
                ))}
              </Box>
            </Stack>
          </ContentBox>

          {/* 按钮区域 */}
          <ActionsBox>
            <Button
              onClick={handleClose}
              variant="outlined"
              disabled={loading}
              sx={{
                borderRadius: 16,
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{
                borderRadius: 16,
              }}
            >
              创建
            </Button>
          </ActionsBox>
        </ModalContainer>
      </Modal>

      {/* 文档选择对话框 */}
      <DocumentPickerDialog
        open={isDocumentPickerOpen}
        handleClose={() => setIsDocumentPickerOpen(false)}
        onConfirm={handleDocumentSelect}
      />

      {/* 附件选择对话框 */}
      <AttachmentPickerDialog
        open={isAttachmentPickerOpen}
        onClose={() => setIsAttachmentPickerOpen(false)}
        onConfirm={handleAttachmentSelect}
      />

      {/* 收藏夹选择对话框 */}
      <QuotePickerDialog
        open={isQuotePickerOpen}
        handleClose={() => setIsQuotePickerOpen(false)}
        onConfirm={handleQuoteSelect}
      />
    </>
  );
};

export default QuoteFormModal;
