import apiClient from './apiClient';

export const getAttachmentServerSettings = async () => {
  const response = await apiClient.get('/server-settings/attachments');
  return response.data;
};

export const updateAttachmentServerSettings = async (payload) => {
  const response = await apiClient.put('/server-settings/attachments', payload);
  return response.data;
};

export const listAttachmentServerSettingsBackups = async () => {
  const response = await apiClient.get('/server-settings/attachments/backups');
  return response.data;
};

export const restoreAttachmentServerSettingsBackup = async (backupName) => {
  const response = await apiClient.post('/server-settings/attachments/restore', { backupName });
  return response.data;
};

