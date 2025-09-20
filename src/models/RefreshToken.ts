import mongoose, { Document, Schema } from 'mongoose';

export interface IRefreshToken extends Document {
  user: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
  isExpired(): boolean;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  deviceInfo: {
    type: String,
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  }
});

// Automatically remove expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to clean up expired tokens
refreshTokenSchema.statics.cleanupExpired = async function() {
  return await this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Instance method to check if token is expired
refreshTokenSchema.methods.isExpired = function(): boolean {
  return this.expiresAt < new Date();
};

const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);

export default RefreshToken;