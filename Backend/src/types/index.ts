// TypeScript interfaces for our application

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface ChatSession {
  sessionId: string;
  tenantId: string;
  userId: string | null;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface LLMRequest {
  id: string;
  messages: ChatMessage[];
  provider: string;
  model: string;
  options: {
    maxTokens: number;
    temperature: number;
    [key: string]: any;
  };
  timestamp: string;
}

export interface LLMResponse {
  id: string;
  content: string;
  provider: string;
  model: string;
  success: boolean;
  error: string | null;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface TenantConfig {
  tenantId: string;
  name: string;
  settings: {
    defaultProvider: string;
    defaultModel: string;
    maxTokens: number;
    temperature: number;
    [key: string]: any;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentstackEntry {
  uid: string;
  title: string;
  content_type: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  published_at: string;
  version: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface LLMProvider {
  name: string;
  models: string[];
  available: boolean;
}

export interface CleanMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResult {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
  provider: string;
}
