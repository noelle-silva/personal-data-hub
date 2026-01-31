/**
 * 集合数据迁移脚本
 * 用于将数据从一个集合迁移到另一个集合
 * 支持从默认的'documents'集合迁移到自定义集合
 */

const mongoose = require('mongoose');
require('../config/env');

/**
 * 集合迁移类
 */
class CollectionMigrator {
  /**
   * 构造函数
   * @param {string} sourceCollectionName - 源集合名称
   * @param {string} targetCollectionName - 目标集合名称
   */
  constructor(sourceCollectionName, targetCollectionName) {
    this.sourceCollectionName = sourceCollectionName;
    this.targetCollectionName = targetCollectionName;
  }

  /**
   * 连接到数据库
   */
  async connectDB() {
    try {
      const mongoURI = process.env.MONGODB_URI;
      if (!mongoURI) {
        throw new Error('MONGODB_URI环境变量未定义');
      }

      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log(`MongoDB连接成功: ${mongoose.connection.host}`);
      console.log(`使用数据库: ${mongoose.connection.name}`);
    } catch (error) {
      console.error('数据库连接失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 检查源集合是否存在
   * @returns {Promise<boolean>} 集合是否存在
   */
  async checkSourceCollection() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const exists = collections.some(collection => collection.name === this.sourceCollectionName);
      
      if (!exists) {
        console.log(`⚠️  源集合 '${this.sourceCollectionName}' 不存在`);
        return false;
      }
      
      console.log(`✅ 源集合 '${this.sourceCollectionName}' 存在`);
      return true;
    } catch (error) {
      console.error('检查源集合失败:', error.message);
      return false;
    }
  }

  /**
   * 检查目标集合是否已存在数据
   * @returns {Promise<boolean>} 目标集合是否有数据
   */
  async checkTargetCollectionData() {
    try {
      const targetCollection = mongoose.connection.db.collection(this.targetCollectionName);
      const count = await targetCollection.countDocuments();
      
      if (count > 0) {
        console.log(`⚠️  目标集合 '${this.targetCollectionName}' 已包含 ${count} 条数据`);
        return true;
      }
      
      console.log(`✅ 目标集合 '${this.targetCollectionName}' 为空`);
      return false;
    } catch (error) {
      console.error('检查目标集合失败:', error.message);
      return false;
    }
  }

  /**
   * 获取源集合中的文档数量
   * @returns {Promise<number>} 文档数量
   */
  async getSourceDocumentCount() {
    try {
      const sourceCollection = mongoose.connection.db.collection(this.sourceCollectionName);
      const count = await sourceCollection.countDocuments();
      return count;
    } catch (error) {
      console.error('获取源集合文档数量失败:', error.message);
      return 0;
    }
  }

  /**
   * 执行数据迁移
   * @param {boolean} force - 是否强制覆盖目标集合数据
   * @returns {Promise<boolean>} 迁移是否成功
   */
  async migrate(force = false) {
    try {
      // 检查源集合是否存在
      const sourceExists = await this.checkSourceCollection();
      if (!sourceExists) {
        return false;
      }

      // 检查目标集合是否有数据
      const hasTargetData = await this.checkTargetCollectionData();
      if (hasTargetData && !force) {
        console.log('❌ 目标集合已有数据，使用 --force 参数强制覆盖');
        return false;
      }

      // 获取源集合文档数量
      const sourceCount = await this.getSourceDocumentCount();
      if (sourceCount === 0) {
        console.log('ℹ️  源集合为空，无需迁移');
        return true;
      }

      console.log(`📊 准备迁移 ${sourceCount} 条文档...`);

      // 如果强制覆盖，先清空目标集合
      if (force && hasTargetData) {
        const targetCollection = mongoose.connection.db.collection(this.targetCollectionName);
        await targetCollection.deleteMany({});
        console.log('🗑️  已清空目标集合');
      }

      // 执行迁移
      const sourceCollection = mongoose.connection.db.collection(this.sourceCollectionName);
      const targetCollection = mongoose.connection.db.collection(this.targetCollectionName);
      
      const cursor = sourceCollection.find({});
      let migratedCount = 0;
      
      for await (const document of cursor) {
        await targetCollection.insertOne(document);
        migratedCount++;
        
        // 显示进度
        if (migratedCount % 10 === 0 || migratedCount === sourceCount) {
          console.log(`📝 已迁移 ${migratedCount}/${sourceCount} 条文档`);
        }
      }

      console.log(`✅ 迁移完成！成功迁移 ${migratedCount} 条文档`);
      console.log(`📁 从 '${this.sourceCollectionName}' 迁移到 '${this.targetCollectionName}'`);
      
      return true;
    } catch (error) {
      console.error('迁移失败:', error.message);
      return false;
    }
  }

  /**
   * 关闭数据库连接
   */
  async closeConnection() {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  const sourceCollection = args[0] || 'documents';
  const targetCollection = args[1] || process.env.DOCUMENT_COLLECTION || 'documents';
  const force = args.includes('--force');
  const help = args.includes('--help') || args.includes('-h');

  // 显示帮助信息
  if (help) {
    console.log(`
集合数据迁移工具

用法:
  node migrateCollection.js [源集合名称] [目标集合名称] [选项]

参数:
  源集合名称      要迁移的源集合名称 (默认: documents)
  目标集合名称    迁移到的目标集合名称 (默认: 环境变量 DOCUMENT_COLLECTION 或 documents)

选项:
  --force         强制覆盖目标集合中的现有数据
  --help, -h      显示此帮助信息

示例:
  # 从默认documents集合迁移到环境变量指定的集合
  node migrateCollection.js

  # 从documents集合迁移到my_documents集合
  node migrateCollection.js documents my_documents

  # 强制覆盖目标集合数据
  node migrateCollection.js documents my_documents --force

  # 从旧集合迁移到新集合
  node migrateCollection.js old_documents new_documents
`);
    process.exit(0);
  }

  console.log(`🚀 开始集合迁移...`);
  console.log(`📋 源集合: ${sourceCollection}`);
  console.log(`📋 目标集合: ${targetCollection}`);
  console.log(`📋 强制覆盖: ${force ? '是' : '否'}`);
  console.log('');

  const migrator = new CollectionMigrator(sourceCollection, targetCollection);
  
  try {
    await migrator.connectDB();
    const success = await migrator.migrate(force);
    
    if (success) {
      console.log('');
      console.log('🎉 迁移成功完成！');
      console.log('');
      console.log('💡 提示:');
      console.log(`   1. 请确保在 db.env 文件中设置 DOCUMENT_COLLECTION=${targetCollection}`);
      console.log('   2. 重启后端服务器以使用新的集合名称');
      console.log('   3. 验证数据是否正确迁移');
    } else {
      console.log('');
      console.log('❌ 迁移失败，请检查错误信息');
      process.exit(1);
    }
  } catch (error) {
    console.error('迁移过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    await migrator.closeConnection();
  }
}

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('未捕获的错误:', error);
    process.exit(1);
  });
}

module.exports = CollectionMigrator;
