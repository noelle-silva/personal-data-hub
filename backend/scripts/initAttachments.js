/**
 * 附件数据初始化脚本
 * 扫描现有图片文件并创建对应的元数据记录
 */

require('../config/env');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const Attachment = require('../models/Attachment');

/**
 * 获取项目根目录
 * @returns {String} 项目根目录路径
 */
function getProjectRoot() {
  // 从 scripts 目录返回到项目根目录 (e.g., tab/)
  return path.resolve(__dirname, '..', '..');
}

/**
 * 解析存储路径，支持相对路径和绝对路径
 * @param {String} dirPath - 配置的目录路径
 * @returns {String} 解析后的绝对路径
 */
function resolveStoragePath(dirPath) {
  if (path.isAbsolute(dirPath)) {
    return dirPath;
  }
  // 相对路径相对于项目根目录
  return path.resolve(getProjectRoot(), dirPath);
}

/**
 * 计算文件的SHA-256哈希值
 * @param {String} filePath - 文件路径
 * @returns {Promise<String>} 哈希值
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = require('fs').createReadStream(filePath);
    
    stream.on('data', (data) => {
      hash.update(data);
    });
    
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    
    stream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 获取文件信息
 * @param {String} filePath - 文件路径
 * @returns {Promise<Object>} 文件信息
 */
async function getFileInfo(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
      exists: true
    };
  } catch (error) {
    return {
      exists: false
    };
  }
}

/**
 * 扫描目录中的图片文件
 * @param {String} dirPath - 目录路径
 * @returns {Promise<Array>} 图片文件列表
 */
async function scanImageFiles(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    const imageFiles = [];
    
    // 支持的图片扩展名
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const extension = path.extname(file).substring(1).toLowerCase();
        
        if (allowedExtensions.includes(extension)) {
          imageFiles.push({
            name: file,
            path: filePath,
            extension
          });
        }
      }
    }
    
    return imageFiles;
  } catch (error) {
    console.error(`扫描目录失败: ${error.message}`);
    return [];
  }
}

/**
 * 创建附件元数据
 * @param {Object} fileInfo - 文件信息
 * @param {String} relativeDir - 相对目录
 * @returns {Promise<Object>} 附件元数据
 */
async function createAttachmentMetadata(fileInfo, relativeDir) {
  try {
    // 获取文件详细信息
    const fileDetails = await getFileInfo(fileInfo.path);
    if (!fileDetails.exists) {
      throw new Error(`文件不存在: ${fileInfo.path}`);
    }
    
    // 计算文件哈希
    const hash = await calculateFileHash(fileInfo.path);
    
    // 检查是否已存在相同哈希的记录
    const existingAttachment = await Attachment.findByHash(hash);
    if (existingAttachment) {
      const needsUpdate =
        existingAttachment.diskFilename !== fileInfo.name ||
        existingAttachment.originalName !== fileInfo.name ||
        existingAttachment.relativeDir !== relativeDir ||
        existingAttachment.extension !== fileInfo.extension ||
        existingAttachment.size !== fileDetails.size;

      if (needsUpdate) {
        existingAttachment.diskFilename = fileInfo.name;
        existingAttachment.originalName = fileInfo.name;
        existingAttachment.relativeDir = relativeDir;
        existingAttachment.extension = fileInfo.extension;
        existingAttachment.mimeType = mime.lookup(fileInfo.name) || `image/${fileInfo.extension}`;
        existingAttachment.size = fileDetails.size;
        existingAttachment.updatedAt = new Date();

        await existingAttachment.save();
        console.log(`文件已存在，已更新元数据: ${fileInfo.name} -> ${existingAttachment._id}`);
      } else {
        console.log(`文件已存在，跳过: ${fileInfo.name}`);
      }
      return existingAttachment;
    }
    
    // 使用原始文件名作为磁盘文件名，因为文件已存在
    const diskFilename = fileInfo.name;
    
    // 创建附件元数据
    const attachmentData = {
      category: 'image',
      originalName: fileInfo.name,
      mimeType: mime.lookup(fileInfo.name) || `image/${fileInfo.extension}`,
      extension: fileInfo.extension,
      size: fileDetails.size,
      diskFilename,
      relativeDir,
      hash
    };
    
    const attachment = new Attachment(attachmentData);
    const savedAttachment = await attachment.save();
    
    console.log(`创建附件元数据成功: ${fileInfo.name} -> ${savedAttachment._id}`);
    return savedAttachment;
    
  } catch (error) {
    console.error(`创建附件元数据失败: ${fileInfo.name} - ${error.message}`);
    throw error;
  }
}

/**
 * 初始化附件数据
 */
async function initAttachments() {
  try {
    console.log('开始初始化附件数据...');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');
    
    // 获取集合名称
    const attachmentCollection = process.env.ATTACHMENT_COLLECTION || 'attachments';
    console.log(`使用附件集合: ${attachmentCollection}`);
    
    // 获取图片存储目录
    const imageDir = process.env.ATTACHMENTS_IMAGE_DIR || 'backend/attachments/images';
    const resolvedImageDir = resolveStoragePath(imageDir);
    console.log(`扫描图片目录: ${resolvedImageDir}`);
    console.log(`项目根目录: ${getProjectRoot()}`);
    console.log(`配置的图片目录: ${imageDir}`);
    
    // 检查目录是否存在
    try {
      await fs.access(resolvedImageDir);
    } catch (error) {
      console.error(`图片目录不存在: ${resolvedImageDir}`);
      process.exit(1);
    }
    
    // 扫描图片文件
    const imageFiles = await scanImageFiles(resolvedImageDir);
    console.log(`找到 ${imageFiles.length} 个图片文件`);
    
    if (imageFiles.length === 0) {
      console.log('没有找到图片文件，退出初始化');
      return;
    }
    
    // 显示找到的文件列表
    console.log('\n找到的图片文件:');
    imageFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
    });
    
    // 创建附件元数据
    const createdAttachments = [];
    for (const file of imageFiles) {
      try {
        const attachment = await createAttachmentMetadata(file, 'images');
        createdAttachments.push(attachment);
      } catch (error) {
        console.error(`处理文件失败: ${file.name} - ${error.message}`);
      }
    }
    
    console.log(`\n成功创建 ${createdAttachments.length} 个附件元数据`);
    
    // 显示创建的附件信息
    console.log('\n创建的附件列表:');
    createdAttachments.forEach((attachment, index) => {
      console.log(`${index + 1}. ${attachment.originalName}`);
      console.log(`   ID: ${attachment._id}`);
      console.log(`   URL: ${attachment.url}`);
      console.log(`   大小: ${(attachment.size / 1024).toFixed(2)} KB`);
      console.log(`   哈希: ${attachment.hash.substring(0, 16)}...`);
    });
    
    console.log('\n附件数据初始化完成！');
    
  } catch (error) {
    console.error('初始化附件数据失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initAttachments();
}

module.exports = { initAttachments };
