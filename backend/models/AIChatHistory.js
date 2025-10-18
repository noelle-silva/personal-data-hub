/**
 * AI 聊天历史数据模型
 * 用于存储和管理AI角色的聊天会话历史
 */

const mongoose = require('mongoose');

/**
 * AI 聊天历史 Schema
 */
const aiChatHistorySchema = new mongoose.Schema({
  // 关联的AI角色ID，可为空表示无系统提示词
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIRole',
    default: null
  },
  // 角色名称快照，便于显示
  roleNameSnapshot: {
    type: String,
    default: null
  },
  // 系统提示词快照，便于复现上下文
  systemPromptSnapshot: {
    type: String,
    default: null
  },
  // 模型快照，便于复现上下文
  modelSnapshot: {
    type: String,
    default: null
  },
  // 会话标题，默认使用首条用户消息前30个字符
  title: {
    type: String,
    required: [true, '会话标题不能为空'],
    trim: true,
    maxlength: [100, '会话标题不能超过100个字符']
  },
  // 消息数组
  messages: [{
    role: {
      type: String,
      required: [true, '消息角色不能为空'],
      enum: ['user', 'assistant', 'system']
    },
    content: {
      type: String,
      required: [true, '消息内容不能为空']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    model: {
      type: String,
      default: null
    },
    incomplete: {
      type: Boolean,
      default: false
    }
  }],
  // 最后一条消息的时间
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  // 消息数量
  messageCount: {
    type: Number,
    default: 0,
    min: [0, '消息数量不能小于0']
  },
  // 是否已归档
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  // 集合名由环境变量决定，默认为 'ai-chat-history'
  collection: process.env.AI_CHAT_HISTORY_COLLECTION || 'ai-chat-history'
});

// 创建索引
aiChatHistorySchema.index({ roleId: 1, updatedAt: -1 });
aiChatHistorySchema.index({ updatedAt: -1 });
aiChatHistorySchema.index({ lastMessageAt: -1 });
aiChatHistorySchema.index({ archived: 1 });

// 静态方法：根据角色ID获取聊天历史列表
aiChatHistorySchema.statics.getByRoleId = function(roleId, options = {}) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ 
    roleId, 
    archived: false 
  })
  .sort({ lastMessageAt: -1 })
  .skip(skip)
  .limit(limit)
  .select('title lastMessageAt messageCount roleNameSnapshot modelSnapshot createdAt');
};

// 静态方法：获取所有聊天历史列表
aiChatHistorySchema.statics.getAll = function(options = {}) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ 
    archived: false 
  })
  .sort({ lastMessageAt: -1 })
  .skip(skip)
  .limit(limit)
  .select('title lastMessageAt messageCount roleNameSnapshot modelSnapshot createdAt');
};

// 静态方法：生成会话标题
aiChatHistorySchema.statics.generateTitle = function(userMessage, roleName = null) {
  if (!userMessage || typeof userMessage !== 'string') {
    return roleName ? `${roleName} - ${new Date().toLocaleString()}` : '新对话';
  }
  
  // 去除换行和多余空白，取前30个字符
  const cleanMessage = userMessage.replace(/\s+/g, ' ').trim();
  const title = cleanMessage.length > 30 ? cleanMessage.substring(0, 30) + '...' : cleanMessage;
  
  return title || (roleName ? `${roleName} - ${new Date().toLocaleString()}` : '新对话');
};

// 实例方法：添加消息
aiChatHistorySchema.methods.addMessage = function(message) {
  this.messages.push(message);
  this.messageCount = this.messages.length;
  this.lastMessageAt = new Date();
  
  // 如果是第一条用户消息且还没有标题，生成标题
  if (this.messages.length === 1 && message.role === 'user' && !this.title) {
    this.title = this.constructor.generateTitle(message.content, this.roleNameSnapshot);
  }
  
  return this.save();
};

// 实例方法：更新最后一条助手消息（用于流式响应完成后的最终更新）
aiChatHistorySchema.methods.updateLastAssistantMessage = function(content, model = null) {
  const lastMessage = this.messages[this.messages.length - 1];
  
  if (lastMessage && lastMessage.role === 'assistant') {
    lastMessage.content = content;
    lastMessage.model = model;
    lastMessage.incomplete = false;
    lastMessage.timestamp = new Date();
  } else {
    // 如果没有最后一条消息或不是助手消息，添加新的助手消息
    this.messages.push({
      role: 'assistant',
      content,
      model,
      incomplete: false,
      timestamp: new Date()
    });
  }
  
  this.messageCount = this.messages.length;
  this.lastMessageAt = new Date();
  
  return this.save();
};

// 创建模型
const AIChatHistory = mongoose.model('AIChatHistory', aiChatHistorySchema);

module.exports = AIChatHistory;