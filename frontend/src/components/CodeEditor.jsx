import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import { lazy, Suspense } from 'react';

// 懒加载 Monaco Editor 组件
const Editor = lazy(() => import('@monaco-editor/react'));

// 加载中的占位组件
const EditorLoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 160,
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1,
      color: 'text.secondary',
    }}
  >
    正在加载编辑器...
  </Box>
);

/**
 * 可复用的代码编辑器组件，基于 Monaco Editor
 * @param {Object} props
 * @param {string} props.value - 编辑器内容
 * @param {function} props.onChange - 内容变更回调
 * @param {'markdown'|'html'|'plaintext'} props.language - 语言模式
 * @param {'autoSize'|'fillContainer'} props.mode - 高度模式
 * @param {number} props.minHeight - 最小高度（像素）
 * @param {number|string} props.maxHeight - 最大高度（像素或视口百分比）
 * @param {Object} props.options - 额外的 Monaco 选项
 * @param {number} props.debounceMs - 防抖毫秒数，0表示不防抖
 * @param {boolean} props.disabled - 是否禁用编辑器
 */
const CodeEditor = ({
  value = '',
  onChange,
  language = 'markdown',
  mode = 'autoSize',
  minHeight = 160,
  maxHeight = '60vh',
  options = {},
  debounceMs = 300,
  disabled = false,
  ...rest
}) => {
  const theme = useTheme();
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [editorHeight, setEditorHeight] = useState(minHeight);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const debounceTimerRef = useRef(null);

  // 处理编辑器内容变化，支持防抖
  const handleChange = useCallback((val) => {
    if (debounceMs > 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onChange?.(val);
      }, debounceMs);
    } else {
      onChange?.(val);
    }
  }, [onChange, debounceMs]);

  // 编辑器挂载后的回调
  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // 设置基础选项
    editor.updateOptions({
      wordWrap: 'on', // 软换行
      minimap: { enabled: false }, // 禁用 minimap
      scrollBeyondLastLine: false,
      // 统一关闭 automaticLayout，改用容器 ResizeObserver + 手动 layout
      automaticLayout: false,
      fontSize: 14,
      fontFamily: theme.typography.fontFamily,
      lineNumbers: 'on',
      readOnly: disabled,
      scrollbar: {
        alwaysConsumeMouseWheel: false, // 允许滚动透传到外层容器
      },
      ...options,
    });

    // 容器 ResizeObserver - 用于手动触发布局，替代 automaticLayout
    let containerResizeObserver = null;
    let layoutFrameId = null;
    
    if (containerRef.current) {
      containerResizeObserver = new ResizeObserver(() => {
        // 防止同一帧内重复触发布局
        if (layoutFrameId) {
          cancelAnimationFrame(layoutFrameId);
        }
        
        layoutFrameId = requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.layout();
          }
          layoutFrameId = null;
        });
      });
      
      containerResizeObserver.observe(containerRef.current);
    }

    // 自适应高度逻辑（仅在 autoSize 模式下）
    let heightDisposable = null;
    if (mode === 'autoSize') {
      let resizeTimeout = null;
      const updateHeight = () => {
        // 使用防抖避免频繁触发
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
          const contentHeight = editor.getContentHeight();
          const maxHeightPixels = typeof maxHeight === 'string'
            ? window.innerHeight * parseFloat(maxHeight) / 100
            : maxHeight;
          
          const newHeight = Math.max(minHeight, Math.min(contentHeight, maxHeightPixels));
          
          // 只有高度变化超过阈值时才更新，减少不必要的重渲染
          if (Math.abs(newHeight - editorHeight) > 1) {
            setEditorHeight(newHeight);
          }
        }, 100);
      };

      // 监听内容变化，但限制频率避免循环
      heightDisposable = editor.onDidContentSizeChange(() => {
        // 增加检查避免无限循环
        if (editor && editor.getContentHeight) {
          updateHeight();
        }
      });
      
      // 初始高度计算
      setTimeout(updateHeight, 200);
    }

    // 返回清理函数
    return () => {
      if (containerResizeObserver) {
        containerResizeObserver.disconnect();
      }
      if (layoutFrameId) {
        cancelAnimationFrame(layoutFrameId);
      }
      if (heightDisposable) {
        heightDisposable.dispose();
      }
    };
  }, [mode, minHeight, maxHeight, options, disabled, theme.typography.fontFamily]);

  // 主题变更处理
  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      const monaco = editorRef.current._monaco;
      if (monaco) {
        const newTheme = theme.palette.mode === 'dark' ? 'vs-dark' : 'vs';
        monaco.editor.setTheme(newTheme);
      }
    }
  }, [theme.palette.mode, isEditorReady]);

  // 在高度变化后触发布局更新，确保 Monaco 编辑器正确渲染
  useEffect(() => {
    if (isEditorReady && editorRef.current && mode === 'autoSize') {
      // 使用 requestAnimationFrame 确保 DOM 更新后再触发布局
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    }
  }, [editorHeight, isEditorReady, mode]);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 计算容器样式
  const containerStyle = {
    height: mode === 'autoSize' ? editorHeight : '100%',
    minHeight: mode === 'autoSize' ? minHeight : 'auto',
    maxHeight: mode === 'autoSize' ? maxHeight : 'none',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    overflow: 'hidden',
    // 两种模式都使用 contain 隔离布局变化，减少 ResizeObserver 级联风险
    contain: 'layout paint',
  };

  return (
    <Box ref={containerRef} sx={containerStyle} {...rest}>
      <Suspense fallback={<EditorLoadingFallback />}>
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={handleChange}
          theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs'}
          onMount={handleEditorDidMount}
          loading={<EditorLoadingFallback />}
          options={{
            wordWrap: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            // 统一关闭 automaticLayout，改用容器 ResizeObserver + 手动 layout
            automaticLayout: false,
            fontSize: 14,
            fontFamily: theme.typography.fontFamily,
            lineNumbers: 'on',
            readOnly: disabled,
            scrollbar: {
              alwaysConsumeMouseWheel: false, // 允许滚动透传到外层容器
            },
            ...options,
          }}
        />
      </Suspense>
    </Box>
  );
};

export default CodeEditor;