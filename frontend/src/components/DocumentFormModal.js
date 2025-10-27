import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';
import HtmlSandboxRenderer from './HtmlSandboxRenderer';
import CodeEditor from './CodeEditor';

// 样式化的模态框容器
const ModalContainer = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  maxWidth: 1400,
  minHeight: '85vh',
  maxHeight: '95vh',
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[24],
  borderRadius: 20, // 设置为 20px 圆角，与卡片保持一致
  outline: 'none',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${theme.palette.border}`,
  transition: 'background-color 0.3s ease, border-color 0.3s ease',
}));

// 标题区域
const HeaderBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: theme.palette.surfaceVariant,
  transition: 'background-color 0.3s ease',
}));

// 三栏布局容器
const ThreeColumnContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  overflow: 'hidden',
  [theme.breakpoints.down('lg')]: {
    flexDirection: 'column',
  },
}));

// 左侧栏
const LeftColumn = styled(Box)(({ theme }) => ({
  width: '20%',
  padding: theme.spacing(2),
  borderRight: `1px solid ${theme.palette.border}`,
  overflowY: 'auto',
  [theme.breakpoints.down('lg')]: {
    width: '100%',
    borderRight: 'none',
    borderBottom: `1px solid ${theme.palette.border}`,
  },
}));

// 中间栏
const MiddleColumn = styled(Box)(({ theme }) => ({
  width: '45%',
  padding: theme.spacing(2),
  borderRight: `1px solid ${theme.palette.border}`,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.down('lg')]: {
    width: '100%',
    borderRight: 'none',
    borderBottom: `1px solid ${theme.palette.border}`,
  },
}));

// 右侧栏
const RightColumn = styled(Box)(({ theme }) => ({
  width: '35%',
  padding: theme.spacing(2),
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.down('lg')]: {
    width: '100%',
    display: props => props.showPreview ? 'flex' : 'none',
  },
}));

// 预览区域标题
const PreviewHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.border}`,
}));

// 预览内容区域
const PreviewContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  border: `1px solid ${theme.palette.border}`,
  borderRadius: 12,
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
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
  borderRadius: 16, // 设置为 16px 圆角，与其他交互元素保持一致
  backgroundColor: theme.palette.background.default,
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
  },
}));

// 按钮区域
const ActionsBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.border}`,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(2),
  backgroundColor: theme.palette.surfaceVariant,
  transition: 'background-color 0.3s ease',
}));

// 小屏预览切换按钮
const PreviewToggleContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.border}`,
  display: 'flex',
  justifyContent: 'center',
  [theme.breakpoints.up('lg')]: {
    display: 'none',
  },
}));

const DocumentFormModal = ({ open, handleClose, document, onSave, mode = 'create' }) => {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const [editorType, setEditorType] = useState('markdown');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    htmlContent: '',
    tags: [],
    source: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(isLargeScreen);
  const [previewContent, setPreviewContent] = useState('');
  const previewTimeoutRef = useRef(null);

  // 初始化表单数据
  useEffect(() => {
    if (mode === 'edit' && document) {
      const initialFormData = {
        title: document.title || '',
        content: document.content || '',
        htmlContent: document.htmlContent || '',
        tags: document.tags || [],
        source: document.source || '',
      };
      setFormData(initialFormData);
      // 如果存在htmlContent，默认切换到HTML编辑器
      if (document.htmlContent) {
        setEditorType('html');
      } else {
        setEditorType('markdown');
      }
    } else {
      // 重置表单
      setFormData({
        title: '',
        content: '',
        htmlContent: '',
        tags: [],
        source: '',
      });
      setEditorType('markdown'); // 创建时默认为Markdown
    }
    setTagInput('');
    setErrors({});
  }, [document, mode, open]);

  // 处理其他字段变化
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

  // 验证表单
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    }
    
    if (!formData.content.trim() && !formData.htmlContent.trim()) {
      newErrors.content = 'Markdown或HTML内容至少需要填写一项';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  // 更新预览内容（带节流）
  const updatePreviewContent = useCallback(() => {
    if (editorType === 'markdown') {
      setPreviewContent(formData.content);
    } else {
      setPreviewContent(formData.htmlContent);
    }
  }, [editorType, formData.content, formData.htmlContent]);

  // 处理内容变化，带节流更新预览
  const handleContentChange = (name, value) => {
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

    // 节流更新预览内容
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    previewTimeoutRef.current = setTimeout(() => {
      updatePreviewContent();
    }, 300);
  };

  // 初始化预览内容
  useEffect(() => {
    updatePreviewContent();
  }, [updatePreviewContent]);

  // 响应式处理预览显示
  useEffect(() => {
    setShowPreview(isLargeScreen);
  }, [isLargeScreen]);

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

  // 清理定时器
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="document-form-modal"
      aria-describedby="document-form-content"
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
            id="document-form-modal"
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 'bold',
              color: 'primary.main',
              lineHeight: 1.2,
            }}
          >
            {mode === 'create' ? '创建新笔记' : '编辑笔记'}
          </Typography>
          <IconButton
            onClick={handleClose}
            aria-label="关闭"
            sx={(theme) => ({
              color: theme.palette.text.secondary,
              borderRadius: 16, // 设置为 16px 圆角，与其他按钮保持一致
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

        {/* 三栏布局容器 */}
        <ThreeColumnContainer>
          {/* 左侧栏 - 标题、来源、标签、内容类型等 */}
          <LeftColumn>
            <Stack spacing={3}>
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
                    borderRadius: 16, // 设置为 16px 圆角
                  },
                }}
              />

              {/* 来源输入 */}
              <TextField
                label="来源"
                name="source"
                value={formData.source}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                placeholder="例如：书籍、文章、视频等"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 16, // 设置为 16px 圆角
                  },
                }}
              />

              {/* 内容类型切换 */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  内容类型
                </Typography>
                <ToggleButtonGroup
                  value={editorType}
                  exclusive
                  onChange={(e, newType) => newType && setEditorType(newType)}
                  aria-label="内容编辑器类型"
                  sx={{
                    marginBottom: 2,
                    '& .MuiToggleButton-root': {
                      borderRadius: 16, // 与其他按钮保持一致
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
              </Box>

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
            </Stack>
          </LeftColumn>

          {/* 中间栏 - 内容输入框 */}
          <MiddleColumn>
            <Stack spacing={1} sx={{ height: '100%' }}>
              {/* 内容输入 - 根据编辑器类型条件渲染 */}
              {editorType === 'markdown' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', flexGrow: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Markdown 内容
                  </Typography>
                  <CodeEditor
                    value={formData.content}
                    onChange={(value) => handleContentChange('content', value)}
                    language="markdown"
                    mode="autoSize"
                    minHeight={200}
                    maxHeight="60vh"
                    debounceMs={300}
                  />
                  {errors.content && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {errors.content}
                    </Typography>
                  )}
                </Box>
              )}

              {editorType === 'html' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', flexGrow: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    HTML 内容
                  </Typography>
                  <CodeEditor
                    value={formData.htmlContent}
                    onChange={(value) => handleContentChange('htmlContent', value)}
                    language="html"
                    mode="autoSize"
                    minHeight={200}
                    maxHeight="60vh"
                    debounceMs={300}
                  />
                  {errors.content && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {errors.content}
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </MiddleColumn>

          {/* 右侧栏 - 实时预览 */}
          <RightColumn showPreview={showPreview}>
            <PreviewHeader>
              <Typography variant="h6">
                实时预览
              </Typography>
              {isLargeScreen ? (
                <Typography variant="caption" color="text.secondary">
                  {editorType === 'markdown' ? 'Markdown' : 'HTML'}
                </Typography>
              ) : (
                <IconButton
                  size="small"
                  onClick={() => setShowPreview(!showPreview)}
                  aria-label={showPreview ? '隐藏预览' : '显示预览'}
                >
                  {showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              )}
            </PreviewHeader>
            <PreviewContent>
              {editorType === 'markdown' ? (
                <MarkdownInlineRenderer content={previewContent} />
              ) : (
                <HtmlSandboxRenderer content={previewContent} />
              )}
            </PreviewContent>
          </RightColumn>
        </ThreeColumnContainer>

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

        {/* 按钮区域 */}
        <ActionsBox>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              borderRadius: 16, // 设置为 16px 圆角
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              borderRadius: 16, // 设置为 16px 圆角
            }}
          >
            {mode === 'create' ? '创建' : '保存'}
          </Button>
        </ActionsBox>
      </ModalContainer>
    </Modal>
  );
};

export default DocumentFormModal;