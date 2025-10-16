/**
 * 数据库连接配置
 * 负责建立和管理与MongoDB的连接
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './db.env' });

/**
 * 连接到MongoDB数据库
 * @returns {Promise} 返回连接成功的Promise
 */
const connectDB = async () => {
  try {
    // 从环境变量获取数据库连接字符串
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI环境变量未定义');
    }

    // 配置mongoose连接选项
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    // 建立数据库连接
    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`MongoDB连接成功: ${conn.connection.host}`);
    console.log(`使用数据库: ${conn.connection.name}`);
    console.log(`使用集合: ${process.env.DOCUMENT_COLLECTION || 'documents'}`);
    
    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB连接错误:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB连接已断开');
    });

    // 优雅关闭数据库连接
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB连接已关闭（应用终止）');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;