import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentTransparency,
  selectCurrentConfig,
  selectAllConfigs,
  selectLoading,
  selectSaving,
  selectError,
  restoreFromStorage,
  setCurrentTransparency,
  setCurrentConfig,
  clearError,
  resetTransparency,
  fetchAllTransparencyConfigs,
  saveTransparencyConfig,
  deleteTransparencyConfig
} from '../store/transparencySlice';

// 创建透明度上下文
const TransparencyContext = createContext();

// 透明度上下文提供者组件
export const TransparencyProvider = ({ children }) => {
  const dispatch = useDispatch();
  
  // 从Redux获取状态
  const currentTransparency = useSelector(selectCurrentTransparency);
  const currentConfig = useSelector(selectCurrentConfig);
  const allConfigs = useSelector(selectAllConfigs);
  const loading = useSelector(selectLoading);
  const saving = useSelector(selectSaving);
  const error = useSelector(selectError);
  
  // 本地状态
  const [initialized, setInitialized] = useState(false);

  // 初始化：从localStorage恢复透明度设置
  useEffect(() => {
    if (!initialized) {
      dispatch(restoreFromStorage());
      setInitialized(true);
    }
  }, [dispatch, initialized]);

  // 获取所有透明度配置
  const loadAllConfigs = () => {
    dispatch(fetchAllTransparencyConfigs());
  };

  // 应用透明度配置
  const applyTransparency = (transparencyValues) => {
    dispatch(setCurrentTransparency(transparencyValues));
  };

  // 应用配置
  const applyConfig = (config) => {
    dispatch(setCurrentConfig(config));
  };

  // 保存新配置
  const saveConfig = async (configName, configData) => {
    const result = await dispatch(saveTransparencyConfig({ configName, configData }));
    return result;
  };

  // 删除配置
  const deleteConfig = async (configName) => {
    const result = await dispatch(deleteTransparencyConfig(configName));
    return result;
  };

  // 重置透明度
  const resetToDefault = () => {
    dispatch(resetTransparency());
  };

  // 清除错误
  const clearTransparencyError = () => {
    dispatch(clearError());
  };

  // 获取组件透明度值
  const getComponentTransparency = (componentType) => {
    return currentTransparency[componentType] || 100;
  };

  // 检查是否有配置变化
  const hasChanges = (config) => {
    if (!config || !config.transparency) return false;
    
    const { transparency } = config;
    return (
      transparency.cards !== currentTransparency.cards ||
      transparency.sidebar !== currentTransparency.sidebar ||
      transparency.appBar !== currentTransparency.appBar
    );
  };

  const value = {
    // 状态
    currentTransparency,
    currentConfig,
    allConfigs,
    loading,
    saving,
    error,
    initialized,
    
    // 方法
    loadAllConfigs,
    applyTransparency,
    applyConfig,
    saveConfig,
    deleteConfig,
    resetToDefault,
    clearTransparencyError,
    getComponentTransparency,
    hasChanges
  };

  return (
    <TransparencyContext.Provider value={value}>
      {children}
    </TransparencyContext.Provider>
  );
};

// 自定义hook用于使用透明度上下文
export const useTransparency = () => {
  const context = useContext(TransparencyContext);
  if (!context) {
    throw new Error('useTransparency must be used within a TransparencyProvider');
  }
  return context;
};

export default TransparencyContext;