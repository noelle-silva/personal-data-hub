/**
 * AI 角色数据模型
 * 用于存储和管理AI角色配置，包含系统提示词、默认模型、温度设置等
 */

const mongoose = require('mongoose');

/**
 * AI 角色 Schema
 */
const aiRoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '角色名称不能为空'],
    unique: true,
    trim: true,
    maxlength: [100, '角色名称不能超过100个字符']
  },
  systemPrompt: {
    type: String,
    required: [true, '系统提示词不能为空'],
    trim: true,
    maxlength: [10000, '系统提示词不能超过10000个字符']
  },
  defaultModel: {
    type: String,
    trim: true,
    maxlength: [100, '默认模型名称不能超过100个字符']
  },
  defaultTemperature: {
    type: Number,
    min: [0, '温度值不能小于0'],
    max: [2, '温度值不能大于2'],
    default: 0.7
  },
  // 上下文Token上限，用于控制对话历史长度
  contextTokenLimit: {
    type: Number,
    min: [1, '上下文Token上限必须大于0'],
    max: [2000000, '上下文Token上限不能超过2000000'],
    default: 8192
  },
  // 最大输出Token上限，控制AI回复的最大长度
  maxOutputTokens: {
    type: Number,
    min: [1, '最大输出Token上限必须大于0'],
    max: [8192, '最大输出Token上限不能超过8192'],
    default: 4096
  },
  // Top P 参数，控制词汇选择的多样性
  topP: {
    type: Number,
    min: [0, 'Top P值不能小于0'],
    max: [1, 'Top P值不能大于1'],
    default: 1.0
  },
  // Top K 参数，控制候选词汇数量
  topK: {
    type: Number,
    min: [0, 'Top K值不能小于0'],
    max: [64, 'Top K值不能大于64'],
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  // 集合名由环境变量决定，默认为 'AI-roles'
  collection: process.env.AI_ROLES_COLLECTION || 'AI-roles'
});

// 创建索引
aiRoleSchema.index({ name: 1 }, { unique: true });
aiRoleSchema.index({ isDefault: 1 });

// 确保只有一个默认角色的中间件
aiRoleSchema.pre('save', async function(next) {
  // 如果当前文档被设为默认
  if (this.isDefault) {
    try {
      // 将其他所有角色的 isDefault 设为 false
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

// 静态方法：获取默认角色
aiRoleSchema.statics.getDefault = async function() {
  return this.findOne({ isDefault: true });
};

// 静态方法：设置为默认角色
aiRoleSchema.statics.setDefault = async function(id) {
  // 首先将所有角色的 isDefault 设为 false
  await this.updateMany({}, { isDefault: false });
  
  // 然后将指定角色设为默认
  return this.findByIdAndUpdate(id, { isDefault: true }, { new: true });
};

// 删除前的中间件：如果删除的是默认角色，需要处理
aiRoleSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  if (this.isDefault) {
    // 如果删除的是默认角色，尝试将其他角色设为默认
    try {
      const anotherRole = await this.constructor.findOne({ _id: { $ne: this._id } });
      if (anotherRole) {
        await this.constructor.updateOne(
          { _id: anotherRole._id },
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
const AIRole = mongoose.model('AIRole', aiRoleSchema);

module.exports = AIRole;