/**
 * 快捷键系统汇总导出
 */

// 类型定义
export * from './types';

// 持久化模块
export * from './Persistence';

// 作用域守卫
export * from './ScopeGuards';

// 热键管理器
export { default as KeybindingManager } from './KeybindingManager';

// 动作派发器
export { default as ActionDispatcher } from './ActionDispatcher';

// React 组件
export { default as ShortcutRuntime } from './ShortcutRuntime';