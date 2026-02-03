import { createSlice } from '@reduxjs/toolkit';
import { createPage as createPageAction, deletePage as deletePageAction } from './customPagesSlice';

// 默认状态
const DEFAULT_STATE = {
  customPagesEnabled: true,
  customPagesVisibility: {},
  autoExpandReferencesSidebar: true,
  autoExpandAiSidebar: false,
  aiSidebarDefaultWidth: 420,
};

// 从 localStorage 加载初始状态
const loadStateFromLocalStorage = () => {
  try {
    const serializedState = localStorage.getItem('featureSettings');
    if (serializedState === null) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(serializedState);
    // 仅保留当前仍在使用的字段（丢弃旧测试页开关等历史字段）
    return {
      customPagesEnabled: parsed.customPagesEnabled ?? DEFAULT_STATE.customPagesEnabled,
      customPagesVisibility: parsed.customPagesVisibility || {},
      autoExpandReferencesSidebar:
        parsed.autoExpandReferencesSidebar ?? DEFAULT_STATE.autoExpandReferencesSidebar,
      autoExpandAiSidebar: parsed.autoExpandAiSidebar ?? DEFAULT_STATE.autoExpandAiSidebar,
      aiSidebarDefaultWidth: parsed.aiSidebarDefaultWidth ?? DEFAULT_STATE.aiSidebarDefaultWidth,
    };
  } catch (e) {
    console.warn('无法从 localStorage 加载设置，使用默认值', e);
    return DEFAULT_STATE;
  }
};

// 将状态保存到 localStorage
const saveStateToLocalStorage = (state) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('featureSettings', serializedState);
  } catch (e) {
    console.warn('无法将设置保存到 localStorage', e);
  }
};

const initialState = loadStateFromLocalStorage();

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleCustomPages: (state) => {
      state.customPagesEnabled = !state.customPagesEnabled;
      saveStateToLocalStorage(state);
    },
    toggleCustomPageVisibility: (state, action) => {
      const pageId = action.payload;
      // 确保对象存在
      if (!state.customPagesVisibility) {
        state.customPagesVisibility = {};
      }
      // 默认为 true，所以第一次切换应该是 false
      const current = state.customPagesVisibility[pageId] ?? true;
      state.customPagesVisibility[pageId] = !current;
      saveStateToLocalStorage(state);
    },
    setCustomPageVisibility: (state, action) => {
      const { pageId, isVisible } = action.payload;
      // 确保对象存在
      if (!state.customPagesVisibility) {
        state.customPagesVisibility = {};
      }
      state.customPagesVisibility[pageId] = isVisible;
      saveStateToLocalStorage(state);
    },
    setCustomPagesVisibilityBulk: (state, action) => {
      // 确保对象存在
      if (!state.customPagesVisibility) {
        state.customPagesVisibility = {};
      }
      state.customPagesVisibility = { ...state.customPagesVisibility, ...action.payload };
      saveStateToLocalStorage(state);
    },
    setCustomPagesEnabled: (state, action) => {
      state.customPagesEnabled = action.payload;
      saveStateToLocalStorage(state);
    },
    setAutoExpandReferencesSidebar: (state, action) => {
      state.autoExpandReferencesSidebar = !!action.payload;
      saveStateToLocalStorage(state);
    },
    setAutoExpandAiSidebar: (state, action) => {
      state.autoExpandAiSidebar = !!action.payload;
      saveStateToLocalStorage(state);
    },
    setAiSidebarDefaultWidth: (state, action) => {
      const raw = Number(action.payload);
      if (!Number.isFinite(raw)) return;
      state.aiSidebarDefaultWidth = Math.max(320, Math.min(960, Math.round(raw)));
      saveStateToLocalStorage(state);
    },
  },
  extraReducers: (builder) => {
    // 监听自定义页面创建成功
    builder.addCase(createPageAction.fulfilled, (state, action) => {
      const newPage = action.payload.data;
      if (newPage && newPage._id) {
        // 确保对象存在
        if (!state.customPagesVisibility) {
          state.customPagesVisibility = {};
        }
        // 新页面默认显示
        state.customPagesVisibility[newPage._id] = true;
        saveStateToLocalStorage(state);
      }
    });

    // 监听自定义页面删除成功
    builder.addCase(deletePageAction.fulfilled, (state, action) => {
      const deletedId = action.payload.id;
      if (deletedId) {
        // 确保对象存在
        if (!state.customPagesVisibility) {
          state.customPagesVisibility = {};
        }
        // 从可见性映射中移除已删除的页面
        delete state.customPagesVisibility[deletedId];
        saveStateToLocalStorage(state);
      }
    });
  },
});

// 导出 action creators
export const {
  toggleCustomPages,
  toggleCustomPageVisibility,
  setCustomPageVisibility,
  setCustomPagesVisibilityBulk,
  setCustomPagesEnabled,
  setAutoExpandReferencesSidebar,
  setAutoExpandAiSidebar,
  setAiSidebarDefaultWidth,
} = settingsSlice.actions;

// 导出 selectors
export const selectCustomPagesEnabled = (state) => state.settings.customPagesEnabled;
export const selectCustomPagesVisibility = (state) => state.settings.customPagesVisibility || {};
export const selectIsCustomPageEnabledById = (state, pageId) => {
  const visibility = state.settings.customPagesVisibility[pageId];
  return visibility !== false; // 未映射默认为 true
};

export const selectAutoExpandReferencesSidebar = (state) =>
  state.settings.autoExpandReferencesSidebar ?? DEFAULT_STATE.autoExpandReferencesSidebar;
export const selectAutoExpandAiSidebar = (state) =>
  state.settings.autoExpandAiSidebar ?? DEFAULT_STATE.autoExpandAiSidebar;
export const selectAiSidebarDefaultWidth = (state) =>
  state.settings.aiSidebarDefaultWidth ?? DEFAULT_STATE.aiSidebarDefaultWidth;

// 导出 reducer
export default settingsSlice.reducer;
