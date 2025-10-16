/**
 * 检查视频附件状态和文件路径的脚本
 * 用于排查视频播放失败问题
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '../file.env' });

// 导入附件模型
const Attachment = require('../models/Attachment');

/**
 * 连接数据库
 */
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-cards';
    await mongoose.connect(mongoUri);
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
}

/**
 * 获取类别对应的存储目录
 */
function getCategoryStorageDir(category) {
  const imageDir = process.env.ATTACHMENTS_IMAGE_DIR || 'backend/attachments/images';
  const videoDir = process.env.ATTACHMENTS_VIDEO_DIR || 'backend/attachments/videos';
  const documentDir = process.env.ATTACHMENTS_FILE_DIR || 'backend/attachments/files';

  switch (category) {
    case 'image':
      return path.resolve(__dirname, '..', '..', imageDir);
    case 'video':
      return path.resolve(__dirname, '..', '..', videoDir);
    case 'document':
      return path.resolve(__dirname, '..', '..', documentDir);
    default:
      return path.resolve(__dirname, '..', '..', imageDir);
  }
}

/**
 * 检查附件状态
 */
async function checkAttachment(attachmentId) {
  try {
    console.log(`\n=== 检查附件: ${attachmentId} ===`);
    
    // 1. 检查数据库记录
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      console.log('❌ 附件在数据库中不存在');
      return;
    }
    
    console.log('✅ 附件数据库记录存在');
    console.log('  - 类别:', attachment.category);
    console.log('  - 原始名称:', attachment.originalName);
    console.log('  - MIME类型:', attachment.mimeType);
    console.log('  - 磁盘文件名:', attachment.diskFilename);
    console.log('  - 相对目录:', attachment.relativeDir);
    console.log('  - 状态:', attachment.status);
    console.log('  - 大小:', attachment.size, '字节');
    console.log('  - 哈希:', attachment.hash);
    console.log('  - 创建时间:', attachment.createdAt);
    
    if (attachment.status !== 'active') {
      console.log('❌ 附件状态不是active，可能是已删除');
      return;
    }
    
    // 2. 检查文件路径
    const storageDir = getCategoryStorageDir(attachment.category);
    const filePath = path.join(storageDir, attachment.diskFilename);
    
    console.log('\n📁 文件路径检查:');
    console.log('  - 存储目录:', storageDir);
    console.log('  - 完整路径:', filePath);
    
    // 3. 检查文件是否存在
    try {
      const stats = fs.statSync(filePath);
      console.log('✅ 文件存在');
      console.log('  - 文件大小:', stats.size, '字节');
      console.log('  - 修改时间:', stats.mtime);
      console.log('  - 是否为文件:', stats.isFile());
      
      // 检查文件大小是否与数据库记录一致
      if (stats.size !== attachment.size) {
        console.log('⚠️  文件大小与数据库记录不一致');
        console.log('  - 数据库记录:', attachment.size);
        console.log('  - 实际文件:', stats.size);
      }
    } catch (error) {
      console.log('❌ 文件不存在或无法访问:', error.message);
      
      // 尝试在历史目录中查找
      console.log('\n🔍 尝试在历史目录中查找文件...');
      const historicalDirs = [
        path.resolve(__dirname, '..', '..', 'backend/attachments/images/videos'),
        path.resolve(__dirname, '..', '..', 'backend/attachments/videos'),
        path.resolve(__dirname, '..', '..', 'backend/attachments/images')
      ];
      
      for (const dir of historicalDirs) {
        const historicalPath = path.join(dir, attachment.diskFilename);
        try {
          const stats = fs.statSync(historicalPath);
          console.log(`✅ 在历史目录中找到文件: ${historicalPath}`);
          console.log('  - 文件大小:', stats.size, '字节');
          console.log('  - 修改时间:', stats.mtime);
          break;
        } catch (error) {
          // 继续检查下一个目录
        }
      }
    }
    
    // 4. 检查配置
    console.log('\n⚙️  配置检查:');
    console.log('  - ATTACHMENTS_ENABLE_RANGE:', process.env.ATTACHMENTS_ENABLE_RANGE);
    console.log('  - ATTACHMENTS_VIDEO_DIR:', process.env.ATTACHMENTS_VIDEO_DIR);
    console.log('  - ATTACHMENTS_CACHE_TTL:', process.env.ATTACHMENTS_CACHE_TTL);
    console.log('  - ATTACHMENTS_SECRET:', process.env.ATTACHMENTS_SECRET ? '已配置' : '未配置');
    
  } catch (error) {
    console.error('检查附件时出错:', error);
  }
}

/**
 * 列出所有视频附件
 */
async function listVideoAttachments() {
  try {
    console.log('\n=== 所有视频附件列表 ===');
    
    const videos = await Attachment.find({ category: 'video', status: 'active' })
      .select('_id originalName diskFilename size createdAt')
      .sort({ createdAt: -1 });
    
    if (videos.length === 0) {
      console.log('没有找到视频附件');
      return;
    }
    
    console.log(`找到 ${videos.length} 个视频附件:\n`);
    
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ID: ${video._id}`);
      console.log(`   名称: ${video.originalName}`);
      console.log(`   大小: ${(video.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   创建时间: ${video.createdAt}`);
      console.log('');
    });
    
    return videos;
  } catch (error) {
    console.error('列出视频附件时出错:', error);
    return [];
  }
}

/**
 * 主函数
 */
async function main() {
  const attachmentId = process.argv[2];
  
  if (!attachmentId) {
    console.log('用法: node checkVideoAttachment.js <attachment_id>');
    console.log('或者不带参数运行以列出所有视频附件:');
    
    const videos = await listVideoAttachments();
    if (videos.length > 0) {
      console.log('\n请使用附件ID作为参数运行此脚本进行详细检查:');
      console.log('例如: node checkVideoAttachment.js', videos[0]._id);
    }
    
    await mongoose.disconnect();
    return;
  }
  
  await connectDB();
  await checkAttachment(attachmentId);
  await mongoose.disconnect();
}

// 运行主函数
main().catch(error => {
  console.error('脚本执行出错:', error);
  process.exit(1);
});