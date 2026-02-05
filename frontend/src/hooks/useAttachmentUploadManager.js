import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  abortResumableUpload,
  completeResumableUpload,
  getResumableUploadStatus,
  initResumableUpload,
  uploadResumableChunk,
} from '../services/attachments';
import { ensureDesktopGatewayReady } from '../services/desktopGateway';
import { invoke, isTauri, listen } from '../services/tauriBridge';

const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
const DEFAULT_CONCURRENCY = 2;

const nowIso = () => new Date().toISOString();

const genId = () => {
  try {
    const uuid = typeof window !== 'undefined' ? window.crypto?.randomUUID?.() : null;
    return uuid || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  } catch (_) {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

const basenameFromPath = (p) => {
  const raw = String(p || '').trim();
  if (!raw) return 'file';
  const normalized = raw.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'file';
};

const getErrorMessage = (e) => {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (e?.message) return String(e.message);
  try {
    return JSON.stringify(e);
  } catch (_) {
    return String(e);
  }
};

export const useAttachmentUploadManager = ({ onUploaded } = {}) => {
  const [tasks, setTasks] = useState([]);
  const runtimesRef = useRef(new Map());
  const inFlightRef = useRef(new Set());
  const onUploadedRef = useRef(onUploaded);

  useEffect(() => {
    onUploadedRef.current = onUploaded;
  }, [onUploaded]);

  const upsertTask = useCallback((taskId, patch) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...patch, updatedAt: nowIso() } : t))
    );
  }, []);

  const addTasks = useCallback((newTasks) => {
    setTasks((prev) => [...newTasks, ...prev]);
  }, []);

  const enqueueFiles = useCallback(
    async (files, category) => {
      const list = Array.from(files || []).filter(Boolean);
      if (list.length === 0) return;

      const createdAt = nowIso();
      const newTasks = list.map((file) => {
        const id = genId();
        runtimesRef.current.set(id, {
          type: 'file',
          file,
          category: String(category || 'image'),
          uploadId: null,
          pauseRequested: false,
          cancelRequested: false,
          abortController: null,
        });

        return {
          id,
          source: 'file',
          name: file.name || 'file',
          category: String(category || 'image'),
          size: file.size || 0,
          bytesSent: 0,
          progress: 0,
          status: 'queued', // queued|uploading|paused|canceled|done|failed
          error: null,
          uploadId: null,
          createdAt,
          updatedAt: createdAt,
        };
      });

      addTasks(newTasks);
    },
    [addTasks]
  );

  const enqueuePaths = useCallback(
    async (paths, category) => {
      const list = Array.from(paths || []).map((p) => String(p || '').trim()).filter(Boolean);
      if (list.length === 0) return;

      const createdAt = nowIso();
      const newTasks = list.map((path) => {
        const id = genId();
        runtimesRef.current.set(id, {
          type: 'path',
          path,
          category: String(category || 'image'),
        });

        return {
          id,
          source: 'path',
          name: basenameFromPath(path),
          category: String(category || 'image'),
          size: 0,
          bytesSent: 0,
          progress: 0,
          status: 'uploading',
          error: null,
          uploadId: null,
          createdAt,
          updatedAt: createdAt,
        };
      });

      addTasks(newTasks);

      // 桌面端：把路径上传交给 Tauri 后台任务（支持断点续传）
      if (!isTauri()) {
        newTasks.forEach((t) => upsertTask(t.id, { status: 'failed', error: '路径上传仅支持桌面端' }));
        return;
      }

      try {
        // 确保本机网关就绪，并把 backend url/token 同步到 Tauri 状态（任务依赖它）
        await ensureDesktopGatewayReady();
      } catch (e) {
        const msg = getErrorMessage(e) || '本地网关未就绪';
        newTasks.forEach((t) => upsertTask(t.id, { status: 'failed', error: msg }));
        return;
      }

      for (const t of newTasks) {
        const rt = runtimesRef.current.get(t.id);
        try {
          await invoke('pdh_attachment_upload_task_start', {
            taskId: t.id,
            path: rt.path,
            category: rt.category,
          });
        } catch (e) {
          const msg = getErrorMessage(e) || '启动桌面端上传失败';
          upsertTask(t.id, { status: 'failed', error: msg });
        }
      }
    },
    [addTasks, upsertTask]
  );

  const pauseTask = useCallback(async (taskId) => {
    const rt = runtimesRef.current.get(taskId);
    if (!rt) return;

    if (rt.type === 'path') {
      try {
        await invoke('pdh_attachment_upload_task_pause', { taskId });
      } catch (_) {}
      upsertTask(taskId, { status: 'paused' });
      return;
    }

    rt.pauseRequested = true;
    rt.abortController?.abort?.();
    upsertTask(taskId, { status: 'paused' });
  }, [upsertTask]);

  const resumeTask = useCallback(async (taskId) => {
    const rt = runtimesRef.current.get(taskId);
    if (!rt) return;

    if (rt.type === 'path') {
      try {
        await invoke('pdh_attachment_upload_task_resume', { taskId });
      } catch (_) {}
      upsertTask(taskId, { status: 'uploading', error: null });
      return;
    }

    rt.pauseRequested = false;
    rt.cancelRequested = false;
    upsertTask(taskId, { status: 'queued', error: null });
  }, [upsertTask]);

  const cancelTask = useCallback(async (taskId) => {
    const rt = runtimesRef.current.get(taskId);
    if (!rt) return;

    if (rt.type === 'path') {
      try {
        await invoke('pdh_attachment_upload_task_cancel', { taskId });
      } catch (_) {}
      upsertTask(taskId, { status: 'canceled' });
      return;
    }

    rt.cancelRequested = true;
    rt.pauseRequested = false;
    rt.abortController?.abort?.();

    // 尽量通知后端清理会话
    try {
      if (rt.uploadId) await abortResumableUpload(rt.uploadId);
    } catch (_) {}

    upsertTask(taskId, { status: 'canceled' });
  }, [upsertTask]);

  const clearFinished = useCallback(() => {
    setTasks((prev) => prev.filter((t) => !['done', 'canceled'].includes(t.status)));
  }, []);

  const startFileTask = useCallback(
    async (task) => {
      const rt = runtimesRef.current.get(task.id);
      if (!rt || rt.type !== 'file') return;

      const file = rt.file;
      const size = file?.size || 0;
      const category = rt.category || task.category || 'image';
      if (!file || !size) {
        upsertTask(task.id, { status: 'failed', error: '文件为空或大小为0' });
        return;
      }

      try {
        // init（或复用已有 uploadId）
        if (!rt.uploadId) {
          rt.abortController = new AbortController();
          const initResp = await initResumableUpload(
            {
              category,
              originalName: file.name || 'file',
              mimeType: file.type || 'application/octet-stream',
              size,
            },
            { signal: rt.abortController.signal }
          );
          rt.abortController = null;
          const uploadId = initResp?.data?.uploadId;
          if (!uploadId) throw new Error('初始化上传会话失败');
          rt.uploadId = uploadId;
          upsertTask(task.id, { uploadId });
        }

        if (rt.cancelRequested) {
          try {
            if (rt.uploadId) await abortResumableUpload(rt.uploadId);
          } catch (_) {}
          upsertTask(task.id, { status: 'canceled' });
          return;
        }

        // status（断点续传：从已上传字节继续）
        rt.abortController = new AbortController();
        const statusResp = await getResumableUploadStatus(rt.uploadId, { signal: rt.abortController.signal });
        rt.abortController = null;
        let offset = Number(statusResp?.data?.bytesReceived || 0);
        if (!Number.isFinite(offset) || offset < 0) offset = 0;

        if (rt.cancelRequested) {
          try {
            if (rt.uploadId) await abortResumableUpload(rt.uploadId);
          } catch (_) {}
          upsertTask(task.id, { status: 'canceled' });
          return;
        }

        upsertTask(task.id, {
          status: 'uploading',
          size,
          bytesSent: offset,
          progress: size ? Math.min(1, offset / size) : 0,
          error: null,
        });

        while (offset < size) {
          if (rt.cancelRequested) {
            upsertTask(task.id, { status: 'canceled' });
            return;
          }
          if (rt.pauseRequested) {
            upsertTask(task.id, { status: 'paused' });
            return;
          }

          const chunk = file.slice(offset, Math.min(size, offset + DEFAULT_CHUNK_SIZE));
          const chunkStart = offset;

          rt.abortController = new AbortController();

          await uploadResumableChunk({
            uploadId: rt.uploadId,
            chunk,
            offset: chunkStart,
            signal: rt.abortController.signal,
            onUploadProgress: (e) => {
              const loaded = Number(e?.loaded || 0);
              const nextBytes = Math.min(size, chunkStart + loaded);
              upsertTask(task.id, {
                bytesSent: nextBytes,
                progress: size ? Math.min(1, nextBytes / size) : 0,
              });
            },
          });

          rt.abortController = null;
          offset = chunkStart + (chunk?.size || 0);

          upsertTask(task.id, {
            bytesSent: offset,
            progress: size ? Math.min(1, offset / size) : 0,
          });
        }

        if (rt.cancelRequested) {
          upsertTask(task.id, { status: 'canceled' });
          return;
        }

        rt.abortController = new AbortController();
        const doneResp = await completeResumableUpload(rt.uploadId, { signal: rt.abortController.signal });
        rt.abortController = null;
        const attachment = doneResp?.data;

        upsertTask(task.id, {
          status: 'done',
          bytesSent: size,
          progress: 1,
          error: null,
        });

        if (attachment && typeof onUploaded === 'function') {
          onUploadedRef.current?.(attachment);
        }
      } catch (e) {
        const isCanceled = e?.code === 'ERR_CANCELED';
        if (isCanceled && rt.cancelRequested) {
          upsertTask(task.id, { status: 'canceled' });
          return;
        }
        if (isCanceled && rt.pauseRequested) {
          upsertTask(task.id, { status: 'paused' });
          return;
        }
        upsertTask(task.id, { status: 'failed', error: e?.message || '上传失败' });
      } finally {
        const rt2 = runtimesRef.current.get(task.id);
        if (rt2 && rt2.type === 'file') rt2.abortController = null;
      }
    },
    [onUploaded, upsertTask]
  );

  // 文件任务队列泵（并发控制）
  useEffect(() => {
    const concurrency = DEFAULT_CONCURRENCY;
    const runningCount = tasks.filter((t) => t.source === 'file' && t.status === 'uploading').length;
    const inFlight = inFlightRef.current.size;
    const available = Math.max(0, concurrency - Math.max(runningCount, inFlight));
    if (available <= 0) return;

    const candidates = tasks.filter((t) => t.source === 'file' && t.status === 'queued' && !inFlightRef.current.has(t.id));
    if (candidates.length === 0) return;

    candidates.slice(0, available).forEach((t) => {
      inFlightRef.current.add(t.id);
      upsertTask(t.id, { status: 'uploading' });
      startFileTask(t)
        .catch(() => {})
        .finally(() => {
          inFlightRef.current.delete(t.id);
        });
    });
  }, [startFileTask, tasks, upsertTask]);

  // 桌面端路径上传进度：来自 Tauri 事件
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten = null;
    let alive = true;

    const setup = async () => {
      try {
        unlisten = await listen('pdh-attachment-upload-task', (event) => {
          if (!alive) return;
          const payload = event?.payload || {};
          const taskId = payload.taskId;
          if (!taskId) return;

          const status = payload.status;
          const bytesSent = Number(payload.bytesSent || 0);
          const totalBytes = Number(payload.totalBytes || 0);
          const uploadId = payload.uploadId || null;
          const error = payload.error || null;

          upsertTask(taskId, {
            status: status || 'uploading',
            bytesSent: Number.isFinite(bytesSent) ? bytesSent : 0,
            size: Number.isFinite(totalBytes) ? totalBytes : 0,
            progress: totalBytes ? Math.min(1, bytesSent / totalBytes) : 0,
            uploadId,
            error,
          });

          if (status === 'done' && payload.attachment && typeof onUploaded === 'function') {
            onUploadedRef.current?.(payload.attachment);
          }
        });
      } catch (_) {
        // ignore
      }
    };

    setup();

    return () => {
      alive = false;
      try {
        unlisten?.();
      } catch (_) {}
    };
  }, [onUploaded, upsertTask]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const uploading = tasks.filter((t) => t.status === 'uploading').length;
    const queued = tasks.filter((t) => t.status === 'queued').length;
    const paused = tasks.filter((t) => t.status === 'paused').length;
    const failed = tasks.filter((t) => t.status === 'failed').length;
    return { total, uploading, queued, paused, failed };
  }, [tasks]);

  return {
    tasks,
    stats,
    enqueueFiles,
    enqueuePaths,
    pauseTask,
    resumeTask,
    cancelTask,
    clearFinished,
  };
};
