import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  _id: Types.ObjectId;
  name: string;
  key: string;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  permissions: string[];
  isActive: boolean;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  usage: {
    totalRequests: number;
    lastUsedAt?: Date;
  };
  restrictions: {
    allowedDomains: string[];
    allowedIPs: string[];
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>({
  name: {
    type: String,
    required: [true, 'API key name is required'],
    trim: true,
    maxlength: [100, 'API key name cannot exceed 100 characters']
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  permissions: [{
    type: String,
    enum: [
      'chat:read',
      'chat:write',
      'sessions:read',
      'sessions:write',
      'analytics:read',
      'settings:read',
      'settings:write'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 60
    },
    requestsPerDay: {
      type: Number,
      default: 1000
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    lastUsedAt: {
      type: Date
    }
  },
  restrictions: {
    allowedDomains: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    allowedIPs: [{
      type: String,
      trim: true
    }]
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ApiKeySchema.index({ key: 1 });
ApiKeySchema.index({ tenantId: 1 });
ApiKeySchema.index({ userId: 1 });
ApiKeySchema.index({ isActive: 1 });
ApiKeySchema.index({ expiresAt: 1 });

// Virtual for masked key (show only last 4 characters)
ApiKeySchema.virtual('maskedKey').get(function() {
  return `****-****-****-${this.key.slice(-4)}`;
});

// Virtual to check if key is expired
ApiKeySchema.virtual('isExpired').get(function() {
  return this.expiresAt ? new Date() > this.expiresAt : false;
});

// Pre-save middleware to generate API key
ApiKeySchema.pre('save', function(next) {
  if (this.isNew && !this.key) {
    this.key = `ck_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }
  next();
});

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
