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
import { Delete as DeleteIcon, Edit as EditIcon, Login as LoginIcon, Sync as SyncIcon } from '@mui/icons-material';
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
  const [form, setForm] = useState({ url: '', name: '', username: '', password: '', rememberPassword: true });
  const [dialogMode, setDialogMode] = useState('add'); // add | edit
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
    const alias = active?.name ? `${active.name}：` : '';
    return `${ok}${who}：${alias}${active.url}`;
  }, [active?.name, active?.url, isAuthenticated, user?.username]);

  const openAddDialog = (preset) => {
    setStatus(null);
    setDialogMode('add');
    setForm({
      url: preset?.url || active?.url || '',
      name: preset?.name || active?.name || '',
      username: preset?.username || active?.username || '',
      password: '',
      rememberPassword: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (server) => {
    if (!server?.url) return;
    setStatus(null);
    setDialogMode('edit');
    setForm({
      url: server.url,
      name: server.name || '',
      username: server.username || '',
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
    const name = (form.name || '').trim();
    const username = (form.username || '').trim();
    const password = String(form.password || '');
    const rememberPassword = !!form.rememberPassword;

    if (!normalized) {
      setStatus({ ok: false, message: '服务器地址无效' });
      return;
    }
    if (!username) {
      setStatus({ ok: false, message: '请输入用户名' });
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const existing = getServers().find((s) => s.url === normalized) || null;

      // 先保存并激活服务器，再执行登录
      const server = upsertServer({ url: normalized, username, name });
      if (!server?.url) throw new Error('保存服务器失败');

      if (isTauri()) {
        await ensureDesktopGatewayReady().catch(() => {});
        await setGatewayBackendUrl(server.url);
      }

      // 有密码则用用户输入的；没密码则尝试读取已保存密码自动登录（桌面端）
      let passwordToUse = password && password.trim() ? password.trim() : '';
      if (!passwordToUse && isTauri()) {
        const saved = await secretGetPassword(server.url, username).catch(() => null);
        if (typeof saved === 'string' && saved.trim()) passwordToUse = saved.trim();
      }

      if (passwordToUse) {
        const action = await dispatch(login({ username, password: passwordToUse }));
        if (action?.error) {
          throw new Error(action.payload || action.error?.message || '登录失败');
        }
      } else {
        const check = await dispatch(checkAuth());
        if (check?.error) {
          throw new Error('已保存服务器信息，但未保存密码且当前未登录，请输入密码后重试');
        }
      }

      // 记住密码：仅桌面端写入 OS 凭据库；不记住则清理同 server+username 的已存密码
      if (isTauri()) {
        if (existing?.username && existing.username !== username) {
          await secretDeletePassword(server.url, existing.username).catch(() => {});
        }

        if (rememberPassword && password && password.trim()) {
          await secretSetPassword(server.url, username, password.trim());
        } else {
          await secretDeletePassword(server.url, username).catch(() => {});
        }
      }

      const action = await dispatch(checkAuth());
      if (action?.error) {
        setStatus({ ok: true, message: `已保存：${server.url}（需要登录）` });
      } else {
        setStatus({ ok: true, message: `已连接：${server.url}` });
      }
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
                      <Tooltip title="编辑信息（别名/用户名/密码）">
                        <span>
                          <IconButton size="small" disabled={busy || authLoading} onClick={() => openEditDialog(s)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
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
        <DialogTitle>{dialogMode === 'edit' ? '编辑服务器信息' : '添加服务器并登录'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            桌面端可选“记住密码”，密码会存到系统凭据库；refresh token 同样存到系统凭据库。
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, mt: 1 }}>
            <TextField
              label="服务器地址"
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="127.0.0.1:8444"
              helperText={dialogMode === 'edit' ? '如需修改地址，建议删除后重新添加' : '支持填写 host:port 或 https://...'}
              autoFocus
              fullWidth
              disabled={dialogMode === 'edit'}
            />
            <TextField
              label="别名（可选）"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="比如：家里 / 公司 / VPS"
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
              helperText={dialogMode === 'edit' ? '留空则尝试使用已保存密码自动登录' : ''}
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
