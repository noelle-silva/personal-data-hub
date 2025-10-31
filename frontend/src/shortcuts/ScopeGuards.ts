import { ScopeGuard, ShortcutScope } from './types';

/**
 * 检查元素是否为输入类元素
 */
const isInputElement = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  const inputTypes = ['input', 'textarea', 'select'];
  
  return inputTypes.includes(tagName) || 
         element.getAttribute('contenteditable') === 'true' ||
         element.classList.contains('monaco-editor') ||
         element.classList.contains('ace_editor');
};

/**
 * 检查元素是否被标记为跳过快捷键
 */
const hasSkipAttribute = (element: Element): boolean => {
  return element.hasAttribute('data-hotkeys-skip') ||
         element.closest('[data-hotkeys-skip]') !== null;
};

/**
 * 检查元素是否被标记为允许快捷键
 */
const hasAllowAttribute = (element: Element): boolean => {
  return element.hasAttribute('data-hotkeys-allow') ||
         element.closest('[data-hotkeys-allow]') !== null;
};

/**
 * 检查是否在模态框内
 */
const isInModal = (): boolean => {
  return document.querySelector('[role="dialog"]') !== null ||
         document.querySelector('.MuiModal-root') !== null ||
         document.querySelector('.MuiDialog-root') !== null;
};

/**
 * 检查是否在编辑器内
 */
const isInEditor = (element: Element): boolean => {
  return element.closest('.monaco-editor') !== null ||
         element.closest('.ace_editor') !== null ||
         element.closest('[contenteditable="true"]') !== null ||
         element.classList.contains('monaco-editor') ||
         element.classList.contains('ace_editor');
};

/**
 * 默认的作用域守卫
 */
export const defaultScopeGuard: ScopeGuard = (event: KeyboardEvent): boolean => {
  const target = event.target as Element;
  
  // 如果目标元素不存在，允许触发
  if (!target) {
    return true;
  }
  
  // 如果目标元素被明确标记为允许，则允许触发
  if (hasAllowAttribute(target)) {
    return true;
  }
  
  // 如果目标元素被标记为跳过，则阻止触发
  if (hasSkipAttribute(target)) {
    return false;
  }
  
  // 如果目标元素是输入类元素，则阻止触发
  if (isInputElement(target)) {
    return false;
  }
  
  return true;
};

/**
 * 全局作用域守卫（始终允许）
 */
export const globalScopeGuard: ScopeGuard = (): boolean => {
  return true;
};

/**
 * 模态框作用域守卫
 */
export const modalScopeGuard: ScopeGuard = (event: KeyboardEvent): boolean => {
  // 如果不在模态框内，则不触发
  if (!isInModal()) {
    return false;
  }
  
  // 在模态框内，使用默认守卫
  return defaultScopeGuard(event);
};

/**
 * 编辑器安全域守卫（在编辑器内不触发）
 */
export const editorSafeScopeGuard: ScopeGuard = (event: KeyboardEvent): boolean => {
  const target = event.target as Element;
  
  // 如果在编辑器内，则不触发
  if (isInEditor(target)) {
    return false;
  }
  
  // 否则使用默认守卫
  return defaultScopeGuard(event);
};

/**
 * 输入框安全域守卫（在输入框内不触发）
 */
export const inputSafeScopeGuard: ScopeGuard = (event: KeyboardEvent): boolean => {
  const target = event.target as Element;
  
  // 如果目标元素是输入类元素，则不触发
  if (isInputElement(target)) {
    return false;
  }
  
  // 否则允许触发
  return true;
};

/**
 * 根据作用域获取对应的守卫函数
 */
export const getScopeGuard = (scope: ShortcutScope): ScopeGuard => {
  switch (scope) {
    case 'global':
      return globalScopeGuard;
    case 'modal':
      return modalScopeGuard;
    case 'editor-safe':
      return editorSafeScopeGuard;
    case 'input-safe':
      return inputSafeScopeGuard;
    default:
      return defaultScopeGuard;
  }
};

/**
 * 组合多个守卫函数
 */
export const combineGuards = (...guards: ScopeGuard[]): ScopeGuard => {
  return (event: KeyboardEvent): boolean => {
    return guards.every(guard => guard(event));
  };
};

/**
 * 创建自定义守卫函数
 */
export const createCustomGuard = (customFilter: (event: KeyboardEvent) => boolean): ScopeGuard => {
  return (event: KeyboardEvent): boolean => {
    // 先应用默认守卫
    if (!defaultScopeGuard(event)) {
      return false;
    }
    
    // 然后应用自定义过滤器
    return customFilter(event);
  };
};