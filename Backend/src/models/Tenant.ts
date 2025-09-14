import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITenant extends Document {
  _id: Types.ObjectId;
  name: string;
  domain: string;
  apiKey: string;
  isActive: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  contentstack: {
    organizationUid: string;
    stackUid: string;
    stackApiKey: string; // Only for Content Delivery API calls
    region?: 'US' | 'EU' | 'AZURE_NA' | 'AZURE_EU' | 'GCP_NA';
    environment?: string;
    accessToken?: string; // OAuth access token for Management API
    refreshToken?: string; // For token refresh
    tokenExpiry?: Date; // Track token expiration
  };
  settings: {
    defaultProvider: string;
    defaultModel: string;
    maxTokens: number;
    temperature: number;
    allowedProviders: string[];
    rateLimits: {
      requestsPerMinute: number;
      requestsPerDay: number;
    };
    features: {
      streaming: boolean;
      fileUpload: boolean;
      analytics: boolean;
    };
  };
  usage: {
    totalRequests: number;
    totalTokens: number;
    lastRequestAt: Date;
  };
  billing: {
    customerId?: string;
    subscriptionId?: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>({
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true,
    maxlength: [100, 'Tenant name cannot exceed 100 characters']
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Basic domain validation
        return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v) || v === 'localhost';
      },
      message: 'Please provide a valid domain'
    }
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  contentstack: {
    organizationUid: {
      type: String,
      required: [true, 'ContentStack Organization UID is required'],
      trim: true,
      index: true
    },
    stackUid: {
      type: String,
      required: [true, 'ContentStack Stack UID is required'],
      trim: true,
      index: true
    },
    stackApiKey: {
      type: String,
      required: [true, 'ContentStack Stack API Key is required'],
      trim: true,
      select: false // Don't include in queries by default for security
    },
    region: {
      type: String,
      enum: ['US', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA'],
      default: 'EU'
    },
    environment: {
      type: String,
      default: 'production',
      trim: true
    },
    accessToken: {
      type: String,
      select: false, // Don't include in queries by default for security
      trim: true
    },
    refreshToken: {
      type: String,
      select: false, // Don't include in queries by default for security
      trim: true
    },
    tokenExpiry: {
      type: Date
    }
  },
  settings: {
    defaultProvider: {
      type: String,
      default: 'groq'
    },
    defaultModel: {
      type: String,
      default: 'llama-3.1-8b-instant'
    },
    maxTokens: {
      type: Number,
      default: 1000,
      min: 1,
      max: 4000
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2
    },
    allowedProviders: [{
      type: String,
      enum: ['groq', 'gemini', 'openrouter']
    }],
    rateLimits: {
      requestsPerMinute: {
        type: Number,
        default: 60
      },
      requestsPerDay: {
        type: Number,
        default: 1000
      }
    },
    features: {
      streaming: {
        type: Boolean,
        default: true
      },
      fileUpload: {
        type: Boolean,
        default: false
      },
      analytics: {
        type: Boolean,
        default: true
      }
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    lastRequestAt: {
      type: Date,
      default: Date.now
    }
  },
  billing: {
    customerId: String,
    subscriptionId: String,
    currentPeriodStart: {
      type: Date,
      default: Date.now
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
TenantSchema.index({ apiKey: 1 });
TenantSchema.index({ domain: 1 });
TenantSchema.index({ createdBy: 1 });
TenantSchema.index({ isActive: 1 });

// Virtual for plan limits
TenantSchema.virtual('planLimits').get(function() {
  const limits = {
    free: { requestsPerDay: 1000, maxTokens: 1000, providers: ['groq'] },
    pro: { requestsPerDay: 10000, maxTokens: 2000, providers: ['groq', 'gemini', 'openrouter'] },
    enterprise: { requestsPerDay: 100000, maxTokens: 4000, providers: ['groq', 'gemini', 'openrouter'] }
  };
  return limits[this.plan];
});

// Pre-save middleware to generate API key
TenantSchema.pre('save', function(next) {
  if (this.isNew && !this.apiKey) {
    this.apiKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }
  next();
});

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
