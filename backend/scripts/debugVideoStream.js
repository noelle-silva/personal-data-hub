/**
 * 调试视频流问题
 * 用于详细检查视频文件的流式传输
 */

const fs = require('fs');
const path = require('path');

const config = require('../config/config');

const attachmentService = require('../services/attachmentService');
const Attachment = require('../models/Attachment');

async function debugVideoStream() {
  console.log('=== 调试视频流问题 ===');
  console.log('ATTACHMENTS_ENABLE_RANGE:', config.attachments.enableRange);
  
  try {
    // 查找第一个视频附件
    const videoAttachment = await Attachment.findOne({ category: 'video', status: 'active' });
    
    if (!videoAttachment) {
      console.log('未找到视频附件，请先上传一个视频文件');
      return;
    }
    
    console.log(`调试视频附件: ${videoAttachment._id} (${videoAttachment.originalName})`);
    console.log(`文件大小: ${videoAttachment.size} 字节`);
    console.log(`MIME类型: ${videoAttachment.mimeType}`);
    
    // 检查文件是否存在
    const filePath = attachmentService.getAttachmentFilePath(videoAttachment);
    console.log(`文件路径: ${filePath}`);
    
    try {
      const stats = fs.statSync(filePath);
      console.log(`文件实际大小: ${stats.size} 字节`);
      console.log(`文件修改时间: ${stats.mtime}`);
    } catch (error) {
      console.error(`文件不存在或无法访问: ${error.message}`);
      return;
    }
    
    // 测试完整文件流
    console.log('\n--- 测试完整文件流 ---');
    try {
      const fullStream = await attachmentService.getAttachmentStream(videoAttachment._id);
      console.log(`状态码: ${fullStream.statusCode}`);
      console.log(`文件信息大小: ${fullStream.fileInfo.size}`);
      
      // 尝试读取前1024字节
      const chunks = [];
      fullStream.stream.on('data', (chunk) => {
        chunks.push(chunk);
        if (chunks.length === 1) { // 只读取第一个chunk
          console.log(`成功读取前 ${chunk.length} 字节`);
          console.log(`文件头 (hex): ${chunk.slice(0, 16).toString('hex')}`);
        }
      });
      
      fullStream.stream.on('end', () => {
        console.log('文件流读取完成');
      });
      
      fullStream.stream.on('error', (error) => {
        console.error(`文件流错误: ${error.message}`);
      });
      
      // 手动销毁流，避免挂起
      setTimeout(() => {
        if (!fullStream.stream.destroyed) {
          fullStream.stream.destroy();
        }
      }, 1000);
      
    } catch (error) {
      console.error(`获取完整文件流失败: ${error.message}`);
    }
    
    // 测试Range请求
    console.log('\n--- 测试Range请求 (bytes=0-1023) ---');
    try {
      const rangeStream = await attachmentService.getAttachmentStream(
        videoAttachment._id, 
        'bytes=0-1023'
      );
      console.log(`状态码: ${rangeStream.statusCode}`);
      if (rangeStream.rangeMeta) {
        console.log(`Content-Range: ${rangeStream.rangeMeta.unit} ${rangeStream.rangeMeta.start}-${rangeStream.rangeMeta.end}/${rangeStream.rangeMeta.total}`);
        console.log(`Content-Length: ${rangeStream.rangeMeta.length}`);
      }
      
      // 尝试读取Range数据
      const chunks = [];
      rangeStream.stream.on('data', (chunk) => {
        chunks.push(chunk);
        console.log(`Range数据读取: ${chunk.length} 字节`);
      });
      
      rangeStream.stream.on('end', () => {
        console.log('Range流读取完成');
      });
      
      rangeStream.stream.on('error', (error) => {
        console.error(`Range流错误: ${error.message}`);
      });
      
      // 手动销毁流，避免挂起
      setTimeout(() => {
        if (!rangeStream.stream.destroyed) {
          rangeStream.stream.destroy();
        }
      }, 1000);
      
    } catch (error) {
      console.error(`获取Range流失败: ${error.message}`);
    }
    
    // 检查文件签名
    console.log('\n--- 检查文件签名 ---');
    try {
      const buffer = fs.readFileSync(filePath, { start: 0, end: 11 });
      const signature = buffer.toString('hex');
      console.log(`文件签名: ${signature}`);
      
      // 常见视频文件签名
      const signatures = {
        'ftyp': '66747970', // MP4
        'webm': '1a45dfa3', // WebM
        'avi': '52494646', // AVI
        'mov': '6d6f6f76'  // QuickTime
      };
      
      for (const [format, sig] of Object.entries(signatures)) {
        if (signature.includes(sig)) {
          console.log(`检测到文件格式: ${format}`);
          break;
        }
      }
    } catch (error) {
      console.error(`读取文件签名失败: ${error.message}`);
    }
    
    console.log('\n=== 调试完成 ===');
  } catch (error) {
    console.error('调试失败:', error);
  }
}

// 运行调试
debugVideoStream();
