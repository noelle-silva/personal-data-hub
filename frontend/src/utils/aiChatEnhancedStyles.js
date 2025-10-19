/**
 * AI聊天增强样式生成器
 * 提供ToolUse和Maid日志气泡的作用域CSS样式
 */

/**
 * 生成AI聊天增强样式的作用域CSS
 * @param {string} scopeClass - 作用域类名，默认为'ai-chat-enhanced'
 * @returns {string} 作用域CSS样式字符串
 */
export function generateAIChatEnhancedStylesScoped(scopeClass = 'ai-chat-enhanced') {
  return `
    /* ToolUse 气泡样式 */
    .${scopeClass} .vcp-tool-use-bubble {
      margin: 12px 0;
      border-radius: 8px;
      border: 1px solid rgba(156, 163, 175, 0.3);
      background-color: rgba(249, 250, 251, 0.7);
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }

    .${scopeClass} .vcp-tool-use-bubble:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-color: rgba(156, 163, 175, 0.5);
    }

    .${scopeClass} .vcp-tool-summary {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background-color: rgba(59, 130, 246, 0.1);
      border-bottom: 1px solid rgba(156, 163, 175, 0.2);
    }

    .${scopeClass} .vcp-tool-label {
      font-weight: 600;
      color: #3b82f6;
      margin-right: 8px;
      font-size: 14px;
    }

    .${scopeClass} .vcp-tool-name-highlight {
      font-weight: 500;
      color: #1e40af;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 14px;
    }

    .${scopeClass} .vcp-tool-details {
      padding: 12px;
      overflow-x: auto;
    }

    .${scopeClass} .vcp-tool-details pre {
      margin: 0;
      padding: 8px;
      background-color: rgba(243, 244, 246, 0.8);
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* 工具结果气泡样式 */
    .${scopeClass} .vcp-tool-result-bubble {
      margin: 12px 0;
      border-radius: 8px;
      border: 1px solid rgba(16, 185, 129, 0.3);
      background-color: rgba(240, 253, 244, 0.7);
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }

    .${scopeClass} .vcp-tool-result-bubble:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-color: rgba(16, 185, 129, 0.5);
    }

    .${scopeClass} .vcp-tool-result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background-color: rgba(16, 185, 129, 0.1);
      border-bottom: 1px solid rgba(16, 185, 129, 0.2);
      cursor: pointer;
    }

    .${scopeClass} .vcp-tool-result-label {
      font-weight: 600;
      color: #10b981;
      margin-right: 8px;
      font-size: 14px;
    }

    .${scopeClass} .vcp-tool-result-name {
      font-weight: 500;
      color: #047857;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 14px;
      margin-right: 8px;
    }

    .${scopeClass} .vcp-tool-result-status {
      font-weight: 500;
      color: #065f46;
      font-size: 14px;
    }

    .${scopeClass} .vcp-result-toggle-icon {
      width: 16px;
      height: 16px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      transition: transform 0.2s ease;
    }

    .${scopeClass} .vcp-tool-result-bubble.expanded .vcp-result-toggle-icon {
      transform: rotate(180deg);
    }

    .${scopeClass} .vcp-tool-result-collapsible-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .${scopeClass} .vcp-tool-result-bubble.expanded .vcp-tool-result-collapsible-content {
      max-height: 1000px;
    }

    .${scopeClass} .vcp-tool-result-details {
      padding: 12px;
    }

    .${scopeClass} .vcp-tool-result-item {
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
    }

    .${scopeClass} .vcp-tool-result-item:last-child {
      margin-bottom: 0;
    }

    .${scopeClass} .vcp-tool-result-item-key {
      font-weight: 600;
      color: #374151;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .${scopeClass} .vcp-tool-result-item-value {
      color: #4b5563;
      font-size: 13px;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .${scopeClass} .vcp-tool-result-item-value a {
      color: #3b82f6;
      text-decoration: none;
    }

    .${scopeClass} .vcp-tool-result-item-value a:hover {
      text-decoration: underline;
    }

    .${scopeClass} .vcp-tool-result-image {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin-top: 4px;
    }

    .${scopeClass} .vcp-tool-result-footer {
      padding: 12px;
      border-top: 1px solid rgba(16, 185, 129, 0.2);
    }

    .${scopeClass} .vcp-tool-result-footer pre {
      margin: 0;
      padding: 8px;
      background-color: rgba(243, 244, 246, 0.8);
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Maid 日记气泡样式 */
    .${scopeClass} .maid-diary-bubble {
      margin: 12px 0;
      border-radius: 8px;
      border: 1px solid rgba(236, 72, 153, 0.3);
      background-color: rgba(254, 242, 248, 0.7);
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }

    .${scopeClass} .maid-diary-bubble:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-color: rgba(236, 72, 153, 0.5);
    }

    .${scopeClass} .diary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background-color: rgba(236, 72, 153, 0.1);
      border-bottom: 1px solid rgba(236, 72, 153, 0.2);
    }

    .${scopeClass} .diary-title {
      font-weight: 600;
      color: #ec4899;
      font-size: 14px;
    }

    .${scopeClass} .diary-date {
      font-weight: 500;
      color: #be185d;
      font-size: 13px;
    }

    .${scopeClass} .diary-maid-info {
      padding: 8px 12px;
      background-color: rgba(236, 72, 153, 0.05);
      border-bottom: 1px solid rgba(236, 72, 153, 0.1);
      display: flex;
      align-items: center;
    }

    .${scopeClass} .diary-maid-label {
      font-weight: 600;
      color: #be185d;
      font-size: 13px;
      margin-right: 8px;
    }

    .${scopeClass} .diary-maid-name {
      font-weight: 500;
      color: #9f1239;
      font-size: 13px;
    }

    .${scopeClass} .diary-content {
      padding: 12px;
      color: #4b5563;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* 暗色主题适配 */
    @media (prefers-color-scheme: dark) {
      .${scopeClass} .vcp-tool-use-bubble {
        background-color: rgba(30, 41, 59, 0.7);
        border-color: rgba(100, 116, 139, 0.3);
      }

      .${scopeClass} .vcp-tool-summary {
        background-color: rgba(37, 99, 235, 0.2);
        border-color: rgba(100, 116, 139, 0.2);
      }

      .${scopeClass} .vcp-tool-details pre {
        background-color: rgba(15, 23, 42, 0.8);
        color: #e2e8f0;
      }

      .${scopeClass} .vcp-tool-result-bubble {
        background-color: rgba(20, 83, 45, 0.7);
        border-color: rgba(74, 222, 128, 0.3);
      }

      .${scopeClass} .vcp-tool-result-header {
        background-color: rgba(16, 185, 129, 0.2);
        border-color: rgba(74, 222, 128, 0.2);
      }

      .${scopeClass} .vcp-tool-result-footer pre {
        background-color: rgba(15, 23, 42, 0.8);
        color: #e2e8f0;
      }

      .${scopeClass} .maid-diary-bubble {
        background-color: rgba(80, 7, 36, 0.7);
        border-color: rgba(236, 72, 153, 0.3);
      }

      .${scopeClass} .diary-header {
        background-color: rgba(236, 72, 153, 0.2);
        border-color: rgba(236, 72, 153, 0.2);
      }

      .${scopeClass} .diary-maid-info {
        background-color: rgba(236, 72, 153, 0.1);
        border-color: rgba(236, 72, 153, 0.1);
      }

      .${scopeClass} .diary-content {
        color: #e2e8f0;
      }

      .${scopeClass} .vcp-tool-result-item-key {
        color: #e2e8f0;
      }

      .${scopeClass} .vcp-tool-result-item-value {
        color: #cbd5e1;
      }
    }
  `;
}