import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata: {
    provider?: string;
    model?: string;
    tokens?: number;
    cost?: number;
    responseTime?: number;
    [key: string]: any;
  };
}

export interface IChatSession extends Document {
  _id: Types.ObjectId;
  sessionId: string;
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  title: string;
  messages: IChatMessage[];
  settings: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  analytics: {
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    firstMessageAt: Date;
    lastMessageAt: Date;
  };
  isActive: boolean;
  tags: string[];
  clientInfo: {
    userAgent?: string;
    ip?: string;
    country?: string;
    referrer?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  id: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [10000, 'Message content cannot exceed 10000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    provider: String,
    model: String,
    tokens: Number,
    cost: Number,
    responseTime: Number
  }
}, { _id: false });

const ChatSessionSchema = new Schema<IChatSession>({
  sessionId: {
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
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Session title cannot exceed 200 characters'],
    default: 'New Chat Session'
  },
  messages: [ChatMessageSchema],
  settings: {
    provider: {
      type: String,
      enum: ['groq', 'gemini', 'openrouter'],
      default: 'groq'
    },
    model: {
      type: String,
      default: 'llama-3.1-8b-instant'
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7
    },
    maxTokens: {
      type: Number,
      min: 1,
      max: 4000,
      default: 1000
    }
  },
  analytics: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    firstMessageAt: {
      type: Date
    },
    lastMessageAt: {
      type: Date
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  clientInfo: {
    userAgent: String,
    ip: String,
    country: String,
    referrer: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ChatSessionSchema.index({ sessionId: 1 });
ChatSessionSchema.index({ tenantId: 1, createdAt: -1 });
ChatSessionSchema.index({ userId: 1, createdAt: -1 });
ChatSessionSchema.index({ isActive: 1 });
ChatSessionSchema.index({ 'analytics.lastMessageAt': -1 });

// Virtual for session duration
ChatSessionSchema.virtual('duration').get(function() {
  if (this.analytics.firstMessageAt && this.analytics.lastMessageAt) {
    return this.analytics.lastMessageAt.getTime() - this.analytics.firstMessageAt.getTime();
  }
  return 0;
});

// Pre-save middleware to update analytics
ChatSessionSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    const messages = this.messages;
    this.analytics.totalMessages = messages.length;
    
    // Calculate total tokens and cost
    let totalTokens = 0;
    let totalCost = 0;
    let totalResponseTime = 0;
    let responseCount = 0;
    
    messages.forEach(msg => {
      if (msg.metadata.tokens) {
        totalTokens += msg.metadata.tokens;
      }
      if (msg.metadata.cost) {
        totalCost += msg.metadata.cost;
      }
      if (msg.metadata.responseTime) {
        totalResponseTime += msg.metadata.responseTime;
        responseCount++;
      }
    });
    
    this.analytics.totalTokens = totalTokens;
    this.analytics.totalCost = totalCost;
    this.analytics.averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    
    // Set first and last message timestamps
    if (messages.length > 0) {
      this.analytics.firstMessageAt = messages[0].timestamp;
      this.analytics.lastMessageAt = messages[messages.length - 1].timestamp;
    }
  }
  next();
});

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
