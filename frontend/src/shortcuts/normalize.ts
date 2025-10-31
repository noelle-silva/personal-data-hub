/**
 * 快捷键规范化工具
 * 用于将键盘事件和字符串转换为标准化的快捷键组合
 */

/**
 * 将键盘事件规范化为快捷键组合字符串
 */
export const normalizeKeyEventToCombo = (event: KeyboardEvent): string => {
  const modifiers: string[] = [];
  
  // 收集修饰键
  if (event.ctrlKey) modifiers.push('ctrl');
  if (event.altKey) modifiers.push('alt');
  if (event.shiftKey) modifiers.push('shift');
  if (event.metaKey) modifiers.push('meta');
  
  // 处理主键
  let mainKey = '';
  
  // 特殊处理 AltGraph (常见于某些国际键盘)
  if (event.key === 'AltGraph') {
    modifiers.push('ctrl');
    modifiers.push('alt');
    mainKey = 'altgraph';
  } else {
    // 使用 event.code 而不是 event.key 来获得更一致的键码
    switch (event.code) {
      // 字母键
      case 'KeyA': case 'KeyB': case 'KeyC': case 'KeyD': case 'KeyE':
      case 'KeyF': case 'KeyG': case 'KeyH': case 'KeyI': case 'KeyJ':
      case 'KeyK': case 'KeyL': case 'KeyM': case 'KeyN': case 'KeyO':
      case 'KeyP': case 'KeyQ': case 'KeyR': case 'KeyS': case 'KeyT':
      case 'KeyU': case 'KeyV': case 'KeyW': case 'KeyX': case 'KeyY':
      case 'KeyZ':
        mainKey = event.code.replace('Key', '').toLowerCase();
        break;
        
      // 数字键
      case 'Digit0': case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
      case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8': case 'Digit9':
        mainKey = event.code.replace('Digit', '');
        break;
        
      // 功能键
      case 'F1': case 'F2': case 'F3': case 'F4': case 'F5':
      case 'F6': case 'F7': case 'F8': case 'F9': case 'F10':
      case 'F11': case 'F12':
        mainKey = event.code.toLowerCase();
        break;
        
      // 特殊键
      case 'Space':
        mainKey = 'space';
        break;
      case 'Enter':
        mainKey = 'enter';
        break;
      case 'Escape':
        mainKey = 'esc';
        break;
      case 'Backspace':
        mainKey = 'backspace';
        break;
      case 'Tab':
        mainKey = 'tab';
        break;
      case 'CapsLock':
        mainKey = 'capslock';
        break;
      case 'ArrowUp':
        mainKey = 'up';
        break;
      case 'ArrowDown':
        mainKey = 'down';
        break;
      case 'ArrowLeft':
        mainKey = 'left';
        break;
      case 'ArrowRight':
        mainKey = 'right';
        break;
      case 'Home':
        mainKey = 'home';
        break;
      case 'End':
        mainKey = 'end';
        break;
      case 'PageUp':
        mainKey = 'pageup';
        break;
      case 'PageDown':
        mainKey = 'pagedown';
        break;
      case 'Insert':
        mainKey = 'insert';
        break;
      case 'Delete':
        mainKey = 'delete';
        break;
        
      // 标点符号
      case 'Minus':
        mainKey = '-';
        break;
      case 'Equal':
        mainKey = '=';
        break;
      case 'BracketLeft':
        mainKey = '[';
        break;
      case 'BracketRight':
        mainKey = ']';
        break;
      case 'Semicolon':
        mainKey = ';';
        break;
      case 'Quote':
        mainKey = "'";
        break;
      case 'Backquote':
        mainKey = '`';
        break;
      case 'Backslash':
        mainKey = '\\';
        break;
      case 'Comma':
        mainKey = ',';
        break;
      case 'Period':
        mainKey = '.';
        break;
      case 'Slash':
        mainKey = '/';
        break;
        
      default:
        // 对于其他键，使用 event.key 的小写形式
        mainKey = event.key.toLowerCase();
        break;
    }
  }
  
  // 组合所有键
  const allKeys = [...modifiers, mainKey];
  return allKeys.join('+');
};

/**
 * 将快捷键字符串规范化为标准格式
 */
export const normalizeComboString = (combo: string): string => {
  if (!combo) return '';
  
  return combo
    .toLowerCase()
    .trim()
    // 标准化分隔符
    .replace(/[,\s]+/g, '+')
    // 移除多余的加号
    .replace(/\+/g, '+')
    // 移除首尾加号
    .replace(/^\+|\+$/g, '')
    // 标准化修饰键名称
    .replace(/control/i, 'ctrl')
    .replace(/cmd|command/i, 'meta')
    .replace(/option/i, 'alt')
    .replace(/shift/i, 'shift');
};

/**
 * 检查两个快捷键组合是否冲突
 */
export const areCombosConflicting = (combo1: string, combo2: string): boolean => {
  const normalized1 = normalizeComboString(combo1);
  const normalized2 = normalizeComboString(combo2);
  return normalized1 === normalized2;
};

/**
 * 将快捷键组合转换为显示文本
 */
export const comboToDisplayText = (combo: string): string => {
  if (!combo) return '';
  
  const normalized = normalizeComboString(combo);
  const parts = normalized.split('+');
  
  const displayMap: Record<string, string> = {
    'ctrl': 'Ctrl',
    'alt': 'Alt',
    'shift': 'Shift',
    'meta': 'Meta',
    'space': 'Space',
    'enter': 'Enter',
    'esc': 'Esc',
    'backspace': 'Backspace',
    'tab': 'Tab',
    'capslock': 'CapsLock',
    'up': '↑',
    'down': '↓',
    'left': '←',
    'right': '→',
    'home': 'Home',
    'end': 'End',
    'pageup': 'PageUp',
    'pagedown': 'PageDown',
    'insert': 'Insert',
    'delete': 'Delete',
  };
  
  return parts
    .map(part => displayMap[part] || part.toUpperCase())
    .join(' + ');
};