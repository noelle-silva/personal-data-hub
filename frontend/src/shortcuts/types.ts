/**
 * 快捷键系统类型定义
 */

// 支持的快捷键动作ID
export type ShortcutActionId = 
  | 'create-note'
  | 'create-quote'
  | 'upload-image'
  | 'upload-video'
  | 'upload-document'
  | 'upload-script';

// 键盘组合键字符串（如 'ctrl+alt+n', 'command+alt+n'）
export type KeyCombo = string;

// 快捷键作用域
export type ShortcutScope = 
  | 'global'        // 全局生效
  | 'modal'         // 仅在模态框中生效
  | 'editor-safe'   // 编辑器安全域（不生效）
  | 'input-safe';   // 输入框安全域（不生效）

// 快捷键条目
export interface ShortcutEntry {
  id: ShortcutActionId;
  primary: KeyCombo;
  secondary?: KeyCombo;  // 可选的备用快捷键
  enabled: boolean;
  scope: ShortcutScope;
  description: string;   // 用户友好的描述
}

// 快捷键映射表
export type ShortcutMap = Record<ShortcutActionId, ShortcutEntry>;

// 平台类型
export type Platform = 'windows' | 'mac' | 'linux' | 'unknown';

// 快捷键冲突检测结果
export interface ShortcutConflict {
  actionId: ShortcutActionId;
  conflictingActionId: ShortcutActionId;
  combo: KeyCombo;
  scope: ShortcutScope;
}

// 快捷键配置选项
export interface ShortcutOptions {
  enabled: boolean;
  scopePolicy: Record<ShortcutScope, boolean>;
  shortcuts: ShortcutMap;
}

// 动作元数据
export interface ActionMetadata {
  id: ShortcutActionId;
  description: string;
  category: 'create' | 'upload' | 'navigation';
  defaultCombos: {
    windows: KeyCombo;
    mac: KeyCombo;
    linux: KeyCombo;
  };
  reserved?: boolean; // 是否为保留键（不允许修改）
}

// 快捷键事件处理器
export type ShortcutHandler = (event: KeyboardEvent, combo: string) => void;

// 作用域守卫函数
export type ScopeGuard = (event: KeyboardEvent) => boolean;

// 平台映射函数
export type PlatformMapper = (combo: KeyCombo, platform: Platform) => KeyCombo;

// 导出/导入数据格式
export interface ShortcutExportData {
  version: string;
  platform: Platform;
  timestamp: string;
  shortcuts: ShortcutMap;
}