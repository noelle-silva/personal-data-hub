/**
 * 引用体数据初始化脚本
 * 基于现有文档随机创建示例引用体数据
 */

require('../config/env');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Quote = require('../models/Quote');

/**
 * 示例引用体标题模板
 */
const quoteTitleTemplates = [
  '关于{topic}的核心观点',
  '{topic}的关键理解',
  '{topic}实践总结',
  '{topic}方法论提炼',
  '{topic}应用场景分析',
  '{topic}技术要点',
  '{topic}设计思路',
  '{topic}实现细节',
  '{topic}问题解决方案',
  '{topic}最佳实践'
];

/**
 * 示例引用体描述模板
 */
const quoteDescriptionTemplates = [
  '这是从多个学习资料中提取的关于{topic}的核心观点总结',
  '基于实际项目经验总结的{topic}相关要点',
  '结合理论与实践的{topic}知识体系梳理',
  '针对{topic}的深度分析与思考',
  '从不同角度理解{topic}的关键要素',
  '{topic}相关技术的综合应用指南',
  '解决{topic}常见问题的有效方法',
  '{topic}学习路径与资源推荐',
  '{topic}领域的前沿趋势与发展方向',
  '{topic}实践中的经验与教训'
];

/**
 * 示例引用体内容模板
 */
const quoteContentTemplates = [
  `通过深入研究和实践，我发现{topic}的核心在于理解其基本原理和适用场景。在实际应用中，我们需要根据具体情况灵活运用，同时注意避免常见的误区和陷阱。`,
  
  `{topic}是一个复杂但重要的主题。从理论层面来看，它涉及多个知识点的整合；从实践角度来看，它需要我们在具体场景中不断尝试和优化。`,
  
  `在学习{topic}的过程中，我逐渐认识到理论与实践的结合至关重要。单纯的理论学习容易脱离实际，而缺乏理论指导的实践则难以系统化。`,
  
  `{topic}的价值在于它能够帮助我们解决实际问题。通过系统学习和实践应用，我们可以更好地掌握这一领域的知识和技能。`,
  
  `对于{topic}的理解，我认为需要从多个维度进行思考。既要关注技术细节，也要考虑整体架构；既要重视当前实现，也要规划未来发展。`,
  
  `在处理{topic}相关问题时，我发现建立系统性的思维方式非常重要。这不仅有助于我们理解复杂的概念，也能提高问题解决的效率。`,
  
  `{topic}的学习是一个持续的过程。随着技术的不断发展，我们需要保持学习的热情，及时更新知识体系，适应新的变化和挑战。`,
  
  `通过实践{topic}，我深刻体会到细节的重要性。很多时候，成功与否取决于我们对细节的把握和处理能力。`,
  
  `{topic}的应用场景非常广泛，但不同场景下的需求和约束条件各不相同。因此，我们需要根据具体情况选择合适的解决方案。`,
  
  `掌握{topic}需要时间和耐心。在学习过程中，我们可能会遇到各种困难和挑战，但只要坚持下去，最终一定能够有所收获。`
];

/**
 * 示例标签集合
 */
const commonTags = [
  'JavaScript', 'React', 'Node.js', '前端', '后端', '全栈',
  '数据库', 'MongoDB', 'API', 'REST', 'GraphQL', '微服务',
  '架构', '设计模式', '算法', '数据结构', '性能优化',
  '安全', '测试', 'DevOps', 'CI/CD', 'Docker', 'Kubernetes',
  '云计算', 'AWS', 'Azure', '机器学习', '人工智能', '数据分析',
  '项目管理', '敏捷开发', '团队协作', '用户体验', '产品设计',
  '网络', 'HTTP', 'TCP/IP', '安全', '加密', '认证', '授权',
  '移动开发', 'iOS', 'Android', 'React Native', 'Flutter',
  '工具', 'VSCode', 'Git', 'Webpack', 'Babel', 'TypeScript'
];

/**
 * 随机选择数组中的元素
 * @param {Array} array - 源数组
 * @param {Number} count - 选择的数量
 * @returns {Array|String} 随机选择的元素数组或单个元素
 */
function randomChoice(array, count = 1) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return count === 1 ? shuffled[0] : shuffled.slice(0, count);
}

/**
 * 生成随机引用体数据
 * @param {Array} documents - 文档数组
 * @param {Number} count - 要生成的引用体数量
 * @returns {Array} 引用体数据数组
 */
function generateQuoteData(documents, count = 10) {
  if (documents.length === 0) {
    console.error('没有可用的文档数据，请先运行 npm run init-data');
    return [];
  }

  const quotes = [];
  
  for (let i = 0; i < count; i++) {
    // 随机选择1-3个文档作为引用源
    const numDocs = Math.floor(Math.random() * 3) + 1;
    const referencedDocs = randomChoice(documents, numDocs);
    // 确保referencedDocs始终是数组
    const docsArray = Array.isArray(referencedDocs) ? referencedDocs : [referencedDocs];
    const referencedDocumentIds = docsArray.map(doc => doc._id);
    
    // 从引用的文档中提取关键词作为主题
    const allTags = [...new Set(docsArray.flatMap(doc => doc.tags || []))];
    const topic = allTags.length > 0 ? randomChoice(allTags) : '技术学习';
    
    // 随机选择模板并替换占位符
    const titleTemplate = randomChoice(quoteTitleTemplates);
    const descriptionTemplate = randomChoice(quoteDescriptionTemplates);
    const contentTemplate = randomChoice(quoteContentTemplates);
    
    const title = titleTemplate.replace(/{topic}/g, topic);
    const description = descriptionTemplate.replace(/{topic}/g, topic);
    const content = contentTemplate.replace(/{topic}/g, topic);
    
    // 随机生成标签（2-5个）
    const tags = randomChoice(commonTags, Math.floor(Math.random() * 4) + 2);
    
    quotes.push({
      title,
      description,
      content,
      tags,
      referencedDocumentIds
    });
  }
  
  return quotes;
}

/**
 * 初始化引用体数据
 */
async function initQuotes() {
  try {
    console.log('开始初始化引用体数据...');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');
    
    // 获取集合名称
    const documentCollection = process.env.DOCUMENT_COLLECTION || 'documents';
    const quoteCollection = process.env.QUOTE_COLLECTION || 'quotes';
    
    console.log(`使用文档集合: ${documentCollection}`);
    console.log(`使用引用体集合: ${quoteCollection}`);
    
    // 检查现有文档数据
    const documentCount = await Document.countDocuments();
    if (documentCount === 0) {
      console.error('没有找到文档数据，请先运行 npm run init-data 初始化文档数据');
      process.exit(1);
    }
    
    console.log(`找到 ${documentCount} 个文档`);
    
    // 获取所有文档（用于随机选择）
    const documents = await Document.find().select('_id tags').limit(50);
    
    // 清空现有引用体数据
    const deleteResult = await Quote.deleteMany({});
    console.log(`已清空 ${deleteResult.deletedCount} 个现有引用体`);
    
    // 生成引用体数据
    const quotesData = generateQuoteData(documents, 15);
    
    if (quotesData.length === 0) {
      console.error('未能生成引用体数据');
      process.exit(1);
    }
    
    // 插入引用体数据
    const insertResult = await Quote.insertMany(quotesData);
    console.log(`成功创建 ${insertResult.length} 个引用体`);
    
    // 显示创建的引用体信息
    console.log('\n创建的引用体列表:');
    insertResult.forEach((quote, index) => {
      console.log(`${index + 1}. ${quote.title}`);
      console.log(`   标签: ${quote.tags.join(', ')}`);
      console.log(`   引用文档数: ${quote.referencedDocumentIds.length}`);
    });
    
    console.log('\n引用体数据初始化完成！');
    
  } catch (error) {
    console.error('初始化引用体数据失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initQuotes();
}

module.exports = { initQuotes, generateQuoteData };
