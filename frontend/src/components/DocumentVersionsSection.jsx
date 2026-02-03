import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';
import HtmlSandboxRenderer from './HtmlSandboxRenderer';
import {
  createDocumentVersion,
  getDocumentVersion,
  listDocumentVersions,
} from '../services/documentVersions';

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    '操作失败，请重试'
  );
}

const DocumentVersionCreateDialog = ({
  open,
  disabled,
  onClose,
  onSubmit,
}) => {
  const [versionName, setVersionName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setVersionName('');
    setDescription('');
  }, [open]);

  const canSubmit = versionName.trim().length > 0 && !disabled;

  return (
    <Dialog open={open} onClose={disabled ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        提交新版本
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          onClick={onClose}
          disabled={disabled}
          aria-label="关闭"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="版本名称"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 120 }}
          />
          <TextField
            label="版本描述（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            inputProps={{ maxLength: 5000 }}
          />
          <Typography variant="caption" color="text.secondary">
            将保存当前笔记的内容、标签、引用关系等快照。
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={disabled}>
          取消
        </Button>
        <Button
          onClick={() => onSubmit({ versionName: versionName.trim(), description: description.trim() })}
          variant="contained"
          disabled={!canSubmit}
          sx={{ borderRadius: 16 }}
        >
          提交
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DocumentVersionPreviewDialog = ({
  open,
  loading,
  version,
  onClose,
  formatDate,
}) => {
  const snapshot = version?.snapshot;
  const hasText = !!snapshot?.content;
  const hasHtml = !!snapshot?.htmlContent;

  const defaultMode = useMemo(() => {
    if (hasText) return 'text';
    if (hasHtml) return 'html';
    return 'text';
  }, [hasText, hasHtml]);

  const [mode, setMode] = useState(defaultMode);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
  }, [open, defaultMode]);

  const referencedDocs = snapshot?.referencedDocuments || [];
  const referencedAtts = snapshot?.referencedAttachments || [];
  const referencedQuotes = snapshot?.referencedQuotes || [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" noWrap title={version?.versionName || ''}>
            {version?.versionName || '版本预览'}
          </Typography>
          {version?.createdAt && (
            <Typography variant="caption" color="text.secondary">
              提交于 {formatDate ? formatDate(version.createdAt) : String(version.createdAt)}
            </Typography>
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={onClose} aria-label="关闭">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!!version?.description && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {version.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2">标题</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {snapshot?.title || '-'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2">标签</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {(snapshot?.tags || []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                ) : (
                  (snapshot.tags || []).map((tag, idx) => (
                    <Chip
                      key={`${tag}-${idx}`}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 12 }}
                    />
                  ))
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2">引用信息</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  引用笔记：{(snapshot?.referencedDocumentIds || []).length}，附件：{(snapshot?.referencedAttachmentIds || []).length}，收藏夹：{(snapshot?.referencedQuoteIds || []).length}
                </Typography>

                {referencedDocs.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {referencedDocs.slice(0, 12).map((d) => (
                      <Chip key={String(d._id)} size="small" label={d.title || String(d._id)} sx={{ borderRadius: 12 }} />
                    ))}
                    {referencedDocs.length > 12 && (
                      <Chip size="small" label={`+${referencedDocs.length - 12}`} sx={{ borderRadius: 12 }} />
                    )}
                  </Box>
                )}

                {referencedAtts.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {referencedAtts.slice(0, 12).map((a) => (
                      <Chip key={String(a._id)} size="small" label={a.originalName || String(a._id)} sx={{ borderRadius: 12 }} />
                    ))}
                    {referencedAtts.length > 12 && (
                      <Chip size="small" label={`+${referencedAtts.length - 12}`} sx={{ borderRadius: 12 }} />
                    )}
                  </Box>
                )}

                {referencedQuotes.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {referencedQuotes.slice(0, 12).map((q) => (
                      <Chip key={String(q._id)} size="small" label={q.title || String(q._id)} sx={{ borderRadius: 12 }} />
                    ))}
                    {referencedQuotes.length > 12 && (
                      <Chip size="small" label={`+${referencedQuotes.length - 12}`} sx={{ borderRadius: 12 }} />
                    )}
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2">内容</Typography>
              <Box sx={{ flexGrow: 1 }} />
              {(hasText || hasHtml) && (
                <ToggleButtonGroup
                  value={mode}
                  exclusive
                  size="small"
                  onChange={(_, next) => next && setMode(next)}
                  sx={{
                    '& .MuiToggleButton-root': {
                      borderRadius: 16,
                      textTransform: 'none',
                    },
                  }}
                >
                  <ToggleButton value="text" disabled={!hasText}>
                    文本
                  </ToggleButton>
                  <ToggleButton value="html" disabled={!hasHtml}>
                    HTML
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            </Box>

            <Box sx={{ minHeight: 120 }}>
              {mode === 'html' ? (
                snapshot?.htmlContent ? (
                  <HtmlSandboxRenderer
                    content={snapshot.htmlContent}
                    cacheKey={version?._id && version?.createdAt ? `${version._id}|html|${version.createdAt}` : null}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    暂无HTML内容
                  </Typography>
                )
              ) : snapshot?.content ? (
                <MarkdownInlineRenderer
                  content={snapshot.content}
                  cacheKey={version?._id && version?.createdAt ? `${version._id}|text|${version.createdAt}` : null}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  暂无文本内容
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ borderRadius: 16 }}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DocumentVersionsSection = ({
  documentId,
  isEditing,
  formatDate,
  onSuccessMessage,
}) => {
  const [versions, setVersions] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);

  const loadVersions = useCallback(async () => {
    if (!documentId) return;
    setLoadingList(true);
    try {
      const response = await listDocumentVersions(documentId, { limit: 50 });
      setVersions(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      setVersions([]);
      console.error('获取版本列表失败:', error);
    } finally {
      setLoadingList(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleCreate = async ({ versionName, description }) => {
    if (!documentId) return;
    setCreating(true);
    try {
      await createDocumentVersion(documentId, { versionName, description });
      onSuccessMessage?.('版本提交成功');
      setCreateOpen(false);
      setExpanded(true);
      await loadVersions();
    } catch (error) {
      console.error('提交版本失败:', error);
      alert(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleOpenPreview = async (versionId) => {
    if (!documentId || !versionId) return;
    setPreviewOpen(true);
    setLoadingPreview(true);
    setPreviewVersion(null);

    try {
      const response = await getDocumentVersion(documentId, versionId);
      setPreviewVersion(response?.data || null);
    } catch (error) {
      console.error('获取版本详情失败:', error);
      alert(getErrorMessage(error));
      setPreviewOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const submitDisabled = isEditing || creating;

  return (
    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Tooltip title={isEditing ? '请先保存并退出编辑，再提交版本' : ''} disableHoverListener={!isEditing}>
        <span>
          <Button
            fullWidth
            variant="contained"
            size="small"
            onClick={() => setCreateOpen(true)}
            disabled={submitDisabled}
            sx={{ borderRadius: 16 }}
          >
            提交新版本
          </Button>
        </span>
      </Tooltip>

      <Accordion
        disableGutters
        elevation={0}
        expanded={expanded}
        onChange={(_, next) => setExpanded(next)}
        sx={{
          borderRadius: 16,
          border: (theme) => `1px solid ${theme.palette.border}`,
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="document-version-history-content"
          id="document-version-history-header"
          sx={{
            minHeight: 40,
            '& .MuiAccordionSummary-content': { my: 0.5 },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            版本历史
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {loadingList ? '加载中…' : `${versions.length} 个`}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0.5 }}>
          {loadingList ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : versions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              暂无版本
            </Typography>
          ) : (
            <List dense disablePadding>
              {versions.map((v) => (
                <ListItemButton
                  key={String(v._id)}
                  onClick={() => handleOpenPreview(v._id)}
                  sx={{ borderRadius: 12 }}
                >
                  <ListItemText
                    primary={v.versionName || '未命名版本'}
                    secondary={v.createdAt ? (formatDate ? formatDate(v.createdAt) : String(v.createdAt)) : ''}
                    primaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>

      <DocumentVersionCreateDialog
        open={createOpen}
        disabled={creating}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <DocumentVersionPreviewDialog
        open={previewOpen}
        loading={loadingPreview}
        version={previewVersion}
        onClose={() => setPreviewOpen(false)}
        formatDate={formatDate}
      />
    </Box>
  );
};

export default DocumentVersionsSection;

