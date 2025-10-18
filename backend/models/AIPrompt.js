/**
 * AI 系统提示词数据模型
 * 用于存储和管理AI系统提示词预设
 */

const mongoose = require('mongoose');

/**
 * AI 系统提示词 Schema
 */
const aiPromptSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '提示词名称不能为空'],
    unique: true,
    trim: true,
    maxlength: [100, '提示词名称不能超过100个字符']
  },
  content: {
    type: String,
    required: [true, '提示词内容不能为空'],
    trim: true,
    maxlength: [10000, '提示词内容不能超过10000个字符']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  // 集合名由环境变量决定，默认为 'AI-prompts'
  collection: process.env.AI_PROMPTS_COLLECTION || 'AI-prompts'
});

// 创建索引
aiPromptSchema.index({ name: 1 }, { unique: true });
aiPromptSchema.index({ isDefault: 1 });

// 确保只有一个默认预设的中间件
aiPromptSchema.pre('save', async function(next) {
  // 如果当前文档被设为默认
  if (this.isDefault) {
    try {
      // 将其他所有预设的 isDefault 设为 false
      await this.constructor.updateMany(
        { _id: { $ne: this._id } },
        { isDefault: false }
      );
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// 静态方法：获取默认预设
aiPromptSchema.statics.getDefault = async function() {
  return this.findOne({ isDefault: true });
};

// 静态方法：设置为默认预设
aiPromptSchema.statics.setDefault = async function(id) {
  // 首先将所有预设的 isDefault 设为 false
  await this.updateMany({}, { isDefault: false });
  
  // 然后将指定预设设为默认
  return this.findByIdAndUpdate(id, { isDefault: true }, { new: true });
};

// 删除前的中间件：如果删除的是默认预设，需要处理
aiPromptSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  if (this.isDefault) {
    // 如果删除的是默认预设，尝试将其他预设设为默认
    try {
      const anotherPrompt = await this.constructor.findOne({ _id: { $ne: this._id } });
      if (anotherPrompt) {
        await this.constructor.updateOne(
          { _id: anotherPrompt._id },
          { isDefault: true }
        );
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// 创建模型
const AIPrompt = mongoose.model('AIPrompt', aiPromptSchema);

module.exports = AIPrompt;