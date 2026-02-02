import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import DocumentFormModal from './DocumentFormModal';
import QuoteFormModal from './QuoteFormModal';
import { selectIsModalOpen, closeDocumentModal } from '../store/documentsSlice';
import { selectIsQuoteCreateModalOpen, closeQuoteCreateModal } from '../store/quotesSlice';
import apiClient from '../services/apiClient';

/**
 * 全局动作门户组件
 * 提供隐藏的文件输入和模态框，供快捷键系统调用
 */
const GlobalActionPortal: React.FC = () => {
  useEffect(() => {
    // 创建隐藏的文件输入元素
    createHiddenFileInputs();
    
    return () => {
      // 清理隐藏的文件输入元素
      cleanupHiddenFileInputs();
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: -9999,
        left: -9999,
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 隐藏的文件输入元素 */}
      <input
        id="global-file-input-image"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        style={{ display: 'none' }}
      />
      <input
        id="global-file-input-video"
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        multiple
        style={{ display: 'none' }}
      />
      <input
        id="global-file-input-document"
        type="file"
        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        multiple
        style={{ display: 'none' }}
      />
      <input
        id="global-file-input-script"
        type="file"
        accept="text/x-python,application/x-msdos-program,text/x-shellscript,application/javascript,text/x-c++src"
        multiple
        style={{ display: 'none' }}
      />
      
      {/* 全局模态框容器 */}
      <GlobalModals />
    </Box>
  );
};

/**
 * 全局模态框组件
 */
const GlobalModals: React.FC = () => {
  // 直接从Redux状态获取模态框开关状态
  const documentModalOpen = useSelector(selectIsModalOpen);
  const quoteModalOpen = useSelector(selectIsQuoteCreateModalOpen);
  
  // 需要导入dispatch来关闭模态框
  const dispatch = useDispatch();

  // 处理文档创建
  const handleDocumentCreate = async (documentData: any) => {
    try {
      const response = await apiClient.post('/documents', documentData);
      const result = response.data;

      console.log('文档创建成功:', result);

      // 触发文档创建事件，通知其他组件刷新
      window.dispatchEvent(new CustomEvent('documentCreated', {
        detail: result.data
      }));

      dispatch(closeDocumentModal());
    } catch (error) {
      console.error('创建文档失败:', error);
      alert('创建文档失败，请重试');
    }
  };

  // 处理收藏夹创建
  const handleQuoteCreate = async (quoteData: any) => {
    try {
      const response = await apiClient.post('/quotes', quoteData);
      const result = response.data;

      console.log('收藏夹创建成功:', result);

      // 触发收藏夹创建事件，通知其他组件刷新
      window.dispatchEvent(new CustomEvent('quoteCreated', {
        detail: result.data
      }));

      dispatch(closeQuoteCreateModal());
    } catch (error) {
      console.error('创建收藏夹失败:', error);
      alert('创建收藏夹失败，请重试');
    }
  };

  return (
    <>
      {/* 文档创建模态框 */}
      <DocumentFormModal
        open={documentModalOpen}
        handleClose={() => dispatch(closeDocumentModal())}
        onSave={handleDocumentCreate}
        mode="create"
        document={undefined}
      />
      
      {/* 收藏夹创建模态框 */}
      <QuoteFormModal
        open={quoteModalOpen}
        handleClose={() => dispatch(closeQuoteCreateModal())}
        onSave={handleQuoteCreate}
        initialDocumentId={undefined}
      />
    </>
  );
};

/**
 * 创建隐藏的文件输入元素
 */
const createHiddenFileInputs = (): void => {
  // 确保文件输入元素存在
  const inputs = [
    'global-file-input-image',
    'global-file-input-video',
    'global-file-input-document',
    'global-file-input-script',
  ];

  inputs.forEach(id => {
    if (!document.getElementById(id)) {
      const input = document.createElement('input');
      input.id = id;
      input.type = 'file';
      input.style.display = 'none';
      
      // 根据类型设置 accept 属性
      switch (id) {
        case 'global-file-input-image':
          input.accept = 'image/png,image/jpeg,image/webp,image/gif';
          break;
        case 'global-file-input-video':
          input.accept = 'video/mp4,video/webm,video/ogg,video/quicktime';
          break;
        case 'global-file-input-document':
          input.accept = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
          break;
        case 'global-file-input-script':
          input.accept = 'text/x-python,application/x-msdos-program,text/x-shellscript,application/javascript,text/x-c++src';
          break;
      }
      
      input.multiple = true;
      document.body.appendChild(input);
    }
  });
};

/**
 * 清理隐藏的文件输入元素
 */
const cleanupHiddenFileInputs = (): void => {
  const inputs = [
    'global-file-input-image',
    'global-file-input-video',
    'global-file-input-document',
    'global-file-input-script',
  ];

  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input && input.parentNode) {
      input.parentNode.removeChild(input);
    }
  });
};

export default GlobalActionPortal;
