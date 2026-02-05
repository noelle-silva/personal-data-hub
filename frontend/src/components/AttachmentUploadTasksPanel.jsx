import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  Stack,
  Divider,
  Button,
} from '@mui/material';
import {
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Close as CloseIcon,
  DeleteSweep as ClearIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';

const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

const statusText = (status) => {
  switch (status) {
    case 'queued':
      return '等待中';
    case 'uploading':
      return '上传中';
    case 'paused':
      return '已暂停';
    case 'canceled':
      return '已取消';
    case 'done':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return status || '';
  }
};

const canPause = (t) => t.status === 'uploading';
const canResume = (t) => t.status === 'paused' || t.status === 'failed';
const canCancel = (t) => t.status === 'uploading' || t.status === 'queued' || t.status === 'paused' || t.status === 'failed';

const AttachmentUploadTasksPanel = ({
  tasks = [],
  stats,
  onPause,
  onResume,
  onCancel,
  onClearFinished,
}) => {
  if (!tasks || tasks.length === 0) return null;

  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            上传任务
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {stats
              ? `总计 ${stats.total} · 上传中 ${stats.uploading} · 等待 ${stats.queued} · 暂停 ${stats.paused} · 失败 ${stats.failed}`
              : ''}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={onClearFinished}
        >
          清理已完成
        </Button>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={1.5}>
        {tasks.map((t) => {
          const percent = Math.round((t.progress || 0) * 100);
          const showError = t.status === 'failed' && t.error;
          const meta = t.size
            ? `${formatBytes(t.bytesSent)} / ${formatBytes(t.size)} · ${percent}%`
            : percent ? `${percent}%` : '';

          return (
            <Paper key={t.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap title={t.name}>
                    {t.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {statusText(t.status)}
                    {meta ? ` · ${meta}` : ''}
                    {t.uploadId ? ` · ${String(t.uploadId).slice(0, 8)}…` : ''}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center">
                  {canPause(t) && (
                    <IconButton size="small" onClick={() => onPause?.(t.id)} aria-label="暂停上传">
                      <PauseIcon fontSize="small" />
                    </IconButton>
                  )}
                  {canResume(t) && (
                    <IconButton size="small" onClick={() => onResume?.(t.id)} aria-label="继续上传">
                      <PlayIcon fontSize="small" />
                    </IconButton>
                  )}
                  {canCancel(t) && (
                    <IconButton size="small" onClick={() => onCancel?.(t.id)} aria-label="取消上传">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              </Stack>

              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, percent))}
                  sx={{ height: 8, borderRadius: 999 }}
                />
              </Box>

              {showError && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <ErrorIcon fontSize="small" color="error" />
                  <Typography variant="caption" color="error" sx={{ wordBreak: 'break-word' }}>
                    {t.error}
                  </Typography>
                </Stack>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default AttachmentUploadTasksPanel;

