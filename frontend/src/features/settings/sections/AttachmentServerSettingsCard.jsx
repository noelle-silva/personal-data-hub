import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CardContent,
  Collapse,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { SettingsCard } from '../components/SettingsShell';
import { getAttachmentServerSettings, updateAttachmentServerSettings } from '../../../services/serverSettings';

const bytesToMb = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  return Math.round(n / 1024 / 1024);
};

const mbToBytes = (mb) => {
  const n = Number(mb);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1024 * 1024);
};

const splitCsv = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const joinCsv = (list) => (Array.isArray(list) ? list.join(',') : '');

const AttachmentServerSettingsCard = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [form, setForm] = useState({
    enableRange: true,
    enableDeduplication: false,
    cacheTtlSeconds: 3600,
    maxSizeMb: { image: 10, video: 1024, document: 50, script: 10 },
    maxFiles: { image: 10, video: 3, document: 10, script: 10 },
    allowedTypesCsv: { image: '', video: '', document: '', script: '' },
  });

  const load = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await getAttachmentServerSettings();
      if (!res?.success) throw new Error(res?.message || '加载失败');
      const data = res.data || {};

      setForm({
        enableRange: !!data.enableRange,
        enableDeduplication: !!data.enableDeduplication,
        cacheTtlSeconds: Number.isFinite(Number(data.cacheTtlSeconds)) ? Number(data.cacheTtlSeconds) : 3600,
        maxSizeMb: {
          image: bytesToMb(data?.maxSizeBytes?.image),
          video: bytesToMb(data?.maxSizeBytes?.video),
          document: bytesToMb(data?.maxSizeBytes?.document),
          script: bytesToMb(data?.maxSizeBytes?.script),
        },
        maxFiles: {
          image: data?.maxFiles?.image ?? 10,
          video: data?.maxFiles?.video ?? 3,
          document: data?.maxFiles?.document ?? 10,
          script: data?.maxFiles?.script ?? 10,
        },
        allowedTypesCsv: {
          image: joinCsv(data?.allowedTypes?.image),
          video: joinCsv(data?.allowedTypes?.video),
          document: joinCsv(data?.allowedTypes?.document),
          script: joinCsv(data?.allowedTypes?.script),
        },
      });
    } catch (e) {
      setStatus({ ok: false, message: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        enableRange: !!form.enableRange,
        enableDeduplication: !!form.enableDeduplication,
        cacheTtlSeconds: Number(form.cacheTtlSeconds),
        maxSizeBytes: {
          image: mbToBytes(form.maxSizeMb.image),
          video: mbToBytes(form.maxSizeMb.video),
          document: mbToBytes(form.maxSizeMb.document),
          script: mbToBytes(form.maxSizeMb.script),
        },
        maxFiles: {
          image: Number(form.maxFiles.image),
          video: Number(form.maxFiles.video),
          document: Number(form.maxFiles.document),
          script: Number(form.maxFiles.script),
        },
        allowedTypes: {
          image: splitCsv(form.allowedTypesCsv.image),
          video: splitCsv(form.allowedTypesCsv.video),
          document: splitCsv(form.allowedTypesCsv.document),
          script: splitCsv(form.allowedTypesCsv.script),
        },
      };

      const res = await updateAttachmentServerSettings(payload);
      if (!res?.success) throw new Error(res?.message || '保存失败');
      setStatus({ ok: true, message: res.message || '已保存（重启后端后完全生效）' });
      await load();
    } catch (e) {
      setStatus({ ok: false, message: e.message || String(e) });
    } finally {
      setSaving(false);
    }
  };

  const helper = useMemo(
    () => '保存后通常需要重启后端进程才会完全生效（PM2：pm2 restart tab-backend）。',
    []
  );

  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          服务器设置（附件上传限制）
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {helper}
        </Typography>

        {status && (
          <Alert severity={status.ok ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {status.message}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={!!form.enableRange}
                onChange={(e) => setForm((p) => ({ ...p, enableRange: e.target.checked }))}
              />
            }
            label="启用 Range（视频分段）"
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!form.enableDeduplication}
                onChange={(e) => setForm((p) => ({ ...p, enableDeduplication: e.target.checked }))}
              />
            }
            label="启用附件去重"
          />

          <TextField
            label="缓存 TTL（秒）"
            value={form.cacheTtlSeconds}
            onChange={(e) => setForm((p) => ({ ...p, cacheTtlSeconds: e.target.value }))}
            type="number"
            inputProps={{ min: 0 }}
            fullWidth
          />
          <Box />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          大小限制（MB）
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label="图片最大"
            value={form.maxSizeMb.image}
            onChange={(e) => setForm((p) => ({ ...p, maxSizeMb: { ...p.maxSizeMb, image: e.target.value } }))}
            type="number"
            inputProps={{ min: 1 }}
            fullWidth
          />
          <TextField
            label="视频最大"
            value={form.maxSizeMb.video}
            onChange={(e) => setForm((p) => ({ ...p, maxSizeMb: { ...p.maxSizeMb, video: e.target.value } }))}
            type="number"
            inputProps={{ min: 1 }}
            fullWidth
          />
          <TextField
            label="文档最大"
            value={form.maxSizeMb.document}
            onChange={(e) => setForm((p) => ({ ...p, maxSizeMb: { ...p.maxSizeMb, document: e.target.value } }))}
            type="number"
            inputProps={{ min: 1 }}
            fullWidth
          />
          <TextField
            label="脚本最大"
            value={form.maxSizeMb.script}
            onChange={(e) => setForm((p) => ({ ...p, maxSizeMb: { ...p.maxSizeMb, script: e.target.value } }))}
            type="number"
            inputProps={{ min: 1 }}
            fullWidth
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          单次上传数量限制
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label="图片"
            value={form.maxFiles.image}
            onChange={(e) => setForm((p) => ({ ...p, maxFiles: { ...p.maxFiles, image: e.target.value } }))}
            type="number"
            inputProps={{ min: 1, max: 500 }}
            fullWidth
          />
          <TextField
            label="视频"
            value={form.maxFiles.video}
            onChange={(e) => setForm((p) => ({ ...p, maxFiles: { ...p.maxFiles, video: e.target.value } }))}
            type="number"
            inputProps={{ min: 1, max: 500 }}
            fullWidth
          />
          <TextField
            label="文档"
            value={form.maxFiles.document}
            onChange={(e) => setForm((p) => ({ ...p, maxFiles: { ...p.maxFiles, document: e.target.value } }))}
            type="number"
            inputProps={{ min: 1, max: 500 }}
            fullWidth
          />
          <TextField
            label="脚本"
            value={form.maxFiles.script}
            onChange={(e) => setForm((p) => ({ ...p, maxFiles: { ...p.maxFiles, script: e.target.value } }))}
            type="number"
            inputProps={{ min: 1, max: 500 }}
            fullWidth
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button variant="text" onClick={() => setAdvancedOpen((v) => !v)}>
            {advancedOpen ? '收起高级项' : '展开高级项（允许类型）'}
          </Button>
          <Collapse in={advancedOpen}>
            <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
              <TextField
                label="图片允许类型（逗号分隔 MIME）"
                value={form.allowedTypesCsv.image}
                onChange={(e) =>
                  setForm((p) => ({ ...p, allowedTypesCsv: { ...p.allowedTypesCsv, image: e.target.value } }))
                }
                fullWidth
              />
              <TextField
                label="视频允许类型（逗号分隔 MIME）"
                value={form.allowedTypesCsv.video}
                onChange={(e) =>
                  setForm((p) => ({ ...p, allowedTypesCsv: { ...p.allowedTypesCsv, video: e.target.value } }))
                }
                fullWidth
              />
              <TextField
                label="文档允许类型（逗号分隔 MIME）"
                value={form.allowedTypesCsv.document}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    allowedTypesCsv: { ...p.allowedTypesCsv, document: e.target.value },
                  }))
                }
                fullWidth
              />
              <TextField
                label="脚本允许类型（逗号分隔 MIME）"
                value={form.allowedTypesCsv.script}
                onChange={(e) =>
                  setForm((p) => ({ ...p, allowedTypesCsv: { ...p.allowedTypesCsv, script: e.target.value } }))
                }
                fullWidth
              />
            </Box>
          </Collapse>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={load} disabled={loading || saving}>
            {loading ? '加载中...' : '刷新'}
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={loading || saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </Box>
      </CardContent>
    </SettingsCard>
  );
};

export default AttachmentServerSettingsCard;

