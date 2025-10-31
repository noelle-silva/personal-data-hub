import {
  ShortcutMap,
  ShortcutActionId,
  ShortcutScope,
  ShortcutHandler,
  Platform,
  PlatformMapper,
  ScopeGuard
} from './types';
import { getScopeGuard } from './ScopeGuards';
import { getPlatform } from './Persistence';

// 兼容 ESM/CJS 导入方式，确保在不同构建环境下都能正确获取 hotkeys-js
const hotkeys: any = (require('hotkeys-js') as any).default || require('hotkeys-js');

/**
 * 热键管理器类
 */
class KeybindingManager {
  private static instance: KeybindingManager;
  private registeredBindings: Map<string, ShortcutHandler> = new Map();
  private scopeGuards: Map<ShortcutScope, ScopeGuard> = new Map();
  private isEnabled: boolean = true;
  private platform: Platform = getPlatform();

  private constructor() {
    this.initializeDefaultGuards();
    // 将 hotkeys.filter 设为始终 true，把输入/编辑器屏蔽逻辑统一交给 ScopeGuards
    (hotkeys as any).filter = () => true;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): KeybindingManager {
    if (!KeybindingManager.instance) {
      KeybindingManager.instance = new KeybindingManager();
    }
    return KeybindingManager.instance;
  }

  /**
   * 初始化默认作用域守卫
   */
  private initializeDefaultGuards(): void {
    this.scopeGuards.set('global', getScopeGuard('global'));
    this.scopeGuards.set('modal', getScopeGuard('modal'));
    this.scopeGuards.set('editor-safe', getScopeGuard('editor-safe'));
    this.scopeGuards.set('input-safe', getScopeGuard('input-safe'));
  }

  /**
   * 平台映射器：将通用快捷键映射为平台特定的快捷键
   */
  private platformMapper: PlatformMapper = (combo: string, platform: Platform): string => {
    // 将 command 替换为 meta（hotkeys-js 的标准）
    return combo.replace(/command/g, 'meta');
  };

  /**
   * 设置平台映射器
   */
  public setPlatformMapper(mapper: PlatformMapper): void {
    this.platformMapper = mapper;
  }

  /**
   * 设置自定义作用域守卫
   */
  public setScopeGuard(scope: ShortcutScope, guard: ScopeGuard): void {
    this.scopeGuards.set(scope, guard);
  }

  /**
   * 启用快捷键系统
   */
  public enable(): void {
    this.isEnabled = true;
  }

  /**
   * 禁用快捷键系统
   */
  public disable(): void {
    this.isEnabled = false;
  }

  /**
   * 检查快捷键系统是否启用
   */
  public isSystemEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 创建过滤器字符串
   */
  private createFilter(scope: ShortcutScope): string {
    // hotkeys-js 的过滤器是字符串选择器
    // 根据作用域返回不同的选择器
    switch (scope) {
      case 'global':
        return '*'; // 全局
      case 'modal':
        return '.MuiModal-root, [role="dialog"]'; // 仅在模态框内
      case 'editor-safe':
        return ':not(.monaco-editor):not(.ace_editor):not([contenteditable])'; // 排除编辑器
      case 'input-safe':
        return ':not(input):not(textarea):not(select):not([contenteditable])'; // 排除输入元素
      default:
        return 'input, select, textarea, [contenteditable], .monaco-editor, .ace_editor, [data-hotkeys-skip]';
    }
  }

  /**
   * 创建事件处理器包装器
   */
  private createHandler(
    actionId: ShortcutActionId,
    scope: ShortcutScope,
    originalHandler: ShortcutHandler
  ): any {
    const guard = this.scopeGuards.get(scope);
    
    return (event: KeyboardEvent, handler: any): void => {
      console.debug(`快捷键事件触发: ${actionId}`, {
        key: event.key,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        shortcut: handler.shortcut,
        target: event.target
      });
      
      // 首先检查系统是否启用
      if (!this.isEnabled) {
        console.debug('快捷键系统已禁用，忽略事件');
        return;
      }

      // 检查作用域守卫
      if (guard && !guard(event)) {
        console.debug('作用域守卫阻止了快捷键触发');
        return;
      }

      console.debug(`快捷键通过所有检查，执行动作: ${actionId}`);
      
      // 阻止默认行为
      event.preventDefault();
      event.stopPropagation();
      
      // 调用原始处理器
      originalHandler(event, handler.shortcut);
    };
  }

  /**
   * 注册快捷键映射
   */
  public register(shortcuts: ShortcutMap): void {
    // 先清除所有已注册的快捷键
    this.unregister();

    // 注册新的快捷键
    Object.entries(shortcuts).forEach(([actionId, entry]) => {
      if (!entry.enabled) {
        return; // 跳过已禁用的快捷键
      }

      const combo = this.platformMapper(entry.primary, this.platform);
      const filter = this.createFilter(entry.scope);
      
      const wrapped = this.createHandler(actionId as ShortcutActionId, entry.scope, (event, combo) => {
        // 调用注册的处理器
        const registeredHandler = this.registeredBindings.get(actionId);
        if (registeredHandler) {
          registeredHandler(event, combo);
        }
      });

      // 注册快捷键 - 使用正确的hotkeys-js API
      console.debug(`尝试注册快捷键: ${actionId} -> ${combo} (作用域: ${entry.scope})`);
      
      // 使用标准的hotkeys调用方式，避免变量名遮蔽
      (hotkeys as any)(combo, (event, hotkeyInfo) => {
        console.debug(`hotkeys事件触发: ${actionId}`, { event, hotkeyInfo });
        wrapped(event, hotkeyInfo);
      });
      console.debug(`成功注册主快捷键: ${actionId} -> ${combo}`);
      
      // 保存处理器引用
      this.registeredBindings.set(actionId, wrapped);

      // 发出诊断事件
      window.dispatchEvent(new CustomEvent('shortcut-registered', {
        detail: { actionId, combo, scope: entry.scope, type: 'primary' }
      }));

      // 如果有备用快捷键，也注册它
      if (entry.secondary) {
        const secondaryCombo = this.platformMapper(entry.secondary, this.platform);
        console.debug(`尝试注册备用快捷键: ${actionId} -> ${secondaryCombo}`);
        (hotkeys as any)(secondaryCombo, (event, hotkeyInfo) => {
          console.debug(`hotkeys备用快捷键事件触发: ${actionId}`, { event, hotkeyInfo });
          wrapped(event, hotkeyInfo);
        });
        console.debug(`成功注册备用快捷键: ${actionId} -> ${secondaryCombo}`);
        
        // 发出诊断事件
        window.dispatchEvent(new CustomEvent('shortcut-registered', {
          detail: { actionId, combo: secondaryCombo, scope: entry.scope, type: 'secondary' }
        }));
      }
    });
  }

  /**
   * 注册单个快捷键
   */
  public registerSingle(
    actionId: ShortcutActionId, 
    combo: string, 
    scope: ShortcutScope, 
    handler: ShortcutHandler
  ): void {
    const mappedCombo = this.platformMapper(combo, this.platform);
    const filter = this.createFilter(scope);
    
    const wrappedHandler = this.createHandler(actionId, scope, handler);

    console.debug(`尝试注册单个快捷键: ${actionId} -> ${mappedCombo} (作用域: ${scope})`);
    
    // 保存处理器引用
    this.registeredBindings.set(actionId, wrappedHandler);
    
    // 使用标准的hotkeys调用方式，注意参数名不能与外层wrappedHandler冲突
    (hotkeys as any)(mappedCombo, (event, hotkeyInfo) => {
      console.debug(`hotkeys单个快捷键事件触发: ${actionId}`, { event, hotkeyInfo });
      wrappedHandler(event, hotkeyInfo);
    });
    console.debug(`成功注册单个快捷键: ${actionId} -> ${mappedCombo}`);
    
    // 发出诊断事件
    window.dispatchEvent(new CustomEvent('shortcut-registered', {
      detail: { actionId, combo: mappedCombo, scope, type: 'single' }
    }));
  }

  /**
   * 注销所有快捷键
   */
  public unregister(): void {
    // 记录即将注销的快捷键
    const registeredKeys = Array.from(this.registeredBindings.keys());
    
    (hotkeys as any).unbind();
    this.registeredBindings.clear();
    console.debug('已注销所有快捷键');
    
    // 发出诊断事件
    window.dispatchEvent(new CustomEvent('shortcut-unregistered', {
      detail: { actionIds: registeredKeys, type: 'all' }
    }));
  }

  /**
   * 注销单个快捷键
   */
  public unregisterSingle(actionId: ShortcutActionId): void {
    this.registeredBindings.delete(actionId);
    // hotkeys-js 不支持单个注销，所以需要重新注册其他快捷键
    console.debug(`注销快捷键: ${actionId}`);
    
    // 发出诊断事件
    window.dispatchEvent(new CustomEvent('shortcut-unregistered', {
      detail: { actionIds: [actionId], type: 'single' }
    }));
  }

  /**
   * 获取当前平台
   */
  public getPlatform(): Platform {
    return this.platform;
  }

  /**
   * 设置平台（用于测试）
   */
  public setPlatform(platform: Platform): void {
    this.platform = platform;
  }

  /**
   * 检查快捷键是否被注册
   */
  public isRegistered(actionId: ShortcutActionId): boolean {
    return this.registeredBindings.has(actionId);
  }

  /**
   * 获取所有已注册的快捷键ID
   */
  public getRegisteredActionIds(): ShortcutActionId[] {
    return Array.from(this.registeredBindings.keys()) as ShortcutActionId[];
  }

  /**
   * 获取快捷键的显示文本（用户友好的格式）
   */
  public getDisplayText(combo: string): string {
    return combo
      .replace(/\+/g, ' + ')
      .replace(/meta/g, '⌘')
      .replace(/ctrl/g, 'Ctrl')
      .replace(/alt/g, 'Alt')
      .replace(/shift/g, 'Shift')
      .replace(/space/g, 'Space')
      .replace(/enter/g, 'Enter')
      .replace(/escape/g, 'Esc')
      .replace(/tab/g, 'Tab')
      .replace(/backspace/g, 'Backspace')
      .replace(/delete/g, 'Delete')
      .replace(/home/g, 'Home')
      .replace(/end/g, 'End')
      .replace(/pageup/g, 'Page Up')
      .replace(/pagedown/g, 'Page Down')
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' + ');
  }

  /**
   * 解析快捷键字符串为组件
   */
  public parseCombo(combo: string): {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    key: string;
  } {
    const parts = combo.toLowerCase().split('+');
    const result = {
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
      key: '',
    };

    parts.forEach(part => {
      switch (part) {
        case 'ctrl':
        case 'control':
          result.ctrl = true;
          break;
        case 'alt':
          result.alt = true;
          break;
        case 'shift':
          result.shift = true;
          break;
        case 'meta':
        case 'cmd':
        case 'command':
          result.meta = true;
          break;
        default:
          result.key = part;
          break;
      }
    });

    return result;
  }

  /**
   * 验证快捷键字符串格式
   */
  public validateCombo(combo: string): boolean {
    if (!combo || typeof combo !== 'string') {
      return false;
    }

    const parts = combo.toLowerCase().split('+');
    const validModifiers = ['ctrl', 'alt', 'shift', 'meta', 'cmd', 'command'];
    const validKeys = [
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
      'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
      'space', 'enter', 'escape', 'tab', 'backspace', 'delete', 'home', 'end',
      'pageup', 'pagedown', 'up', 'down', 'left', 'right',
      'insert', 'pause', 'scrolllock', 'numlock', 'capslock'
    ];

    let hasKey = false;
    
    for (const part of parts) {
      if (validKeys.includes(part)) {
        hasKey = true;
      } else if (!validModifiers.includes(part)) {
        return false;
      }
    }

    return hasKey && parts.length > 0;
  }
}

export default KeybindingManager;