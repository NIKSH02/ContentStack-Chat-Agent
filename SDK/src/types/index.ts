// ContentStack Chat Widget SDK Types

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'status';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  isStatus?: boolean; // For status messages that show temporarily
}

export interface ChatWidgetTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  userMessageColor?: string;
  assistantMessageColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

// Removed LLMProvider interface as it's no longer needed for end-user configuration

export interface ChatWidgetProps {
  // API Configuration
  apiEndpoint?: string;
  
  // ContentStack Configuration
  tenantId?: string;
  apiKey?: string;
  projectId?: string;
  
  // LLM Configuration (Developer-only)
  provider?: string;
  model?: string;
  
  // UI Configuration
  theme?: ChatWidgetTheme;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  chatTitle?: string;
  placeholder?: string;
  welcomeMessage?: string;
  
  // Widget Behavior
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  onMessage?: (message: ChatMessage) => void;
  typingSpeed?: number; // milliseconds per character (default: 30)
  
  // Customization
  className?: string;
  style?: React.CSSProperties;
}

export interface ChatAPIRequest {
  query: string;
  tenantId?: string;
  apiKey?: string;
  projectId?: string;
  provider?: string;
  model?: string;
  sessionId?: string;
}

export interface ChatAPIResponse {
  response: string;
  metadata?: {
    toolsUsed?: string[];
    provider?: string;
    model?: string;
    timestamp?: string;
  };
  error?: string;
}

// Default theme with ContentStack branding
export const DEFAULT_THEME: ChatWidgetTheme = {
  primaryColor: '#6a5ddf',
  secondaryColor: '#f3f4f6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  userMessageColor: '#6a5ddf',
  assistantMessageColor: '#f3f4f6',
  borderRadius: '12px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

// Default LLM providers are no longer needed as they are configured by developers