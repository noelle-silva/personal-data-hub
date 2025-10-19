/**
 * AI聊天内容预处理器
 * 用于处理AI输出内容中的特殊块，如ToolUse和Maid日志
 */

/**
 * 转义HTML特殊字符
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 去除HTML标签前的缩进，防止markdown解析器将缩进的HTML误认为是代码块
 * @param {string} text - 需要处理的文本
 * @returns {string} 处理后的文本
 */
function deIndentHtml(text) {
  const lines = text.split('\n');
  let inFence = false;
  return lines.map(line => {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
    }
    // 如果不在代码块内，且行是HTML标签，去除前导空格
    if (!inFence && /^\s+<(!|[a-zA-Z])/.test(line)) {
      return line.trimStart();
    }
    return line;
  }).join('\n');
}

/**
 * 转换ToolUse特殊块为HTML
 * @param {string} text - 需要处理的文本
 * @returns {string} 处理后的文本
 */
function transformToolUseBlocks(text) {
  const toolRegex = /<<<\[TOOL_REQUEST\]>>>(.*?)<<<\[END_TOOL_REQUEST\]>>>/gs;
  
  return text.replace(toolRegex, (match, content) => {
    // 提取工具名称
    const toolNameRegex = /<tool_name>([\s\S]*?)<\/tool_name>|tool_name:\s*([^\n\r]*)/;
    const toolNameMatch = content.match(toolNameRegex);
    
    let toolName = 'Processing...';
    if (toolNameMatch) {
      let extractedName = (toolNameMatch[1] || toolNameMatch[2] || '').trim();
      if (extractedName) {
        extractedName = extractedName.replace(/「始」|「末」/g, '').replace(/,$/, '').trim();
      }
      if (extractedName) {
        toolName = extractedName;
      }
    }
    
    const escapedFullContent = escapeHtml(content);
    
    return `<div class="vcp-tool-use-bubble ai-bubble ai-variant-tool collapsible">` +
           `<div class="vcp-tool-summary ai-bubble-header">` +
           `<span class="vcp-tool-label ai-bubble-title">VCP-ToolUse:</span> ` +
           `<span class="vcp-tool-name-highlight ai-bubble-meta">${escapeHtml(toolName)}</span>` +
           `<span class="ai-toggle-icon"></span>` +
           `</div>` +
           `<div class="vcp-tool-details ai-bubble-collapsible-content"><pre>${escapedFullContent}</pre></div>` +
           `</div>`;
  });
}

/**
 * 转换Maid日志特殊块为HTML
 * @param {string} text - 需要处理的文本
 * @returns {string} 处理后的文本
 */
function transformMaidDiaryBlocks(text) {
  const noteRegex = /<<<DailyNoteStart>>>(.*?)<<<DailyNoteEnd>>>/gs;
  
  return text.replace(noteRegex, (match, rawContent) => {
    const content = rawContent.trim();
    const maidRegex = /Maid:\s*([^\n\r]*)/;
    const dateRegex = /Date:\s*([^\n\r]*)/;
    const contentRegex = /Content:\s*([\s\S]*)/;

    const maidMatch = content.match(maidRegex);
    const dateMatch = content.match(dateRegex);
    const contentMatch = content.match(contentRegex);

    const maid = maidMatch ? maidMatch[1].trim() : '';
    const date = dateMatch ? dateMatch[1].trim() : '';
    const diaryContent = contentMatch ? contentMatch[1].trim() : content;

    let html = `<div class="maid-diary-bubble ai-bubble ai-variant-maid">`;
    html += `<div class="diary-header ai-bubble-header">`;
    html += `<span class="diary-title ai-bubble-title">Maid's Diary</span>`;
    if (date) {
      html += `<span class="diary-date ai-bubble-meta">${escapeHtml(date)}</span>`;
    }
    html += `</div>`;
    
    if (maid) {
      html += `<div class="diary-maid-info ai-bubble-meta">`;
      html += `<span class="diary-maid-label">Maid:</span> `;
      html += `<span class="diary-maid-name">${escapeHtml(maid)}</span>`;
      html += `</div>`;
    }

    html += `<div class="diary-content ai-bubble-content">${escapeHtml(diaryContent)}</div>`;
    html += `</div>`;

    return html;
  });
}

/**
 * 处理工具结果汇总块
 * @param {string} text - 需要处理的文本
 * @returns {string} 处理后的文本
 */
function transformToolResultBlocks(text) {
  const toolResultRegex = /\[\[VCP调用结果信息汇总:(.*?)\]\]/gs;
  
  return text.replace(toolResultRegex, (match, rawContent) => {
    const content = rawContent.trim();
    const lines = content.split('\n').filter(line => line.trim() !== '');

    let toolName = 'Unknown Tool';
    let status = 'Unknown Status';
    const details = [];
    let otherContent = [];

    lines.forEach(line => {
      const kvMatch = line.match(/-\s*([^:]+):\s*(.*)/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        if (key === '工具名称') {
          toolName = value;
        } else if (key === '执行状态') {
          status = value;
        } else {
          details.push({ key, value });
        }
      } else {
        otherContent.push(line);
      }
    });

    let html = `<div class="vcp-tool-result-bubble collapsible">`;
    html += `<div class="vcp-tool-result-header">`;
    html += `<span class="vcp-tool-result-label">VCP-ToolResult</span>`;
    html += `<span class="vcp-tool-result-name">${escapeHtml(toolName)}</span>`;
    html += `<span class="vcp-tool-result-status">${escapeHtml(status)}</span>`;
    html += `<span class="vcp-result-toggle-icon"></span>`;
    html += `</div>`;

    html += `<div class="vcp-tool-result-collapsible-content">`;

    html += `<div class="vcp-tool-result-details">`;
    details.forEach(({ key, value }) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      let processedValue = escapeHtml(value);
      
      if ((key === '可访问URL' || key === '返回内容') && value.match(/\.(jpeg|jpg|png|gif)$/i)) {
        processedValue = `<a href="${value}" target="_blank" rel="noopener noreferrer" title="点击预览"><img src="${value}" class="vcp-tool-result-image" alt="Generated Image"></a>`;
      } else {
        processedValue = processedValue.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      }
      
      if (key === '返回内容') {
        processedValue = processedValue.replace(/###(.*?)###/g, '<strong>$1</strong>');
      }

      html += `<div class="vcp-tool-result-item">`;
      html += `<span class="vcp-tool-result-item-key">${escapeHtml(key)}:</span> `;
      html += `<span class="vcp-tool-result-item-value">${processedValue}</span>`;
      html += `</div>`;
    });
    html += `</div>`;

    if (otherContent.length > 0) {
      html += `<div class="vcp-tool-result-footer"><pre>${escapeHtml(otherContent.join('\n'))}</pre></div>`;
    }

    html += `</div>`;
    html += `</div>`;

    return html;
  });
}

/**
 * 预处理AI聊天内容
 * @param {string} text - 原始文本内容
 * @returns {string} 处理后的文本
 */
export function preprocessAIMessageContent(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const codeBlockMap = new Map();
  let placeholderId = 0;

  // 步骤1：保护所有代码块
  let processed = text.replace(/```\w*([\s\S]*?)```/g, (match) => {
    const placeholder = `__VCP_CODE_BLOCK_PLACEHOLDER_${placeholderId}__`;
    codeBlockMap.set(placeholder, match);
    placeholderId++;
    return placeholder;
  });

  // 步骤2：去除HTML标签前的缩进
  processed = deIndentHtml(processed);

  // 步骤3：转换特殊块为HTML
  processed = transformToolUseBlocks(processed);
  // 暂时注释掉工具结果转换，本轮不处理
  // processed = transformToolResultBlocks(processed);
  processed = transformMaidDiaryBlocks(processed);

  // 步骤4：恢复保护的代码块
  if (codeBlockMap.size > 0) {
    for (const [placeholder, block] of codeBlockMap.entries()) {
      processed = processed.replace(placeholder, block);
    }
  }

  return processed;
}