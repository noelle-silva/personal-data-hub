import React, { useState } from 'react';
import { Alert, Box, Button, CardContent, TextField, Typography } from '@mui/material';
import { SettingsCard } from '../components/SettingsShell';
import { getServerUrl, normalizeServerUrl, setServerUrl } from '../../../services/serverConfig';
import { isTauri, setGatewayBackendUrl } from '../../../services/tauriBridge';
import { ensureDesktopGatewayReady } from '../../../services/desktopGateway';

const BackendServerSettingsCard = () => {
  const [backendServerUrl, setBackendServerUrl] = useState(() => getServerUrl());
  const [backendServerStatus, setBackendServerStatus] = useState(null);
  const [backendServerBusy, setBackendServerBusy] = useState(false);

  const handleSaveBackendServer = () => {
    const normalized = setServerUrl(backendServerUrl);
    setBackendServerUrl(normalized);

    if (!normalized) {
      setBackendServerStatus({ ok: false, message: '服务器地址无效' });
      return;
    }

    setBackendServerStatus({ ok: true, message: `已保存：${normalized}` });
  };

  const handleTestBackendServer = async () => {
    const normalized = normalizeServerUrl(backendServerUrl);
    if (!normalized) {
      setBackendServerStatus({ ok: false, message: '服务器地址无效' });
      return;
    }

    setBackendServerBusy(true);
    setBackendServerStatus(null);
    try {
      // 桌面端：通过本机网关转发，避免 WebView 的跨域限制
      if (isTauri()) {
        const gateway = await ensureDesktopGatewayReady().catch(() => '');
        if (!gateway) throw new Error('本地网关未就绪');

        const prev = getServerUrl();
        await setGatewayBackendUrl(normalized);
        try {
          const res = await fetch(`${gateway}/health`, { method: 'GET' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json().catch(() => ({}));
          setBackendServerStatus({ ok: true, message: data.message || '连接成功' });
        } finally {
          // 回滚到当前保存的 server，避免“测试连接”影响正在使用的后端
          await setGatewayBackendUrl(prev || '');
        }
        return;
      }

      const res = await fetch(`${normalized}/health`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      setBackendServerStatus({ ok: true, message: data.message || '连接成功' });
    } catch (e) {
      setBackendServerStatus({ ok: false, message: `连接失败：${e.message || e}` });
    } finally {
      setBackendServerBusy(false);
    }
  };

  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          服务器设置
        </Typography>

        {backendServerStatus && (
          <Alert severity={backendServerStatus.ok ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {backendServerStatus.message}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="后端服务器地址"
            value={backendServerUrl}
            onChange={(e) => setBackendServerUrl(e.target.value)}
            placeholder="127.0.0.1:8444"
            helperText="支持填写 host:port 或 https://..."
            fullWidth
          />
          <Button variant="outlined" onClick={handleTestBackendServer} disabled={backendServerBusy}>
            {backendServerBusy ? '测试中...' : '测试连接'}
          </Button>
          <Button variant="contained" onClick={handleSaveBackendServer}>
            保存
          </Button>
        </Box>
      </CardContent>
    </SettingsCard>
  );
};

export default BackendServerSettingsCard;

