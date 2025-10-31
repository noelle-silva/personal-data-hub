import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import KeybindingManager from './KeybindingManager';
import ActionDispatcher from './ActionDispatcher';
import {
  selectShortcuts,
  selectEnabled,
  selectIsDirty,
  markAsSaved
} from '../store/shortcutsSlice';
import { saveShortcutSettings } from './Persistence';

/**
 * 快捷键运行时组件
 * 负责监听 Redux 状态变化并更新快捷键注册
 */
const ShortcutRuntime: React.FC = () => {
  const dispatch = useDispatch();
  const shortcuts = useSelector(selectShortcuts);
  const enabled = useSelector(selectEnabled);
  const isDirty = useSelector(selectIsDirty);
  
  const keybindingManagerRef = useRef<KeybindingManager | null>(null);
  const actionDispatcherRef = useRef<ActionDispatcher | null>(null);
  const previousShortcutsRef = useRef<string>('');

  // 初始化管理器
  useEffect(() => {
    keybindingManagerRef.current = KeybindingManager.getInstance();
    actionDispatcherRef.current = ActionDispatcher.getInstance();
    
    console.debug('快捷键运行时已初始化');
    console.debug('当前快捷键配置:', shortcuts);
    console.debug('快捷键系统启用状态:', enabled);
  }, []);

  // 监听快捷键配置变化
  useEffect(() => {
    const manager = keybindingManagerRef.current;
    const dispatcher = actionDispatcherRef.current;
    
    if (!manager || !dispatcher) {
      console.debug('管理器或派发器未初始化');
      return;
    }

    // 检查配置是否真的发生了变化
    const currentShortcutsHash = JSON.stringify(shortcuts);
    if (currentShortcutsHash === previousShortcutsRef.current) {
      console.debug('快捷键配置未变化，跳过重新注册');
      return;
    }
    
    previousShortcutsRef.current = currentShortcutsHash;
    
    console.debug('快捷键配置已更新，重新注册');
    console.debug('当前快捷键配置:', shortcuts);
    console.debug('快捷键系统启用状态:', enabled);
    
    // 先清除所有已注册的快捷键
    manager.unregister();
    
    // 根据全局启用状态启用/禁用系统
    if (enabled) {
      manager.enable();
      
      // 为每个启用的快捷键注册处理器
      Object.entries(shortcuts).forEach(([actionId, entry]) => {
        if (!entry.enabled) {
          return;
        }
        
        const handler = (event: KeyboardEvent, combo: string) => {
          console.debug(`快捷键触发: ${actionId} (${combo})`);
          
          // 发出全局事件，用于测试和调试
          window.dispatchEvent(new CustomEvent('shortcut-triggered', {
            detail: { actionId, combo }
          }));
          
          // 派发对应动作
          dispatcher.dispatchAction(actionId as any);
        };
        
        // 注册主快捷键
        manager.registerSingle(actionId as any, entry.primary, entry.scope, handler);
        
        // 如果有备用快捷键，也注册它
        if (entry.secondary) {
          manager.registerSingle(actionId as any, entry.secondary, entry.scope, handler);
        }
      });
    } else {
      manager.disable();
    }

  }, [shortcuts, enabled, dispatch]);

  // 监听配置是否需要保存
  useEffect(() => {
    if (isDirty) {
      // 延迟保存，避免频繁写入
      const saveTimer = setTimeout(() => {
        const settings = {
          enabled,
          shortcuts,
          scopePolicy: {
            global: true,
            modal: true,
            'editor-safe': true,
            'input-safe': true,
          },
        };
        
        saveShortcutSettings(settings);
        
        // 标记为已保存
        dispatch(markAsSaved());
        
        console.debug('快捷键配置已保存到 localStorage');
      }, 1000);
      
      return () => {
        clearTimeout(saveTimer);
      };
    }
  }, [isDirty, enabled, shortcuts, dispatch]);

  // 监听页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      const manager = keybindingManagerRef.current;
      if (!manager) {
        return;
      }
      
      if (document.hidden) {
        // 页面隐藏时禁用快捷键
        manager.disable();
        console.debug('页面隐藏，快捷键系统已禁用');
      } else {
        // 页面显示时恢复快捷键状态
        if (enabled) {
          manager.enable();
          console.debug('页面显示，快捷键系统已启用');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  // 监听窗口焦点变化
  useEffect(() => {
    const handleFocusChange = () => {
      const manager = keybindingManagerRef.current;
      if (!manager) {
        return;
      }
      
      if (document.hasFocus()) {
        // 窗口获得焦点时启用快捷键
        if (enabled) {
          manager.enable();
          console.debug('窗口获得焦点，快捷键系统已启用');
        }
      } else {
        // 窗口失去焦点时禁用快捷键
        manager.disable();
        console.debug('窗口失去焦点，快捷键系统已禁用');
      }
    };

    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);
    
    return () => {
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
    };
  }, [enabled]);

  // 清理函数
  useEffect(() => {
    return () => {
      const manager = keybindingManagerRef.current;
      if (manager) {
        manager.unregister();
        console.debug('快捷键运行时已清理');
      }
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
};

export default ShortcutRuntime;