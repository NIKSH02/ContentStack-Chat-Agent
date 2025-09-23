// ContentStack Chat Widget SDK
// Main exports for embedding in websites

// Import CSS styles
import './index.css';

export { ChatWidget } from './components/ChatWidget';
export { ChatMessage } from './components/ChatMessage';

export { useChat, useChatWidget } from './hooks/useChat';

export { ContentstackChatAPI, contentstackChatAPI } from './services/api';

export type {
  ChatWidgetProps,
  ChatMessage as ChatMessageType,
  ChatWidgetTheme,
  ChatAPIRequest,
  ChatAPIResponse
} from './types';

export {
  DEFAULT_THEME
} from './types';