/**
 * 测试视频Range请求支持
 * 用于验证后端是否正确处理Range请求
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
require('../config/env');

const attachmentService = require('../services/attachmentService');

async function testVideoRangeSupport() {
  console.log('=== 测试视频Range请求支持 ===');
  console.log('ATTACHMENTS_ENABLE_RANGE:', process.env.ATTACHMENTS_ENABLE_RANGE);
  
  try {
    // 查找第一个视频附件
    const Attachment = require('../models/Attachment');
    const videoAttachment = await Attachment.findOne({ category: 'video', status: 'active' });
    
    if (!videoAttachment) {
      console.log('未找到视频附件，请先上传一个视频文件');
      return;
    }
    
    console.log(`测试视频附件: ${videoAttachment._id} (${videoAttachment.originalName})`);
    
    // 测试无Range请求
    console.log('\n--- 测试完整文件请求 ---');
    const fullStream = await attachmentService.getAttachmentStream(videoAttachment._id);
    console.log(`状态码: ${fullStream.statusCode}`);
    console.log(`文件大小: ${fullStream.fileInfo.size}`);
    
    // 测试Range请求
    console.log('\n--- 测试Range请求 ---');
    const rangeStream = await attachmentService.getAttachmentStream(
      videoAttachment._id, 
      'bytes=0-1023'
    );
    console.log(`状态码: ${rangeStream.statusCode}`);
    if (rangeStream.rangeMeta) {
      console.log(`Content-Range: ${rangeStream.rangeMeta.unit} ${rangeStream.rangeMeta.start}-${rangeStream.rangeMeta.end}/${rangeStream.rangeMeta.total}`);
      console.log(`Content-Length: ${rangeStream.rangeMeta.length}`);
    }
    
    // 测试无效Range请求
    console.log('\n--- 测试无效Range请求 ---');
    try {
      const invalidRangeStream = await attachmentService.getAttachmentStream(
        videoAttachment._id, 
        'bytes=1000-0' // 无效范围
      );
      console.log('应该抛出错误但没有');
    } catch (error) {
      console.log(`正确处理无效Range: ${error.statusCode} ${error.message}`);
    }
    
    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testVideoRangeSupport();
