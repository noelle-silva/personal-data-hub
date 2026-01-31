/**
 * 清理 AI 提示词集合脚本
 * 删除或清空 AI_PROMPTS 集合，完成提示词系统的彻底清理
 */

require('../config/env');

const mongoose = require('mongoose');

// 从现有连接字符串中提取认证信息
const getAuthOptions = () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/personal-data-hub';
  const url = new URL(uri);
  
  return {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: url.searchParams.get('authSource') || 'admin',
    user: url.username,
    pass: url.password
  };
};

// 连接数据库
const connectDB = async () => {
  try {
    const authOptions = getAuthOptions();
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personal-data-hub', authOptions);
    console.log(`MongoDB 连接成功: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
};

/**
 * 清理 AI 提示词集合
 */
const cleanupAIPromptsCollection = async () => {
  try {
    console.log('开始清理 AI 提示词集合...');
    
    // 获取集合名称
    const collectionName = process.env.AI_PROMPTS_COLLECTION || 'AI-prompts';
    console.log(`目标集合: ${collectionName}`);
    
    // 尝试直接操作集合，如果不存在会自动处理错误
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);
    
    try {
      // 获取集合中的文档数量
      const count = await collection.countDocuments();
      console.log(`集合 ${collectionName} 中有 ${count} 个文档`);
      
      if (count === 0) {
        console.log(`集合 ${collectionName} 已经为空，无需清理`);
        return;
      }
    } catch (error) {
      if (error.code === 26) { // Namespace not found
        console.log(`集合 ${collectionName} 不存在，无需清理`);
        return;
      }
      throw error;
    }
    
    // 询问用户操作类型
    console.log('\n请选择清理方式:');
    console.log('1. 删除整个集合（推荐）');
    console.log('2. 清空集合中的所有文档');
    console.log('3. 仅显示文档数量，不执行删除');
    
    // 由于这是脚本，我们默认选择删除整个集合
    // 在生产环境中，您可能需要添加用户交互
    const cleanupMode = process.argv[2] || '1';
    
    switch (cleanupMode) {
      case '1':
        console.log('\n正在删除整个集合...');
        await collection.drop();
        console.log(`✓ 集合 ${collectionName} 已删除`);
        break;
        
      case '2':
        console.log('\n正在清空集合中的所有文档...');
        await collection.deleteMany({});
        console.log(`✓ 集合 ${collectionName} 中的所有文档已删除`);
        break;
        
      case '3':
        console.log(`\n集合 ${collectionName} 包含 ${count} 个文档，未执行删除操作`);
        break;
        
      default:
        console.log('\n无效的清理方式，跳过清理');
        break;
    }
    
  } catch (error) {
    console.error('清理 AI 提示词集合时发生错误:', error);
  }
};

/**
 * 主函数
 */
const main = async () => {
  try {
    await connectDB();
    await cleanupAIPromptsCollection();
    
    console.log('\n清理脚本执行完成');
    process.exit(0);
  } catch (error) {
    console.error('清理脚本执行失败:', error);
    process.exit(1);
  }
};

// 如果直接运行此脚本，则执行清理
if (require.main === module) {
  main();
}

module.exports = { cleanupAIPromptsCollection };
