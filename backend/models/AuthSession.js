/**
 * AuthSession
 * 用于桌面端“无感续期”：短期 access token + 长期 refresh token（可轮换）
 */

const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    refreshTokenHash: { type: String, required: true },
    loginTimeMs: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: true },
    lastUsedAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
  },
  { versionKey: false }
);

module.exports = mongoose.model('AuthSession', authSessionSchema);

