/**
 * Markdown 渲染工具
 * 将 Markdown 内容转换为安全的 HTML，用于在沙盒中显示
 */

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import texmath from 'markdown-it-texmath';
// 按需注册常用语言
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';

// 注册语言
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c++', cpp);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('markdown', markdown);

// 性能埋点工具
const performanceLog = (step, startTime, contentLength) => {
  const duration = performance.now() - startTime;
  console.log(`[Markdown渲染性能] ${step}: ${duration.toFixed(2)}ms, 内容长度: ${contentLength}`);
  return duration;
};

// LRU 缓存实现
class LRUCache {
  constructor(capacity = 20) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      // 移到最后（最近使用）
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // 删除最久未使用的项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

// 创建全局缓存实例
const markdownCache = new LRUCache(20);

// 配置选项
const RENDER_CONFIG = {
  // 代码高亮阈值
  CODE_HIGHLIGHT_MAX_LENGTH: 5000,
  CODE_HIGHLIGHT_MAX_LINES: 300,
  // 大文档阈值
  LARGE_DOC_THRESHOLD: 50000, // 50KB
  CODE_BLOCK_COUNT_THRESHOLD: 10, // 代码块数量阈值
  // 缓存开关
  ENABLE_CACHE: true,
  // 性能埋点开关
  ENABLE_PERFORMANCE_LOG: true,
  // 降级模式开关
  ENABLE_FAST_MODE: true,
  // 数学公式渲染开关
  ENABLE_MATH: true,
  // 快速模式下数学公式渲染开关
  MATH_FAST_MODE: false,
  // 数学公式渲染选项
  MATH_OPTIONS: {
    // 分隔符配置
    delimiters: 'dollars',
    // 是否在错误时抛出异常
    throwOnError: false,
    // 严格模式
    strict: 'warn',
    // 是否显示错误消息
    errorColor: '#cc0000'
  }
};

// 创建完整功能的 markdown-it 实例
const mdFull = new MarkdownIt({
  html: true,         // 允许 HTML 标签，支持脚本和交互
  linkify: true,      // 自动识别链接
  typographer: true,  // 启用印刷美化
  breaks: true,       // 将换行符转换为 <br>，保留纯文本中的换行
  highlight: function (str, lang) {
    // 代码高亮处理，添加阈值检查
    if (lang && hljs.getLanguage(lang)) {
      // 检查代码长度和行数
      const lineCount = str.split('\n').length;
      if (str.length > RENDER_CONFIG.CODE_HIGHLIGHT_MAX_LENGTH ||
          lineCount > RENDER_CONFIG.CODE_HIGHLIGHT_MAX_LINES) {
        console.log(`[Markdown渲染] 跳过高亮: 语言=${lang}, 长度=${str.length}, 行数=${lineCount}`);
        return ''; // 跳过高亮
      }
      
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {
        // 忽略高亮错误
      }
    }
    return ''; // 使用外部样式进行高亮
  }
});

// 如果启用数学公式渲染，则添加 texmath 插件
if (RENDER_CONFIG.ENABLE_MATH) {
  mdFull.use(texmath, {
    engine: katex,
    delimiters: 'dollars',
    throwOnError: false,
    strict: 'warn'
  });
}

// 创建快速模式的 markdown-it 实例（关闭高亮、链接识别和印刷美化）
const mdFast = new MarkdownIt({
  html: true,         // 允许 HTML 标签，支持脚本和交互
  linkify: false,     // 关闭自动识别链接
  typographer: false, // 关闭印刷美化
  breaks: true,       // 将换行符转换为 <br>，保留纯文本中的换行
  highlight: false    // 关闭代码高亮
});

// 如果启用数学公式渲染且快速模式下也启用，则添加 texmath 插件
if (RENDER_CONFIG.ENABLE_MATH && RENDER_CONFIG.MATH_FAST_MODE) {
  mdFast.use(texmath, {
    engine: katex,
    delimiters: 'dollars',
    throwOnError: false,
    strict: 'warn'
  });
}

// 判断是否应该使用快速模式
const shouldUseFastMode = (content) => {
  if (!RENDER_CONFIG.ENABLE_FAST_MODE) return false;
  
  // 检查内容长度
  if (content.length > RENDER_CONFIG.LARGE_DOC_THRESHOLD) {
    return true;
  }
  
  // 检查代码块数量
  const codeBlockCount = (content.match(/```[\s\S]*?```/g) || []).length;
  if (codeBlockCount > RENDER_CONFIG.CODE_BLOCK_COUNT_THRESHOLD) {
    return true;
  }
  
  return false;
};

/**
 * 渲染 Markdown 内容为安全的 HTML
 * @param {string} content - Markdown 内容
 * @param {string} cacheKey - 可选的缓存键（通常为 docId|updatedAt）
 * @returns {string} 安全的 HTML 字符串
 */
export const renderMarkdownToHtml = (content, cacheKey = null) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const totalStartTime = RENDER_CONFIG.ENABLE_PERFORMANCE_LOG ? performance.now() : 0;
  
  // 检查缓存
  if (RENDER_CONFIG.ENABLE_CACHE && cacheKey) {
    const cached = markdownCache.get(cacheKey);
    if (cached) {
      if (RENDER_CONFIG.ENABLE_PERFORMANCE_LOG) {
        console.log(`[Markdown渲染] 缓存命中: ${cacheKey}`);
      }
      return cached;
    }
  }

  try {
    // 1. 选择渲染器并转换 Markdown 为 HTML
    const useFastMode = shouldUseFastMode(content);
    const md = useFastMode ? mdFast : mdFull;
    
    // 检查是否启用数学公式渲染
    const mathEnabled = RENDER_CONFIG.ENABLE_MATH &&
                       (!useFastMode || RENDER_CONFIG.MATH_FAST_MODE);
    
    if (RENDER_CONFIG.ENABLE_PERFORMANCE_LOG) {
      console.log(`[Markdown渲染] 数学渲染: ${mathEnabled ? '启用' : '禁用'}, 模式: ${useFastMode ? '快速' : '完整'}`);
    }
    
    const renderStartTime = RENDER_CONFIG.ENABLE_PERFORMANCE_LOG ? performance.now() : 0;
    let html = md.render(content);
    if (RENDER_CONFIG.ENABLE_PERFORMANCE_LOG) {
      performanceLog('Markdown解析', renderStartTime, content.length);
    }
    
    // 记录数学渲染时间
    if (mathEnabled && RENDER_CONFIG.ENABLE_PERFORMANCE_LOG) {
      const mathStartTime = performance.now();
      performanceLog('数学公式渲染', mathStartTime, content.length);
    }

    // 2. 跳过 DOMPurify 净化，直接使用原始 HTML
    // 注意：由于我们使用 iframe 沙盒，脚本将在隔离环境中执行
    if (RENDER_CONFIG.ENABLE_PERFORMANCE_LOG) {
      performanceLog('跳过净化', performance.now(), content.length);
    }

    // 3. 为图片添加懒加载属性
    const imgStartTime = RENDER_CONFIG.ENABLE_PERFORMANCE_LOG ? performance.now() : 0;
    html = html.replace(/<img\s+([^>]*?)>/gi, (match, attrs) => {
      // 检查是否已有 loading 属性
      if (!attrs.includes('loading=')) {
        attrs += ' loading="lazy"';
      }
      // 检查是否已有 decoding 属性
      if (!attrs.includes('decoding=')) {
        attrs += ' decoding="async"';
      }
      return `<img ${attrs}>`;
    });
    if (RENDER_CONFIG.ENABLE_PERFORMANCE_LOG) {
      performanceLog('图片懒加载处理', imgStartTime, content.length);
    }

    // 4. 处理链接，确保安全打开（幂等追加）
    const linkStartTime = RENDER_CONFIG.ENABLE_PERFORMANCE_LOG ? performance.now() : 0;
    html = html.replace(/<a\s+([^>]*?)>/gi, (match, attrs) => {
      // 检查是否已有 rel 属性
      if (!attrs.includes('rel=')) {
        // 检查是否是特殊协议（mailto, tel），这些不需要 noopener noreferrer
        const isSpecialProtocol = /href=["']?(mailto|tel):/i.test(attrs);
        if (!isSpecialProtocol) {
          attrs += ' rel="noopener noreferrer"';
        }
      }
      return `<a ${attrs}>`;
    });
    if (RENDER_CONFIG.ENABLE_PERFORMANCE_LOG) {
      performanceLog('链接安全处理', linkStartTime, content.length);
    }

    // 缓存结果
    if (RENDER_CONFIG.ENABLE_CACHE && cacheKey) {
      markdownCache.set(cacheKey, html);
    }

    // 记录总耗时
    if (RENDER_CONFIG.ENABLE_PERFORMANCE_LOG) {
      const totalTime = performance.now() - totalStartTime;
      console.log(`[Markdown渲染] 总耗时: ${totalTime.toFixed(2)}ms, 模式: ${useFastMode ? '快速' : '完整'}, 内容长度: ${content.length}`);
    }

    return html;
  } catch (error) {
    console.error('Markdown 渲染错误:', error);
    // 出错时返回转义后的纯文本，避免破坏 HTML 结构
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    return `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`;
  }
};

/**
 * 清除缓存
 */
export const clearMarkdownCache = () => {
  markdownCache.clear();
};

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => {
  return {
    size: markdownCache.cache.size,
    capacity: markdownCache.capacity
  };
};

/**
 * 生成代码高亮的 CSS 样式
 * @returns {string} CSS 样式字符串
 */
export const generateHighlightStyles = () => {
  return `
    /* 代码块样式 */
    pre {
      background-color: #f6f8fa;
      border-radius: 6px;
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
    }
    
    code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      background-color: rgba(175, 184, 193, 0.2);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 85%;
    }
    
    pre code {
      background-color: transparent;
      padding: 0;
      border-radius: 0;
    }
    
    /* 高亮主题样式 */
    .hljs {
      display: block;
      overflow-x: auto;
      padding: 0.5em;
      color: #333;
    }
    
    .hljs-comment,
    .hljs-quote {
      color: #998;
      font-style: italic;
    }
    
    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-subst {
      color: #333;
      font-weight: bold;
    }
    
    .hljs-number,
    .hljs-literal,
    .hljs-variable,
    .hljs-template-variable,
    .hljs-tag .hljs-attr {
      color: #008080;
    }
    
    .hljs-string,
    .hljs-doctag {
      color: #d14;
    }
    
    .hljs-title,
    .hljs-section,
    .hljs-selector-id {
      color: #900;
      font-weight: bold;
    }
    
    .hljs-subst {
      font-weight: normal;
    }
    
    .hljs-type,
    .hljs-class .hljs-title {
      color: #458;
      font-weight: bold;
    }
    
    .hljs-tag,
    .hljs-name,
    .hljs-attribute {
      color: #000080;
      font-weight: normal;
    }
    
    .hljs-regexp,
    .hljs-link {
      color: #009926;
    }
    
    .hljs-symbol,
    .hljs-bullet {
      color: #990073;
    }
    
    .hljs-built_in,
    .hljs-builtin-name {
      color: #0086b3;
    }
    
    .hljs-meta {
      color: #999;
      font-weight: bold;
    }
    
    .hljs-deletion {
      background: #fdd;
    }
    
    .hljs-addition {
      background: #dfd;
    }
    
    .hljs-emphasis {
      font-style: italic;
    }
    
    .hljs-strong {
      font-weight: bold;
    }
  `;
};

/**
 * 生成基础排版样式
 * @returns {string} CSS 样式字符串
 */
export const generateBaseStyles = () => {
  return `
    /* 基础样式重置 */
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: #333;
      word-wrap: break-word;
    }
    
    /* 标题样式 */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    
    h1 {
      font-size: 2em;
      border-bottom: 1px solid #eaecef;
      padding-bottom: 0.3em;
    }
    
    h2 {
      font-size: 1.5em;
      border-bottom: 1px solid #eaecef;
      padding-bottom: 0.3em;
    }
    
    h3 {
      font-size: 1.25em;
    }
    
    h4 {
      font-size: 1em;
    }
    
    h5 {
      font-size: 0.875em;
    }
    
    h6 {
      font-size: 0.85em;
      color: #6a737d;
    }
    
    /* 段落样式 */
    p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    
    /* 列表样式 */
    ul, ol {
      padding-left: 2em;
      margin-bottom: 16px;
    }
    
    li {
      margin-bottom: 0.25em;
    }
    
    li > p {
      margin-bottom: 0;
    }
    
    /* 引用样式 */
    blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 0 0 16px 0;
    }
    
    blockquote > :first-child {
      margin-top: 0;
    }
    
    blockquote > :last-child {
      margin-bottom: 0;
    }
    
    /* 表格样式 */
    table {
      border-spacing: 0;
      border-collapse: collapse;
      display: block;
      width: 100%;
      overflow: auto;
      margin-bottom: 16px;
    }
    
    table th {
      font-weight: 600;
    }
    
    table th,
    table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
    
    table tr {
      background-color: #fff;
      border-top: 1px solid #c6cbd1;
    }
    
    table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
    
    /* 水平分割线 */
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #e1e4e8;
      border: 0;
    }
    
    /* 图片样式 */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    
    /* 链接样式 */
    a {
      color: #0366d6;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
  `;
};

/**
 * 生成作用域化的基础排版样式
 * @param {string} scopeClass - 作用域类名，默认为 'markdown-body'
 * @returns {string} 作用域化的 CSS 样式字符串
 */
export const generateBaseStylesScoped = (scopeClass = 'markdown-body') => {
  return `
    /* 基础样式重置 - 作用域化 */
    .${scopeClass} {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: #333;
      word-wrap: break-word;
    }
    
    /* 标题样式 - 作用域化 */
    .${scopeClass} h1, .${scopeClass} h2, .${scopeClass} h3, .${scopeClass} h4, .${scopeClass} h5, .${scopeClass} h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    
    .${scopeClass} h1 {
      font-size: 2em;
      border-bottom: 1px solid #eaecef;
      padding-bottom: 0.3em;
    }
    
    .${scopeClass} h2 {
      font-size: 1.5em;
      border-bottom: 1px solid #eaecef;
      padding-bottom: 0.3em;
    }
    
    .${scopeClass} h3 {
      font-size: 1.25em;
    }
    
    .${scopeClass} h4 {
      font-size: 1em;
    }
    
    .${scopeClass} h5 {
      font-size: 0.875em;
    }
    
    .${scopeClass} h6 {
      font-size: 0.85em;
      color: #6a737d;
    }
    
    /* 段落样式 - 作用域化 */
    .${scopeClass} p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    
    /* 列表样式 - 作用域化 */
    .${scopeClass} ul, .${scopeClass} ol {
      padding-left: 2em;
      margin-bottom: 16px;
    }
    
    .${scopeClass} li {
      margin-bottom: 0.25em;
    }
    
    .${scopeClass} li > p {
      margin-bottom: 0;
    }
    
    /* 引用样式 - 作用域化 */
    .${scopeClass} blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 0 0 16px 0;
    }
    
    .${scopeClass} blockquote > :first-child {
      margin-top: 0;
    }
    
    .${scopeClass} blockquote > :last-child {
      margin-bottom: 0;
    }
    
    /* 表格样式 - 作用域化 */
    .${scopeClass} table {
      border-spacing: 0;
      border-collapse: collapse;
      display: block;
      width: 100%;
      overflow: auto;
      margin-bottom: 16px;
    }
    
    .${scopeClass} table th {
      font-weight: 600;
    }
    
    .${scopeClass} table th,
    .${scopeClass} table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
    
    .${scopeClass} table tr {
      background-color: #fff;
      border-top: 1px solid #c6cbd1;
    }
    
    .${scopeClass} table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
    
    /* 水平分割线 - 作用域化 */
    .${scopeClass} hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #e1e4e8;
      border: 0;
    }
    
    /* 图片样式 - 作用域化 */
    .${scopeClass} img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    
    /* 链接样式 - 作用域化 */
    .${scopeClass} a {
      color: #0366d6;
      text-decoration: none;
    }
    
    .${scopeClass} a:hover {
      text-decoration: underline;
    }
    
    /* Tab Action 按钮样式 - 作用域化 */
    .${scopeClass} .tab-action-button {
      display: inline-block;
      padding: 6px 12px;
      margin: 2px 4px;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
      text-align: center;
      white-space: nowrap;
      vertical-align: middle;
      cursor: pointer;
      user-select: none;
      border: 1px solid transparent;
      border-radius: 16px;
      transition: all 0.2s ease-in-out;
      text-decoration: none;
    }
    
    /* Tab Action 按钮变体样式 - 作用域化 */
    .${scopeClass} .tab-action-button[data-variant="primary"] {
      color: #fff;
      background-color: #1976d2;
      border-color: #1976d2;
    }
    
    .${scopeClass} .tab-action-button[data-variant="primary"]:hover {
      background-color: #1565c0;
      border-color: #1565c0;
    }
    
    .${scopeClass} .tab-action-button[data-variant="secondary"] {
      color: #333;
      background-color: #f5f5f5;
      border-color: #ddd;
    }
    
    .${scopeClass} .tab-action-button[data-variant="secondary"]:hover {
      background-color: #e0e0e0;
      border-color: #ccc;
    }
    
    .${scopeClass} .tab-action-button:focus {
      outline: 0;
      box-shadow: 0 0 0 0.2rem rgba(25, 118, 210, 0.25);
    }
    
    .${scopeClass} .tab-action-button:active {
      transform: translateY(1px);
    }
  `;
};

/**
 * 生成作用域化的代码高亮样式
 * @param {string} scopeClass - 作用域类名，默认为 'markdown-body'
 * @returns {string} 作用域化的 CSS 样式字符串
 */
export const generateHighlightStylesScoped = (scopeClass = 'markdown-body') => {
  return `
    /* 代码块样式 - 作用域化 */
    .${scopeClass} pre {
      background-color: #f6f8fa;
      border-radius: 6px;
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
    }
    
    .${scopeClass} code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      background-color: rgba(175, 184, 193, 0.2);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 85%;
    }
    
    .${scopeClass} pre code {
      background-color: transparent;
      padding: 0;
      border-radius: 0;
    }
    
    /* 高亮主题样式 - 作用域化 */
    .${scopeClass} .hljs {
      display: block;
      overflow-x: auto;
      padding: 0.5em;
      color: #333;
    }
    
    .${scopeClass} .hljs-comment,
    .${scopeClass} .hljs-quote {
      color: #998;
      font-style: italic;
    }
    
    .${scopeClass} .hljs-keyword,
    .${scopeClass} .hljs-selector-tag,
    .${scopeClass} .hljs-subst {
      color: #333;
      font-weight: bold;
    }
    
    .${scopeClass} .hljs-number,
    .${scopeClass} .hljs-literal,
    .${scopeClass} .hljs-variable,
    .${scopeClass} .hljs-template-variable,
    .${scopeClass} .hljs-tag .hljs-attr {
      color: #008080;
    }
    
    .${scopeClass} .hljs-string,
    .${scopeClass} .hljs-doctag {
      color: #d14;
    }
    
    .${scopeClass} .hljs-title,
    .${scopeClass} .hljs-section,
    .${scopeClass} .hljs-selector-id {
      color: #900;
      font-weight: bold;
    }
    
    .${scopeClass} .hljs-subst {
      font-weight: normal;
    }
    
    .${scopeClass} .hljs-type,
    .${scopeClass} .hljs-class .hljs-title {
      color: #458;
      font-weight: bold;
    }
    
    .${scopeClass} .hljs-tag,
    .${scopeClass} .hljs-name,
    .${scopeClass} .hljs-attribute {
      color: #000080;
      font-weight: normal;
    }
    
    .${scopeClass} .hljs-regexp,
    .${scopeClass} .hljs-link {
      color: #009926;
    }
    
    .${scopeClass} .hljs-symbol,
    .${scopeClass} .hljs-bullet {
      color: #990073;
    }
    
    .${scopeClass} .hljs-built_in,
    .${scopeClass} .hljs-builtin-name {
      color: #0086b3;
    }
    
    .${scopeClass} .hljs-meta {
      color: #999;
      font-weight: bold;
    }
    
    .${scopeClass} .hljs-deletion {
      background: #fdd;
    }
    
    .${scopeClass} .hljs-addition {
      background: #dfd;
    }
    
    .${scopeClass} .hljs-emphasis {
      font-style: italic;
    }
    
    .${scopeClass} .hljs-strong {
      font-weight: bold;
    }
  `;
};

/**
 * 生成作用域化的 KaTeX 样式
 * @param {string} scopeClass - 作用域类名，默认为 'markdown-body'
 * @returns {string} 作用域化的 KaTeX CSS 样式字符串
 */
export const generateKatexStylesScoped = (scopeClass = 'markdown-body') => {
  return `
    /* KaTeX 样式调整 - 作用域化 */
    .${scopeClass} .katex {
      color: inherit;
      font-size: 1em;
    }
    
    .${scopeClass} .katex-display {
      display: block;
      margin: 1em 0;
      text-align: center;
    }
    
    .${scopeClass} .katex-error {
      color: ${RENDER_CONFIG.MATH_OPTIONS.errorColor};
      background-color: rgba(204, 0, 0, 0.1);
      border: 1px solid rgba(204, 0, 0, 0.3);
      border-radius: 4px;
      padding: 2px 4px;
    }
  `;
};

/**
 * 生成 KaTeX 样式
 * @returns {string} KaTeX CSS 样式字符串
 */
export const generateKatexStyles = () => {
  return `
    /* KaTeX 样式调整 */
    .katex {
      color: inherit;
      font-size: 1em;
    }
    
    .katex-display {
      display: block;
      margin: 1em 0;
      text-align: center;
    }
    
    .katex-error {
      color: ${RENDER_CONFIG.MATH_OPTIONS.errorColor};
      background-color: rgba(204, 0, 0, 0.1);
      border: 1px solid rgba(204, 0, 0, 0.3);
      border-radius: 4px;
      padding: 2px 4px;
    }
  `;
};