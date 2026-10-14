const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'],
      default: 'viewer',
    },

    apiKey: { type: String, default: null, index: true },
    apiKeyExpiresAt: { type: Date, default: null },

    activeSessions: [
      {
        key: { type: String, required: true },
        expiresAt: { type: Date, required: true },
      },
    ],

    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

userSchema.methods.pruneExpiredSessions = function () {
  const now = new Date();
  this.activeSessions = this.activeSessions.filter((s) => s.expiresAt > now);
};

module.exports = mongoose.model('User', userSchema);
