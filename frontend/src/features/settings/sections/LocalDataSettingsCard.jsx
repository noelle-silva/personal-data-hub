import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Folder as FolderIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { SettingsCard } from '../components/SettingsShell';
import { isTauri } from '../../../services/tauriBridge';
import { invoke } from '../../../services/tauriBridge';
import { getLocalDataInfo, migrateLocalData } from '../../../services/localData';

const normalizePathJoin = (base, subdir) => {
  const raw = String(base || '');
  const trimmed = raw.replace(/[\\/]+$/, '');
  if (!trimmed) return subdir;
  const sep = trimmed.includes('\\') ? '\\' : '/';
  return `${trimmed}${sep}${subdir}`;
};

const copyText = async (text) => {
  const value = String(text || '');
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // ignore
  }
};

const LocalDataSettingsCard = () => {
  const tauri = isTauri();

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetBaseDir, setTargetBaseDir] = useState('');

  const targetPreviewDir = useMemo(
    () => (targetBaseDir ? normalizePathJoin(targetBaseDir, 'personal-data-hub-data') : ''),
    [targetBaseDir]
  );

  const loadInfo = useCallback(async () => {
    if (!tauri) return;
    setLoading(true);
    setError('');
    try {
      const next = await getLocalDataInfo();
      setInfo(next);
    } catch (e) {
      setError(e?.message || '读取本地数据路径失败');
    } finally {
      setLoading(false);
    }
  }, [tauri]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const openMigrateDialog = () => {
    setError('');
    setTargetBaseDir('');
    setConfirmOpen(true);
  };

  const browseTargetDir = async () => {
    setError('');
    try {
      const picked = await invoke('pdh_pick_directory');
      const normalized = typeof picked === 'string' ? picked.trim() : '';
      if (!normalized) return;

      setTargetBaseDir(normalized);
    } catch (e) {
      console.error('选择目录失败：', e);
      setError(e?.message || String(e) || '选择目录失败');
    }
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setTargetBaseDir('');
  };

  const doMigrate = async () => {
    const base = String(targetBaseDir || '').trim();
    if (!base) {
      setError('请先输入或选择目标目录');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const next = await migrateLocalData(base);
      setInfo(next);
      closeConfirm();
    } catch (e) {
      setError(e?.message || '迁移失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          客户端本地数据
        </Typography>

        {!tauri ? (
          <Alert severity="info">
            当前为浏览器模式：本地数据由浏览器管理（localStorage/IndexedDB 等），无法显示磁盘路径，也无法迁移存放位置。
          </Alert>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}

        {tauri ? (
          <>
            <List sx={{ p: 0, mt: 1 }}>
              <ListItem>
                <ListItemIcon>
                  <FolderIcon />
                </ListItemIcon>
                <ListItemText
                  primary="本地数据目录"
                  secondary={
                    <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box component="span" sx={{ wordBreak: 'break-all' }}>
                        {info?.dataDir || (loading ? '读取中...' : '未知')}
                      </Box>
                      {info?.dataDir ? (
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          当前使用：{info?.usingCustomDir ? '自定义目录' : '默认目录'}
                        </Box>
                      ) : null}
                    </Box>
                  }
                  secondaryTypographyProps={{ sx: { wordBreak: 'break-all' } }}
                />
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => copyText(info?.dataDir)}
                    disabled={!info?.dataDir}
                  >
                    复制
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={loading ? <CircularProgress size={16} /> : <SwapHorizIcon />}
                    onClick={openMigrateDialog}
                    disabled={loading}
                  >
                    迁移路径
                  </Button>
                </Box>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="默认数据目录（参考）"
                  secondary={info?.defaultDataDir || (loading ? '读取中...' : '未知')}
                  secondaryTypographyProps={{ sx: { wordBreak: 'break-all' } }}
                />
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copyText(info?.defaultDataDir)}
                  disabled={!info?.defaultDataDir}
                >
                  复制
                </Button>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="本地数据配置文件（固定位置）"
                  secondary={
                    <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box component="span" sx={{ wordBreak: 'break-all' }}>
                        {info?.configPath || (loading ? '读取中...' : '未知')}
                      </Box>
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        说明：迁移“数据目录”时，这个文件的路径不会变化；只会更新它里面的 `dataDir`，让客户端改为从新目录读写。
                      </Box>
                    </Box>
                  }
                />
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copyText(info?.configPath)}
                  disabled={!info?.configPath}
                >
                  复制
                </Button>
              </ListItem>
            </List>
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              说明：这里的“本地数据目录”用于保存客户端本地文件（例如：已保存的配色预设）。迁移会复制一份到新位置，旧目录不会被删除；配置文件仍保留在系统的 App 配置目录中作为指针。
            </Typography>
          </>
        ) : null}

        <Dialog open={confirmOpen} onClose={closeConfirm} fullWidth maxWidth="sm">
          <DialogTitle>确认迁移本地数据目录</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              将会在所选目录下创建 `personal-data-hub-data`，并复制当前本地数据到新目录；旧目录不会删除。
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
              <TextField
                label="目标目录（父目录）"
                value={targetBaseDir}
                onChange={(e) => setTargetBaseDir(e.target.value)}
                fullWidth
                placeholder="例如：D:\\pdh 或 /Users/you/Documents"
              />
              <Button variant="outlined" onClick={browseTargetDir} disabled={loading} sx={{ whiteSpace: 'nowrap' }}>
                选择目录
              </Button>
            </Box>
            <Typography variant="subtitle2">目标位置</Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {targetPreviewDir}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeConfirm} disabled={loading}>
              取消
            </Button>
            <Button variant="contained" onClick={doMigrate} disabled={loading}>
              {loading ? '迁移中...' : '开始迁移'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </SettingsCard>
  );
};

export default LocalDataSettingsCard;
