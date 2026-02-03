import React, { useEffect, useMemo, useState } from 'react';
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
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Login as LoginIcon, Sync as SyncIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { SettingsCard } from '../components/SettingsShell';
import {
  getActiveServer,
  getServers,
  normalizeServerUrl,
  removeServer,
  setActiveServerId,
  upsertServer,
} from '../../../services/serverConfig';
import { isTauri, secretDeletePassword, secretGetPassword, secretSetPassword, setGatewayBackendUrl } from '../../../services/tauriBridge';
import { ensureDesktopGatewayReady } from '../../../services/desktopGateway';
import { checkAuth, login, selectAuthLoading, selectIsAuthenticated, selectUser } from '../../../store/authSlice';

const BackendServerSettingsCard = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);

  const [servers, setServers] = useState(() => getServers());
  const [active, setActive] = useState(() => getActiveServer());

  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ url: '', username: '', password: '', rememberPassword: true });
  const [confirmingRemoveId, setConfirmingRemoveId] = useState('');

  const reloadServers = () => {
    setServers(getServers());
    setActive(getActiveServer());
  };

  useEffect(() => {
    const handler = () => reloadServers();
    window.addEventListener('pdh-server-changed', handler);
    return () => window.removeEventListener('pdh-server-changed', handler);
  }, []);

  const activeLabel = useMemo(() => {
    if (!active?.url) return '未选择服务器';
    const who = user?.username ? `（${user.username}）` : '';
    const ok = isAuthenticated ? '已连接' : '未登录';
    return `${ok}${who}：${active.url}`;
  }, [active?.url, isAuthenticated, user?.username]);

  const openAddDialog = (preset) => {
    setStatus(null);
    setForm({
      url: preset?.url || active?.url || '',
      username: preset?.username || active?.username || '',
      password: '',
      rememberPassword: true,
    });
    setDialogOpen(true);
  };

  const closeAddDialog = () => {
    if (busy || authLoading) return;
    setDialogOpen(false);
  };

  const handleTestBackend = async (url) => {
    const normalized = normalizeServerUrl(url);
    if (!normalized) {
      setStatus({ ok: false, message: '服务器地址无效' });
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      if (isTauri()) {
        const gateway = await ensureDesktopGatewayReady().catch(() => '');
        if (!gateway) throw new Error('本地网关未就绪');

        const prev = getActiveServer()?.url || '';
        await setGatewayBackendUrl(normalized);
        try {
          const res = await fetch(`${gateway}/health`, { method: 'GET' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json().catch(() => ({}));
          setStatus({ ok: true, message: data.message || '连接成功' });
        } finally {
          await setGatewayBackendUrl(prev || '');
        }
        return;
      }

      const res = await fetch(`${normalized}/health`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      setStatus({ ok: true, message: data.message || '连接成功' });
    } catch (e) {
      setStatus({ ok: false, message: `连接失败：${e.message || e}` });
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchServer = async (id) => {
    setStatus(null);
    setBusy(true);
    try {
      const next = setActiveServerId(id);
      if (!next?.url) {
        setStatus({ ok: false, message: '切换失败：服务器不存在' });
        return;
      }

      if (isTauri()) {
        await ensureDesktopGatewayReady().catch(() => {});
        await setGatewayBackendUrl(next.url).catch(() => {});
      }

      const action = await dispatch(checkAuth());
      if (action?.error) {
        // 桌面端：如果已保存密码，尝试自动登录
        if (isTauri() && next.username) {
          const saved = await secretGetPassword(next.url, next.username).catch(() => null);
          const password = typeof saved === 'string' ? saved : null;
          if (password) {
            const loginAction = await dispatch(login({ username: next.username, password }));
            if (!loginAction?.error) {
              setStatus({ ok: true, message: `已切换并自动登录：${next.url}` });
              return;
            }
          }
        }
        setStatus({ ok: false, message: '已切换服务器，但需要登录' });
      } else {
        setStatus({ ok: true, message: `已切换并连接：${next.url}` });
      }
    } finally {
      reloadServers();
      setBusy(false);
    }
  };

  const handleConfirmAddOrLogin = async () => {
    const normalized = normalizeServerUrl(form.url);
    const username = (form.username || '').trim();
    const password = String(form.password || '');
    const rememberPassword = !!form.rememberPassword;

    if (!normalized) {
      setStatus({ ok: false, message: '服务器地址无效' });
      return;
    }
    if (!username || !password) {
      setStatus({ ok: false, message: '请输入用户名和密码' });
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const existing = getServers().find((s) => s.url === normalized) || null;

      // 先保存并激活服务器，再执行登录
      const server = upsertServer({ url: normalized, username });
      if (!server?.url) throw new Error('保存服务器失败');

      if (isTauri()) {
        await ensureDesktopGatewayReady().catch(() => {});
        await setGatewayBackendUrl(server.url);
      }

      const action = await dispatch(login({ username, password }));
      if (action?.error) {
        throw new Error(action.payload || action.error?.message || '登录失败');
      }

      // 记住密码：仅桌面端写入 OS 凭据库；不记住则清理同 server+username 的已存密码
      if (isTauri()) {
        if (existing?.username && existing.username !== username) {
          await secretDeletePassword(server.url, existing.username).catch(() => {});
        }

        if (rememberPassword) {
          await secretSetPassword(server.url, username, password);
        } else {
          await secretDeletePassword(server.url, username).catch(() => {});
        }
      }

      setStatus({ ok: true, message: `已登录并连接：${server.url}` });
      setDialogOpen(false);
    } catch (e) {
      setStatus({ ok: false, message: e.message || String(e) });
    } finally {
      reloadServers();
      setBusy(false);
    }
  };

  const handleRemoveServer = async (id) => {
    setStatus(null);
    setBusy(true);
    try {
      removeServer(id);
      setStatus({ ok: true, message: '已移除服务器（本地列表）' });
    } finally {
      reloadServers();
      setBusy(false);
      setConfirmingRemoveId('');
    }
  };

  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          服务器管理
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {activeLabel}
        </Typography>

        {status && (
          <Alert severity={status.ok ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {status.message}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Button variant="contained" onClick={() => openAddDialog()} disabled={busy || authLoading}>
            添加服务器
          </Button>
          <Button
            variant="outlined"
            startIcon={<LoginIcon />}
            onClick={() => openAddDialog(active)}
            disabled={busy || authLoading || !active?.url}
          >
            {isAuthenticated ? '重新登录' : '登录'}
          </Button>
          <Button
            variant="outlined"
            startIcon={busy ? <CircularProgress size={18} /> : <SyncIcon />}
            onClick={() => active?.url && handleTestBackend(active.url)}
            disabled={busy || !active?.url}
          >
            测试连接
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {servers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            还没有服务器。点击“添加服务器”，输入地址/用户名/密码即可加载。
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {servers.map((s) => {
              const selected = !!active?.url && s.url === active.url;
              const subtitle = s.username ? `${s.username} @ ${s.url}` : s.url;
              return (
                <ListItem
                  key={s.id}
                  sx={{
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    mb: 1,
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Tooltip title="删除（仅移除本地列表）">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={busy || authLoading}
                            onClick={() => setConfirmingRemoveId(s.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <input
                      type="radio"
                      name="pdh-active-server"
                      checked={selected}
                      onChange={() => handleSwitchServer(s.id)}
                      disabled={busy || authLoading}
                      aria-label={`切换到 ${s.url}`}
                    />
                  </ListItemIcon>
                  <ListItemText primary={s.name || s.url} secondary={subtitle} />
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onClose={closeAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>添加服务器并登录</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            密码不会保存到前端；桌面端会把 refresh token 存到系统凭据库，用于后续自动登录。
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, mt: 1 }}>
            <TextField
              label="服务器地址"
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="127.0.0.1:8444"
              helperText="支持填写 host:port 或 https://..."
              autoFocus
              fullWidth
            />
            <TextField
              label="用户名"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              fullWidth
            />
            <TextField
              label="密码"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={!!form.rememberPassword}
                  onChange={(e) => setForm((p) => ({ ...p, rememberPassword: e.target.checked }))}
                />
              }
              label={isTauri() ? '记住密码（存到系统凭据库）' : '记住密码（仅桌面版支持）'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddDialog} disabled={busy || authLoading}>
            取消
          </Button>
          <Button
            onClick={handleConfirmAddOrLogin}
            variant="contained"
            disabled={busy || authLoading}
            startIcon={busy || authLoading ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
          >
            确定
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmingRemoveId} onClose={() => setConfirmingRemoveId('')}>
        <DialogTitle>确认删除服务器</DialogTitle>
        <DialogContent>
          <Typography variant="body2">确定要从本地列表移除这个服务器吗？</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingRemoveId('')} disabled={busy}>
            取消
          </Button>
          <Button
            onClick={() => handleRemoveServer(confirmingRemoveId)}
            variant="contained"
            color="error"
            disabled={busy}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsCard>
  );
};

export default BackendServerSettingsCard;
