import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  ShortcutActionId, 
  ShortcutMap, 
  ShortcutScope, 
  ShortcutOptions,
  ActionMetadata,
  ShortcutConflict,
} from '../shortcuts/types';
import { getPlatform } from '../shortcuts/Persistence';

// 动作元数据定义
const ACTION_METADATA: Record<ShortcutActionId, ActionMetadata> = {
  'create-note': {
    id: 'create-note',
    description: '创建新笔记',
    category: 'create',
    defaultCombos: {
      windows: 'ctrl+alt+n',
      mac: 'command+alt+n',
      linux: 'ctrl+alt+n',
    },
  },
  'create-quote': {
    id: 'create-quote',
    description: '创建新收藏夹',
    category: 'create',
    defaultCombos: {
      windows: 'ctrl+alt+q',
      mac: 'command+alt+q',
      linux: 'ctrl+alt+q',
    },
  },
  'upload-image': {
    id: 'upload-image',
    description: '上传新图片',
    category: 'upload',
    defaultCombos: {
      windows: 'ctrl+alt+i',
      mac: 'command+alt+i',
      linux: 'ctrl+alt+i',
    },
  },
  'upload-video': {
    id: 'upload-video',
    description: '上传新视频',
    category: 'upload',
    defaultCombos: {
      windows: 'ctrl+alt+v',
      mac: 'command+alt+v',
      linux: 'ctrl+alt+v',
    },
  },
  'upload-document': {
    id: 'upload-document',
    description: '上传新文档',
    category: 'upload',
    defaultCombos: {
      windows: 'ctrl+alt+d',
      mac: 'command+alt+d',
      linux: 'ctrl+alt+d',
    },
  },
  'upload-script': {
    id: 'upload-script',
    description: '上传新代码附件',
    category: 'upload',
    defaultCombos: {
      windows: 'ctrl+alt+s',
      mac: 'command+alt+s',
      linux: 'ctrl+alt+s',
    },
  },
};

// 保留键列表（不允许被覆盖）
const RESERVED_KEYS = [
  'ctrl+f', 'meta+f',           // 搜索
  'ctrl+s', 'meta+s',           // 保存
  'ctrl+c', 'meta+c',           // 复制
  'ctrl+v', 'meta+v',           // 粘贴
  'ctrl+x', 'meta+x',           // 剪切
  'ctrl+z', 'meta+z',           // 撤销
  'ctrl+y', 'meta+y',           // 重做
  'ctrl+a', 'meta+a',           // 全选
  'ctrl+w', 'meta+w',           // 关闭标签页
  'ctrl+q', 'meta+q',           // 退出应用
  'ctrl+tab', 'meta+tab',       // 切换标签页
  'ctrl+shift+tab', 'meta+shift+tab', // 反向切换标签页
  'ctrl+t', 'meta+t',           // 新建标签页
  'ctrl+n', 'meta+n',           // 新建窗口
  'ctrl+r', 'meta+r',           // 刷新
  'f5',                        // 刷新
  'ctrl+shift+r', 'meta+shift+r', // 强制刷新
];

// Windows 下可能冲突的组合键提示
const WINDOWS_CONFLICTING_COMBOS = [
  'ctrl+alt',                   // 可能与输入法切换冲突
  'alt+tab',                   // 系统窗口切换
  'ctrl+shift',                // 系统输入法切换
];

// 备选组合键（用于 Windows 下避免冲突）
const ALTERNATIVE_COMBOS = {
  windows: {
    'ctrl+alt+n': 'ctrl+shift+n',    // 创建笔记
    'ctrl+alt+q': 'ctrl+shift+q',    // 创建收藏夹
    'ctrl+alt+i': 'ctrl+shift+i',    // 上传图片
    'ctrl+alt+v': 'ctrl+shift+v',    // 上传视频
    'ctrl+alt+d': 'ctrl+shift+d',    // 上传文档
    'ctrl+alt+s': 'ctrl+shift+s',    // 上传脚本
  },
  mac: {
    'command+alt+n': 'command+shift+n',
    'command+alt+q': 'command+shift+q',
    'command+alt+i': 'command+shift+i',
    'command+alt+v': 'command+shift+v',
    'command+alt+d': 'command+shift+d',
    'command+alt+s': 'command+shift+s',
  },
  linux: {
    'ctrl+alt+n': 'ctrl+shift+n',
    'ctrl+alt+q': 'ctrl+shift+q',
    'ctrl+alt+i': 'ctrl+shift+i',
    'ctrl+alt+v': 'ctrl+shift+v',
    'ctrl+alt+d': 'ctrl+shift+d',
    'ctrl+alt+s': 'ctrl+shift+s',
  },
};

// 获取默认快捷键映射
const getDefaultShortcuts = (): ShortcutMap => {
  const platform = getPlatform();
  const shortcuts: ShortcutMap = {} as ShortcutMap;

  Object.entries(ACTION_METADATA).forEach(([actionId, metadata]) => {
    shortcuts[actionId as ShortcutActionId] = {
      id: actionId as ShortcutActionId,
      primary: metadata.defaultCombos[platform],
      enabled: true,
      scope: 'global',
      description: metadata.description,
    };
  });

  return shortcuts;
};

// 初始状态
const initialState = {
  enabled: true,
  scopePolicy: {
    global: true,
    modal: true,
    'editor-safe': true,
    'input-safe': true,
  },
  shortcuts: getDefaultShortcuts(),
  conflicts: [] as ShortcutConflict[],
  platform: getPlatform(),
  isDirty: false, // 标记配置是否已修改但未保存
};

const shortcutsSlice = createSlice({
  name: 'shortcuts',
  initialState,
  reducers: {
    // 设置快捷键
    setShortcut: (state, action: PayloadAction<{ actionId: ShortcutActionId; combo: string }>) => {
      const { actionId, combo } = action.payload;
      
      // 检查是否为保留键
      if (RESERVED_KEYS.includes(combo.toLowerCase())) {
        console.warn(`快捷键 ${combo} 为保留键，不允许设置`);
        return;
      }
      
      // 检查冲突
      const conflicts: ShortcutConflict[] = [];
      Object.entries(state.shortcuts).forEach(([existingActionId, entry]) => {
        if (existingActionId !== actionId && entry.primary === combo) {
          conflicts.push({
            actionId,
            conflictingActionId: existingActionId as ShortcutActionId,
            combo,
            scope: entry.scope,
          });
        }
      });
      
      if (conflicts.length > 0) {
        state.conflicts = conflicts;
        return;
      }
      
      // 清除冲突并设置新快捷键
      state.conflicts = [];
      state.shortcuts[actionId].primary = combo;
      state.isDirty = true;
    },
    
    // 切换快捷键启用状态
    toggleShortcut: (state, action: PayloadAction<ShortcutActionId>) => {
      const actionId = action.payload;
      state.shortcuts[actionId].enabled = !state.shortcuts[actionId].enabled;
      state.isDirty = true;
    },
    
    // 设置作用域
    setShortcutScope: (state, action: PayloadAction<{ actionId: ShortcutActionId; scope: ShortcutScope }>) => {
      const { actionId, scope } = action.payload;
      state.shortcuts[actionId].scope = scope;
      state.isDirty = true;
    },
    
    // 重置单个快捷键为默认值
    resetShortcut: (state, action: PayloadAction<ShortcutActionId>) => {
      const actionId = action.payload;
      const metadata = ACTION_METADATA[actionId];
      const defaultCombo = metadata.defaultCombos[state.platform];
      
      state.shortcuts[actionId].primary = defaultCombo;
      state.shortcuts[actionId].enabled = true;
      state.shortcuts[actionId].scope = 'global';
      state.isDirty = true;
    },
    
    // 重置所有快捷键为默认值
    resetAllShortcuts: (state) => {
      state.shortcuts = getDefaultShortcuts();
      state.conflicts = [];
      state.isDirty = true;
    },
    
    // 切换全局启用状态
    toggleGlobalEnabled: (state) => {
      state.enabled = !state.enabled;
      state.isDirty = true;
    },
    
    // 设置作用域策略
    setScopePolicy: (state, action: PayloadAction<{ scope: ShortcutScope; enabled: boolean }>) => {
      const { scope, enabled } = action.payload;
      state.scopePolicy[scope] = enabled;
      state.isDirty = true;
    },
    
    // 清除冲突
    clearConflicts: (state) => {
      state.conflicts = [];
    },
    
    // 标记为已保存
    markAsSaved: (state) => {
      state.isDirty = false;
    },
    
    // 从外部加载配置
    loadSettings: (state, action: PayloadAction<ShortcutOptions>) => {
      const { enabled, scopePolicy, shortcuts } = action.payload;
      state.enabled = enabled;
      state.scopePolicy = { ...state.scopePolicy, ...scopePolicy };
      state.shortcuts = { ...state.shortcuts, ...shortcuts };
      state.conflicts = [];
      state.isDirty = false;
    },
  },
});

// 导出 actions
export const {
  setShortcut,
  toggleShortcut,
  setShortcutScope,
  resetShortcut,
  resetAllShortcuts,
  toggleGlobalEnabled,
  setScopePolicy,
  clearConflicts,
  markAsSaved,
  loadSettings,
} = shortcutsSlice.actions;

// 导出 selectors
export const selectShortcuts = (state: { shortcuts: typeof initialState }) => state.shortcuts.shortcuts;
export const selectShortcut = (actionId: ShortcutActionId) => (state: { shortcuts: typeof initialState }) =>
  state.shortcuts.shortcuts[actionId];
export const selectEnabled = (state: { shortcuts: typeof initialState }) => state.shortcuts.enabled;
export const selectScopePolicy = (state: { shortcuts: typeof initialState }) => state.shortcuts.scopePolicy;
export const selectConflicts = (state: { shortcuts: typeof initialState }) => state.shortcuts.conflicts;
export const selectPlatform = (state: { shortcuts: typeof initialState }) => state.shortcuts.platform;
export const selectIsDirty = (state: { shortcuts: typeof initialState }) => state.shortcuts.isDirty;
export const selectActionMetadata = () => ACTION_METADATA;
export const selectReservedKeys = () => RESERVED_KEYS;

// 导出常量
export { WINDOWS_CONFLICTING_COMBOS, ALTERNATIVE_COMBOS };

// 导出 reducer
export default shortcutsSlice.reducer;
