import { ShortcutActionId } from './types';
import { store } from '../store';
import { openDocumentModal } from '../store/documentsSlice';
import { openQuoteModal } from '../store/quotesSlice';
import { 
  uploadAttachmentImage, 
  uploadAttachmentVideo, 
  uploadAttachmentDocument, 
  uploadAttachmentScript 
} from '../store/attachmentsSlice';

/**
 * 动作派发器类
 * 负责将快捷键动作转换为具体的应用行为
 */
class ActionDispatcher {
  private static instance: ActionDispatcher;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ActionDispatcher {
    if (!ActionDispatcher.instance) {
      ActionDispatcher.instance = new ActionDispatcher();
    }
    return ActionDispatcher.instance;
  }

  /**
   * 派发创建新笔记动作
   */
  public dispatchCreateNote(): void {
    console.debug('派发动作: 创建新笔记');
    store.dispatch(openDocumentModal(undefined));
  }

  /**
   * 派发创建新引用体动作
   */
  public dispatchCreateQuote(): void {
    console.debug('派发动作: 创建新引用体');
    store.dispatch(openQuoteModal(undefined));
  }

  /**
   * 派发上传图片动作
   */
  public dispatchUploadImage(): void {
    console.debug('派发动作: 上传图片');
    this.triggerFileUpload('image');
  }

  /**
   * 派发上传视频动作
   */
  public dispatchUploadVideo(): void {
    console.debug('派发动作: 上传视频');
    this.triggerFileUpload('video');
  }

  /**
   * 派发上传文档动作
   */
  public dispatchUploadDocument(): void {
    console.debug('派发动作: 上传文档');
    this.triggerFileUpload('document');
  }

  /**
   * 派发上传代码附件动作
   */
  public dispatchUploadScript(): void {
    console.debug('派发动作: 上传代码附件');
    this.triggerFileUpload('script');
  }

  /**
   * 触发文件上传
   * 通过全局门户组件的隐藏文件输入来实现
   */
  private triggerFileUpload(category: 'image' | 'video' | 'document' | 'script'): void {
    // 查找全局门户组件中的文件输入
    const inputId = `global-file-input-${category}`;
    const input = document.getElementById(inputId) as HTMLInputElement;
    
    if (input) {
      input.click();
    } else {
      console.warn(`未找到文件输入元素: ${inputId}`);
      // 回退方案：创建临时的文件输入
      this.createTempFileInput(category);
    }
  }

  /**
   * 创建临时文件输入（回退方案）
   */
  private createTempFileInput(category: 'image' | 'video' | 'document' | 'script'): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    
    // 根据类别设置 accept 属性
    switch (category) {
      case 'image':
        input.accept = 'image/png,image/jpeg,image/webp,image/gif';
        break;
      case 'video':
        input.accept = 'video/mp4,video/webm,video/ogg,video/quicktime';
        break;
      case 'document':
        input.accept = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
        break;
      case 'script':
        input.accept = 'text/x-python,application/x-msdos-program,text/x-shellscript,application/javascript,text/x-c++src';
        break;
    }
    
    input.multiple = true;
    
    // 监听文件选择
    input.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handleFileUpload(files, category);
      }
      // 清理临时元素
      document.body.removeChild(input);
    });
    
    // 添加到页面并触发点击
    document.body.appendChild(input);
    input.click();
  }

  /**
   * 处理文件上传
   */
  private handleFileUpload(files: FileList, category: 'image' | 'video' | 'document' | 'script'): void {
    const filesArray = Array.from(files);
    
    // 串行上传文件
    filesArray.forEach(async (file) => {
      try {
        let uploadAction;
        
        switch (category) {
          case 'image':
            uploadAction = uploadAttachmentImage({ file } as any);
            break;
          case 'video':
            uploadAction = uploadAttachmentVideo({ file } as any);
            break;
          case 'document':
            uploadAction = uploadAttachmentDocument({ file } as any);
            break;
          case 'script':
            uploadAction = uploadAttachmentScript({ file } as any);
            break;
        }
        
        if (uploadAction) {
          const result = await store.dispatch(uploadAction);
          console.log(`文件上传成功:`, result);
        }
      } catch (error) {
        console.error(`文件上传失败:`, error);
        // 这里可以添加用户通知
      }
    });
  }

  /**
   * 根据动作ID派发对应动作
   */
  public dispatchAction(actionId: ShortcutActionId): void {
    console.debug(`ActionDispatcher: 收到动作请求 ${actionId}`);
    
    switch (actionId) {
      case 'create-note':
        console.debug('ActionDispatcher: 执行创建笔记动作');
        this.dispatchCreateNote();
        break;
      case 'create-quote':
        console.debug('ActionDispatcher: 执行创建引用体动作');
        this.dispatchCreateQuote();
        break;
      case 'upload-image':
        console.debug('ActionDispatcher: 执行上传图片动作');
        this.dispatchUploadImage();
        break;
      case 'upload-video':
        console.debug('ActionDispatcher: 执行上传视频动作');
        this.dispatchUploadVideo();
        break;
      case 'upload-document':
        console.debug('ActionDispatcher: 执行上传文档动作');
        this.dispatchUploadDocument();
        break;
      case 'upload-script':
        console.debug('ActionDispatcher: 执行上传脚本动作');
        this.dispatchUploadScript();
        break;
      default:
        console.warn(`ActionDispatcher: 未知的动作ID: ${actionId}`);
        break;
    }
  }

  /**
   * 获取动作描述
   */
  public getActionDescription(actionId: ShortcutActionId): string {
    const descriptions: Record<ShortcutActionId, string> = {
      'create-note': '创建新笔记',
      'create-quote': '创建新引用体',
      'upload-image': '上传新图片',
      'upload-video': '上传新视频',
      'upload-document': '上传新文档',
      'upload-script': '上传新代码附件',
    };
    
    return descriptions[actionId] || '未知动作';
  }

  /**
   * 获取所有可用的动作ID
   */
  public getAllActionIds(): ShortcutActionId[] {
    return [
      'create-note',
      'create-quote',
      'upload-image',
      'upload-video',
      'upload-document',
      'upload-script',
    ];
  }

  /**
   * 检查动作是否可用
   */
  public isActionAvailable(actionId: ShortcutActionId): boolean {
    // 这里可以添加更复杂的可用性检查逻辑
    // 例如：检查用户权限、应用状态等
    return true;
  }
}

export default ActionDispatcher;