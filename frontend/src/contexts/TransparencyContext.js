import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
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

/*
 * 修复说明：防止透明度配置请求风暴
 *
 * 问题描述：
 * 之前 TransparencyProvider 中的方法（如 loadAllConfigs）没有使用 useCallback 稳定化引用，
 * 导致每次 Provider 重渲染都会创建新的函数引用。TransparencyConfigPanel 中的 useEffect
 * 依赖 loadAllConfigs，当函数引用变化时会重复执行，造成短时间内大量重复的
 * GET /api/transparency 请求，影响后端性能。
 *
 * 修复方案：
 * 1. 使用 useCallback 稳定所有暴露给 Context 的方法引用
 * 2. 使用 useMemo 稳定 context value 对象引用
 * 3. 在 transparencySlice 中为 fetchAllTransparencyConfigs 添加 condition 防止并发请求
 *
 * 注意事项：
 * - 所有方法都应使用 useCallback 并正确声明依赖
 * - context value 应使用 useMemo 并包含所有依赖项
 * - 未来添加新方法时也必须遵循相同的模式
 */

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
  const loadAllConfigs = useCallback(() => {
    dispatch(fetchAllTransparencyConfigs());
  }, [dispatch]);

  // 应用透明度配置
  const applyTransparency = useCallback((transparencyValues) => {
    dispatch(setCurrentTransparency(transparencyValues));
  }, [dispatch]);

  // 应用配置
  const applyConfig = useCallback((config) => {
    dispatch(setCurrentConfig(config));
  }, [dispatch]);

  // 保存新配置
  const saveConfig = useCallback(async (configName, configData) => {
    const result = await dispatch(saveTransparencyConfig({ configName, configData }));
    return result;
  }, [dispatch]);

  // 删除配置
  const deleteConfig = useCallback(async (configName) => {
    const result = await dispatch(deleteTransparencyConfig(configName));
    return result;
  }, [dispatch]);

  // 重置透明度
  const resetToDefault = useCallback(() => {
    dispatch(resetTransparency());
  }, [dispatch]);

  // 清除错误
  const clearTransparencyError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // 获取组件透明度值
  const getComponentTransparency = useCallback((componentType) => {
    return currentTransparency[componentType] || 100;
  }, [currentTransparency]);

  // 检查是否有配置变化
  const hasChanges = useCallback((config) => {
    if (!config || !config.transparency) return false;
    
    const { transparency } = config;
    return (
      transparency.cards !== currentTransparency.cards ||
      transparency.sidebar !== currentTransparency.sidebar ||
      transparency.appBar !== currentTransparency.appBar
    );
  }, [currentTransparency]);

  const value = useMemo(() => ({
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
  }), [
    // 状态依赖
    currentTransparency,
    currentConfig,
    allConfigs,
    loading,
    saving,
    error,
    initialized,
    // 方法依赖（已用 useCallback 稳定化）
    loadAllConfigs,
    applyTransparency,
    applyConfig,
    saveConfig,
    deleteConfig,
    resetToDefault,
    clearTransparencyError,
    getComponentTransparency,
    hasChanges
  ]);

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