import { isTauri, invoke } from './tauriBridge';

export const getLocalDataInfo = async () => {
  if (!isTauri()) return null;
  return invoke('pdh_local_data_info');
};

export const migrateLocalData = async (targetBaseDir) => {
  if (!isTauri()) {
    throw new Error('当前不是桌面端环境');
  }
  return invoke('pdh_local_data_migrate', { targetBaseDir });
};

