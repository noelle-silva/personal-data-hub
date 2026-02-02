/**
 * Tab Action 按钮样式工具
 * 提供统一的炫酷按钮样式，供 HTML 沙盒和 Markdown 内联渲染共同使用
 */

/**
 * 生成非作用域化的炫酷按钮 CSS
 * 用于 HTML 沙盒环境
 * @returns {string} CSS 样式字符串
 */
export const generateTabActionFancyCssUnscoped = () => {
  return `
    /* 项目特有动作按钮样式 */
    .tab-action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      margin: 4px;
      border: none;
      border-radius: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      min-height: 36px;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      position: relative;
      overflow: hidden;
    }
    
    .tab-action-button::before {
      content: "";
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 10px;
      position: relative;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 70%, transparent 100%);
      border-radius: 50%;
      box-shadow:
        0 0 0 2px rgba(255,255,255,0.3),
        0 0 20px rgba(102, 126, 234, 0.6),
        inset 0 0 10px rgba(255,255,255,0.2);
      animation: tab-action-pulse 2s infinite;
    }
    
    .tab-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 6px;
      background: rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow:
        0 0 6px rgba(255,255,255,0.8),
        0 0 12px rgba(102, 126, 234, 0.6);
    }
    
    .tab-action-button::before::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: tab-action-rotate 3s linear infinite;
    }
    
    .tab-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: tab-action-rotate-reverse 3s linear infinite;
    }
    
    .tab-action-button::before::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: tab-action-vertical-pulse 1.5s infinite;
    }
    
    .tab-action-button::before::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: tab-action-vertical-pulse 1.5s infinite 0.75s;
    }
    
    .tab-action-button::before::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: tab-action-horizontal-pulse 1.5s infinite 0.375s;
    }
    
    .tab-action-button::before::after {
      content: "";
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: tab-action-horizontal-pulse 1.5s infinite 1.125s;
    }
    
    @keyframes tab-action-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.3),
          0 0 20px rgba(102, 126, 234, 0.6),
          inset 0 0 10px rgba(255,255,255,0.2);
      }
      50% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.6),
          0 0 30px rgba(102, 126, 234, 0.8),
          inset 0 0 15px rgba(255,255,255,0.4);
      }
    }
    
    @keyframes tab-action-rotate {
      from { transform: translate(-50%, -50%) rotate(45deg); }
      to { transform: translate(-50%, -50%) rotate(405deg); }
    }
    
    @keyframes tab-action-rotate-reverse {
      from { transform: translate(-50%, -50%) rotate(-45deg); }
      to { transform: translate(-50%, -50%) rotate(315deg); }
    }
    
    @keyframes tab-action-vertical-pulse {
      0%, 100% {
        height: 6px;
        opacity: 0.7;
      }
      50% {
        height: 8px;
        opacity: 1;
      }
    }
    
    @keyframes tab-action-horizontal-pulse {
      0%, 100% {
        width: 6px;
        opacity: 0.7;
      }
      50% {
        width: 8px;
        opacity: 1;
      }
    }
    
    .tab-action-button:hover {
      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }
    
    .tab-action-button:active {
      transform: translateY(-1px) scale(1.01);
      box-shadow: 0 3px 12px rgba(102, 126, 234, 0.4);
    }
    
    .tab-action-button[data-variant="secondary"] {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
    }
    
    .tab-action-button[data-variant="secondary"]:hover {
      background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
      box-shadow: 0 6px 20px rgba(240, 147, 251, 0.5);
    }
    
    .tab-action-button[data-variant="success"] {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);
    }
    
    .tab-action-button[data-variant="success"]:hover {
      background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
      box-shadow: 0 6px 20px rgba(79, 172, 254, 0.5);
    }
    
    /* 动画光效 */
    .tab-action-button::after {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s;
    }
    
    .tab-action-button:hover::after {
      left: 100%;
    }
  `;
};

/**
 * 生成作用域化的炫酷按钮 CSS
 * 用于 Markdown 内联渲染环境
 * @param {string} scopeClass - 作用域类名，默认为 'markdown-body'
 * @returns {string} 作用域化的 CSS 样式字符串
 */
export const generateTabActionFancyCssScoped = (scopeClass = 'markdown-body') => {
  return `
    /* 项目特有动作按钮样式 - 作用域化 */
    .${scopeClass} .tab-action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      margin: 4px;
      border: none;
      border-radius: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      min-height: 36px;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      position: relative;
      overflow: hidden;
    }
    
    .${scopeClass} .tab-action-button::before {
      content: "";
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 10px;
      position: relative;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 70%, transparent 100%);
      border-radius: 50%;
      box-shadow:
        0 0 0 2px rgba(255,255,255,0.3),
        0 0 20px rgba(102, 126, 234, 0.6),
        inset 0 0 10px rgba(255,255,255,0.2);
      animation: tab-action-pulse 2s infinite;
    }
    
    .${scopeClass} .tab-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 6px;
      background: rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow:
        0 0 6px rgba(255,255,255,0.8),
        0 0 12px rgba(102, 126, 234, 0.6);
    }
    
    .${scopeClass} .tab-action-button::before::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: tab-action-rotate 3s linear infinite;
    }
    
    .${scopeClass} .tab-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: tab-action-rotate-reverse 3s linear infinite;
    }
    
    .${scopeClass} .tab-action-button::before::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: tab-action-vertical-pulse 1.5s infinite;
    }
    
    .${scopeClass} .tab-action-button::before::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: tab-action-vertical-pulse 1.5s infinite 0.75s;
    }
    
    .${scopeClass} .tab-action-button::before::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: tab-action-horizontal-pulse 1.5s infinite 0.375s;
    }
    
    .${scopeClass} .tab-action-button::before::after {
      content: "";
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: tab-action-horizontal-pulse 1.5s infinite 1.125s;
    }
    
    @keyframes tab-action-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.3),
          0 0 20px rgba(102, 126, 234, 0.6),
          inset 0 0 10px rgba(255,255,255,0.2);
      }
      50% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.6),
          0 0 30px rgba(102, 126, 234, 0.8),
          inset 0 0 15px rgba(255,255,255,0.4);
      }
    }
    
    @keyframes tab-action-rotate {
      from { transform: translate(-50%, -50%) rotate(45deg); }
      to { transform: translate(-50%, -50%) rotate(405deg); }
    }
    
    @keyframes tab-action-rotate-reverse {
      from { transform: translate(-50%, -50%) rotate(-45deg); }
      to { transform: translate(-50%, -50%) rotate(315deg); }
    }
    
    @keyframes tab-action-vertical-pulse {
      0%, 100% {
        height: 6px;
        opacity: 0.7;
      }
      50% {
        height: 8px;
        opacity: 1;
      }
    }
    
    @keyframes tab-action-horizontal-pulse {
      0%, 100% {
        width: 6px;
        opacity: 0.7;
      }
      50% {
        width: 8px;
        opacity: 1;
      }
    }
    
    .${scopeClass} .tab-action-button:hover {
      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }
    
    .${scopeClass} .tab-action-button:active {
      transform: translateY(-1px) scale(1.01);
      box-shadow: 0 3px 12px rgba(102, 126, 234, 0.4);
    }
    
    .${scopeClass} .tab-action-button[data-variant="secondary"] {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
    }
    
    .${scopeClass} .tab-action-button[data-variant="secondary"]:hover {
      background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
      box-shadow: 0 6px 20px rgba(240, 147, 251, 0.5);
    }
    
    .${scopeClass} .tab-action-button[data-variant="success"] {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);
    }
    
    .${scopeClass} .tab-action-button[data-variant="success"]:hover {
      background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
      box-shadow: 0 6px 20px rgba(79, 172, 254, 0.5);
    }
    
    /* 动画光效 - 作用域化 */
    .${scopeClass} .tab-action-button::after {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s;
    }
    
    .${scopeClass} .tab-action-button:hover::after {
      left: 100%;
    }
  `;
};

/**
 * 生成非作用域化的收藏夹专用炫酷按钮 CSS
 * 用于 HTML 沙盒环境
 * @returns {string} CSS 样式字符串
 */
export const generateQuoteActionFancyCssUnscoped = () => {
  return `
    /* 收藏夹专用动作按钮样式 */
    .quote-action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      margin: 4px;
      border: none;
      border-radius: 20px;
      background: linear-gradient(135deg, #FF6B35 0%, #F72585 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      min-height: 36px;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
      position: relative;
      overflow: hidden;
    }
    
    .quote-action-button::before {
      content: "";
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 10px;
      position: relative;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 70%, transparent 100%);
      border-radius: 50%;
      box-shadow:
        0 0 0 2px rgba(255,255,255,0.3),
        0 0 20px rgba(255, 107, 53, 0.6),
        inset 0 0 10px rgba(255,255,255,0.2);
      animation: quote-action-pulse 2s infinite;
    }
    
    .quote-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 6px;
      background: rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow:
        0 0 6px rgba(255,255,255,0.8),
        0 0 12px rgba(255, 107, 53, 0.6);
    }
    
    .quote-action-button::before::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: quote-action-rotate 3s linear infinite;
    }
    
    .quote-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: quote-action-rotate-reverse 3s linear infinite;
    }
    
    .quote-action-button::before::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: quote-action-vertical-pulse 1.5s infinite;
    }
    
    .quote-action-button::before::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: quote-action-vertical-pulse 1.5s infinite 0.75s;
    }
    
    .quote-action-button::before::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: quote-action-horizontal-pulse 1.5s infinite 0.375s;
    }
    
    .quote-action-button::before::after {
      content: "";
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: quote-action-horizontal-pulse 1.5s infinite 1.125s;
    }
    
    @keyframes quote-action-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.3),
          0 0 20px rgba(255, 107, 53, 0.6),
          inset 0 0 10px rgba(255,255,255,0.2);
      }
      50% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.6),
          0 0 30px rgba(255, 107, 53, 0.8),
          inset 0 0 15px rgba(255,255,255,0.4);
      }
    }
    
    @keyframes quote-action-rotate {
      from { transform: translate(-50%, -50%) rotate(45deg); }
      to { transform: translate(-50%, -50%) rotate(405deg); }
    }
    
    @keyframes quote-action-rotate-reverse {
      from { transform: translate(-50%, -50%) rotate(-45deg); }
      to { transform: translate(-50%, -50%) rotate(315deg); }
    }
    
    @keyframes quote-action-vertical-pulse {
      0%, 100% {
        height: 6px;
        opacity: 0.7;
      }
      50% {
        height: 8px;
        opacity: 1;
      }
    }
    
    @keyframes quote-action-horizontal-pulse {
      0%, 100% {
        width: 6px;
        opacity: 0.7;
      }
      50% {
        width: 8px;
        opacity: 1;
      }
    }
    
    .quote-action-button:hover {
      background: linear-gradient(135deg, #F72585 0%, #FF6B35 100%);
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
    }
    
    .quote-action-button:active {
      transform: translateY(-1px) scale(1.01);
      box-shadow: 0 3px 12px rgba(255, 107, 53, 0.4);
    }
    
    .quote-action-button[data-variant="secondary"] {
      background: linear-gradient(135deg, #8338EC 0%, #FB5607 100%);
      box-shadow: 0 4px 15px rgba(131, 56, 236, 0.4);
    }
    
    .quote-action-button[data-variant="secondary"]:hover {
      background: linear-gradient(135deg, #FB5607 0%, #8338EC 100%);
      box-shadow: 0 6px 20px rgba(131, 56, 236, 0.5);
    }
    
    .quote-action-button[data-variant="success"] {
      background: linear-gradient(135deg, #FFBE0B 0%, #06FFA5 100%);
      box-shadow: 0 4px 15px rgba(255, 190, 11, 0.4);
    }
    
    .quote-action-button[data-variant="success"]:hover {
      background: linear-gradient(135deg, #06FFA5 0%, #FFBE0B 100%);
      box-shadow: 0 6px 20px rgba(255, 190, 11, 0.5);
    }
    
    /* 动画光效 */
    .quote-action-button::after {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s;
    }
    
    .quote-action-button:hover::after {
      left: 100%;
    }
  `;
};

/**
 * 生成作用域化的收藏夹专用炫酷按钮 CSS
 * 用于 Markdown 内联渲染环境
 * @param {string} scopeClass - 作用域类名，默认为 'markdown-body'
 * @returns {string} 作用域化的 CSS 样式字符串
 */
export const generateQuoteActionFancyCssScoped = (scopeClass = 'markdown-body') => {
  return `
    /* 收藏夹专用动作按钮样式 - 作用域化 */
    .${scopeClass} .quote-action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      margin: 4px;
      border: none;
      border-radius: 20px;
      background: linear-gradient(135deg, #FF6B35 0%, #F72585 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      min-height: 36px;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
      position: relative;
      overflow: hidden;
    }
    
    .${scopeClass} .quote-action-button::before {
      content: "";
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 10px;
      position: relative;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 70%, transparent 100%);
      border-radius: 50%;
      box-shadow:
        0 0 0 2px rgba(255,255,255,0.3),
        0 0 20px rgba(255, 107, 53, 0.6),
        inset 0 0 10px rgba(255,255,255,0.2);
      animation: quote-action-pulse 2s infinite;
    }
    
    .${scopeClass} .quote-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 6px;
      background: rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow:
        0 0 6px rgba(255,255,255,0.8),
        0 0 12px rgba(255, 107, 53, 0.6);
    }
    
    .${scopeClass} .quote-action-button::before::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: quote-action-rotate 3s linear infinite;
    }
    
    .${scopeClass} .quote-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: quote-action-rotate-reverse 3s linear infinite;
    }
    
    .${scopeClass} .quote-action-button::before::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: quote-action-vertical-pulse 1.5s infinite;
    }
    
    .${scopeClass} .quote-action-button::before::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: quote-action-vertical-pulse 1.5s infinite 0.75s;
    }
    
    .${scopeClass} .quote-action-button::before::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: quote-action-horizontal-pulse 1.5s infinite 0.375s;
    }
    
    .${scopeClass} .quote-action-button::before::after {
      content: "";
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: quote-action-horizontal-pulse 1.5s infinite 1.125s;
    }
    
    @keyframes quote-action-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.3),
          0 0 20px rgba(255, 107, 53, 0.6),
          inset 0 0 10px rgba(255,255,255,0.2);
      }
      50% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.6),
          0 0 30px rgba(255, 107, 53, 0.8),
          inset 0 0 15px rgba(255,255,255,0.4);
      }
    }
    
    @keyframes quote-action-rotate {
      from { transform: translate(-50%, -50%) rotate(45deg); }
      to { transform: translate(-50%, -50%) rotate(405deg); }
    }
    
    @keyframes quote-action-rotate-reverse {
      from { transform: translate(-50%, -50%) rotate(-45deg); }
      to { transform: translate(-50%, -50%) rotate(315deg); }
    }
    
    @keyframes quote-action-vertical-pulse {
      0%, 100% {
        height: 6px;
        opacity: 0.7;
      }
      50% {
        height: 8px;
        opacity: 1;
      }
    }
    
    @keyframes quote-action-horizontal-pulse {
      0%, 100% {
        width: 6px;
        opacity: 0.7;
      }
      50% {
        width: 8px;
        opacity: 1;
      }
    }
    
    .${scopeClass} .quote-action-button:hover {
      background: linear-gradient(135deg, #F72585 0%, #FF6B35 100%);
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
    }
    
    .${scopeClass} .quote-action-button:active {
      transform: translateY(-1px) scale(1.01);
      box-shadow: 0 3px 12px rgba(255, 107, 53, 0.4);
    }
    
    .${scopeClass} .quote-action-button[data-variant="secondary"] {
      background: linear-gradient(135deg, #8338EC 0%, #FB5607 100%);
      box-shadow: 0 4px 15px rgba(131, 56, 236, 0.4);
    }
    
    .${scopeClass} .quote-action-button[data-variant="secondary"]:hover {
      background: linear-gradient(135deg, #FB5607 0%, #8338EC 100%);
      box-shadow: 0 6px 20px rgba(131, 56, 236, 0.5);
    }
    
    .${scopeClass} .quote-action-button[data-variant="success"] {
      background: linear-gradient(135deg, #FFBE0B 0%, #06FFA5 100%);
      box-shadow: 0 4px 15px rgba(255, 190, 11, 0.4);
    }
    
    .${scopeClass} .quote-action-button[data-variant="success"]:hover {
      background: linear-gradient(135deg, #06FFA5 0%, #FFBE0B 100%);
      box-shadow: 0 6px 20px rgba(255, 190, 11, 0.5);
    }
    
    /* 动画光效 - 作用域化 */
    .${scopeClass} .quote-action-button::after {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s;
    }
    
    .${scopeClass} .quote-action-button:hover::after {
      left: 100%;
    }
  `;
};

/**
 * 生成非作用域化的附件专用炫酷按钮 CSS
 * 用于 HTML 沙盒环境
 * @returns {string} CSS 样式字符串
 */
export const generateAttachmentActionFancyCssUnscoped = () => {
  return `
    /* 附件专用动作按钮样式 */
    .attachment-action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      margin: 4px;
      border: none;
      border-radius: 20px;
      background: linear-gradient(135deg, #A7F3D0 0%, #34D399 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      min-height: 36px;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(52, 211, 153, 0.4);
      position: relative;
      overflow: hidden;
    }
    
    .attachment-action-button::before {
      content: "";
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 10px;
      position: relative;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 70%, transparent 100%);
      border-radius: 50%;
      box-shadow:
        0 0 0 2px rgba(255,255,255,0.3),
        0 0 20px rgba(52, 211, 153, 0.6),
        inset 0 0 10px rgba(255,255,255,0.2);
      animation: attachment-action-pulse 2s infinite;
    }
    
    .attachment-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 6px;
      background: rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow:
        0 0 6px rgba(255,255,255,0.8),
        0 0 12px rgba(52, 211, 153, 0.6);
    }
    
    .attachment-action-button::before::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: attachment-action-rotate 3s linear infinite;
    }
    
    .attachment-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: attachment-action-rotate-reverse 3s linear infinite;
    }
    
    .attachment-action-button::before::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: attachment-action-vertical-pulse 1.5s infinite;
    }
    
    .attachment-action-button::before::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: attachment-action-vertical-pulse 1.5s infinite 0.75s;
    }
    
    .attachment-action-button::before::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: attachment-action-horizontal-pulse 1.5s infinite 0.375s;
    }
    
    .attachment-action-button::before::after {
      content: "";
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: attachment-action-horizontal-pulse 1.5s infinite 1.125s;
    }
    
    @keyframes attachment-action-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.3),
          0 0 20px rgba(52, 211, 153, 0.6),
          inset 0 0 10px rgba(255,255,255,0.2);
      }
      50% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.6),
          0 0 30px rgba(52, 211, 153, 0.8),
          inset 0 0 15px rgba(255,255,255,0.4);
      }
    }
    
    @keyframes attachment-action-rotate {
      from { transform: translate(-50%, -50%) rotate(45deg); }
      to { transform: translate(-50%, -50%) rotate(405deg); }
    }
    
    @keyframes attachment-action-rotate-reverse {
      from { transform: translate(-50%, -50%) rotate(-45deg); }
      to { transform: translate(-50%, -50%) rotate(315deg); }
    }
    
    @keyframes attachment-action-vertical-pulse {
      0%, 100% {
        height: 6px;
        opacity: 0.7;
      }
      50% {
        height: 8px;
        opacity: 1;
      }
    }
    
    @keyframes attachment-action-horizontal-pulse {
      0%, 100% {
        width: 6px;
        opacity: 0.7;
      }
      50% {
        width: 8px;
        opacity: 1;
      }
    }
    
    .attachment-action-button:hover {
      background: linear-gradient(135deg, #34D399 0%, #A7F3D0 100%);
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 20px rgba(52, 211, 153, 0.5);
    }
    
    .attachment-action-button:active {
      transform: translateY(-1px) scale(1.01);
      box-shadow: 0 3px 12px rgba(52, 211, 153, 0.4);
    }
    
    .attachment-action-button[data-variant="secondary"] {
      background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    }
    
    .attachment-action-button[data-variant="secondary"]:hover {
      background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
    }
    
    .attachment-action-button[data-variant="success"] {
      background: linear-gradient(135deg, #FDE047 0%, #FACC15 100%);
      box-shadow: 0 4px 15px rgba(250, 204, 21, 0.4);
    }
    
    .attachment-action-button[data-variant="success"]:hover {
      background: linear-gradient(135deg, #FACC15 0%, #FDE047 100%);
      box-shadow: 0 6px 20px rgba(250, 204, 21, 0.5);
    }
    
    /* 动画光效 */
    .attachment-action-button::after {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s;
    }
    
    .attachment-action-button:hover::after {
      left: 100%;
    }
  `;
};

/**
 * 生成作用域化的附件专用炫酷按钮 CSS
 * 用于 Markdown 内联渲染环境
 * @param {string} scopeClass - 作用域类名，默认为 'markdown-body'
 * @returns {string} 作用域化的 CSS 样式字符串
 */
export const generateAttachmentActionFancyCssScoped = (scopeClass = 'markdown-body') => {
  return `
    /* 附件专用动作按钮样式 - 作用域化 */
    .${scopeClass} .attachment-action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      margin: 4px;
      border: none;
      border-radius: 20px;
      background: linear-gradient(135deg, #A7F3D0 0%, #34D399 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      min-height: 36px;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(52, 211, 153, 0.4);
      position: relative;
      overflow: hidden;
    }
    
    .${scopeClass} .attachment-action-button::before {
      content: "";
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 10px;
      position: relative;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 70%, transparent 100%);
      border-radius: 50%;
      box-shadow:
        0 0 0 2px rgba(255,255,255,0.3),
        0 0 20px rgba(52, 211, 153, 0.6),
        inset 0 0 10px rgba(255,255,255,0.2);
      animation: attachment-action-pulse 2s infinite;
    }
    
    .${scopeClass} .attachment-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 6px;
      background: rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow:
        0 0 6px rgba(255,255,255,0.8),
        0 0 12px rgba(52, 211, 153, 0.6);
    }
    
    .${scopeClass} .attachment-action-button::before::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: attachment-action-rotate 3s linear infinite;
    }
    
    .${scopeClass} .attachment-action-button::before::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      width: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%);
      border-radius: 1px;
      animation: attachment-action-rotate-reverse 3s linear infinite;
    }
    
    .${scopeClass} .attachment-action-button::before::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: attachment-action-vertical-pulse 1.5s infinite;
    }
    
    .${scopeClass} .attachment-action-button::before::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: attachment-action-vertical-pulse 1.5s infinite 0.75s;
    }
    
    .${scopeClass} .attachment-action-button::before::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: attachment-action-horizontal-pulse 1.5s infinite 0.375s;
    }
    
    .${scopeClass} .attachment-action-button::before::after {
      content: "";
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 2px;
      background: rgba(255,255,255,0.7);
      border-radius: 1px;
      animation: attachment-action-horizontal-pulse 1.5s infinite 1.125s;
    }
    
    @keyframes attachment-action-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.3),
          0 0 20px rgba(52, 211, 153, 0.6),
          inset 0 0 10px rgba(255,255,255,0.2);
      }
      50% {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.6),
          0 0 30px rgba(52, 211, 153, 0.8),
          inset 0 0 15px rgba(255,255,255,0.4);
      }
    }
    
    @keyframes attachment-action-rotate {
      from { transform: translate(-50%, -50%) rotate(45deg); }
      to { transform: translate(-50%, -50%) rotate(405deg); }
    }
    
    @keyframes attachment-action-rotate-reverse {
      from { transform: translate(-50%, -50%) rotate(-45deg); }
      to { transform: translate(-50%, -50%) rotate(315deg); }
    }
    
    @keyframes attachment-action-vertical-pulse {
      0%, 100% {
        height: 6px;
        opacity: 0.7;
      }
      50% {
        height: 8px;
        opacity: 1;
      }
    }
    
    @keyframes attachment-action-horizontal-pulse {
      0%, 100% {
        width: 6px;
        opacity: 0.7;
      }
      50% {
        width: 8px;
        opacity: 1;
      }
    }
    
    .${scopeClass} .attachment-action-button:hover {
      background: linear-gradient(135deg, #34D399 0%, #A7F3D0 100%);
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 20px rgba(52, 211, 153, 0.5);
    }
    
    .${scopeClass} .attachment-action-button:active {
      transform: translateY(-1px) scale(1.01);
      box-shadow: 0 3px 12px rgba(52, 211, 153, 0.4);
    }
    
    .${scopeClass} .attachment-action-button[data-variant="secondary"] {
      background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    }
    
    .${scopeClass} .attachment-action-button[data-variant="secondary"]:hover {
      background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
    }
    
    .${scopeClass} .attachment-action-button[data-variant="success"] {
      background: linear-gradient(135deg, #FDE047 0%, #FACC15 100%);
      box-shadow: 0 4px 15px rgba(250, 204, 21, 0.4);
    }
    
    .${scopeClass} .attachment-action-button[data-variant="success"]:hover {
      background: linear-gradient(135deg, #FACC15 0%, #FDE047 100%);
      box-shadow: 0 6px 20px rgba(250, 204, 21, 0.5);
    }
    
    /* 动画光效 - 作用域化 */
    .${scopeClass} .attachment-action-button::after {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s;
    }
    
    .${scopeClass} .attachment-action-button:hover::after {
      left: 100%;
    }
  `;
};