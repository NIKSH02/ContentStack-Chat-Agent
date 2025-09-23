import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, ChatWidgetProps } from '../types';
import { ContentstackChatAPI } from '../services/api';

export const useChat = (props: ChatWidgetProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Generate session ID once per component instance (persists until refresh)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Use developer-configured provider and model
  const provider = props.provider || 'groq';
  const model = props.model || 'llama-3.1-8b-instant';

  const apiRef = useRef(new ContentstackChatAPI(props.apiEndpoint));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAbortController = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on mount if provided
  useEffect(() => {
    if (props.welcomeMessage && messages.length === 0) {
      const welcomeMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        type: 'assistant',
        content: props.welcomeMessage,
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    }
  }, [props.welcomeMessage, messages.length]);

  // Cancel current request
  const cancelCurrentRequest = useCallback(() => {
    if (currentAbortController.current) {
      currentAbortController.current.abort();
      currentAbortController.current = null;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // If already loading, cancel the current request
    if (isLoading) {
      cancelCurrentRequest();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    currentAbortController.current = abortController;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create initial status message
    const statusMessageId = `status-${Date.now()}`;
    const initialStatusMessage: ChatMessage = {
      id: statusMessageId,
      type: 'status',
      content: '⏳ Processing your request...',
      timestamp: new Date(),
      isStatus: true,
    };

    setMessages(prev => [...prev, initialStatusMessage]);

    // Create streaming message for assistant (but don't add it yet)
    const streamingMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    try {
      const request = apiRef.current.createRequest(content, {
        tenantId: props.tenantId,
        apiKey: props.apiKey,
        projectId: props.projectId,
        provider: provider,
        model: model,
        sessionId: sessionId,
      });

      // Debug logging
      console.log('🔍 SDK Debug - Props provider:', props.provider);
      console.log('🔍 SDK Debug - Props model:', props.model);
      console.log('🔍 SDK Debug - Final provider:', provider);
      console.log('🔍 SDK Debug - Final model:', model);
      console.log('🔍 SDK Debug - Request payload:', request);

      // Use streaming API with typing effect
      await apiRef.current.sendMessageStream(
        request,
        // onChunk - append each character for typing effect
        (char: string) => {
          setMessages(prev => {
            // If this is the first chunk, add the streaming message and remove status
            const hasStreamingMessage = prev.some(msg => msg.id === streamingMessage.id);
            if (!hasStreamingMessage) {
              return prev
                .filter(msg => msg.id !== statusMessageId) // Remove status message
                .concat([{ ...streamingMessage, content: char, isLoading: true }]); // Add streaming message with first char
            } else {
              // Append character to existing streaming message
              return prev.map(msg => 
                msg.id === streamingMessage.id 
                  ? { ...msg, content: msg.content + char, isLoading: true }
                  : msg
              );
            }
          });
        },
        // onComplete - mark message as complete and remove status message
        () => {
          let finalMessage: ChatMessage | undefined;
          
          setMessages(prev => {
            const updated = prev
              .filter(msg => msg.id !== statusMessageId) // Remove status message
              .map(msg => 
                msg.id === streamingMessage.id 
                  ? { ...msg, isLoading: false }
                  : msg
              );
            
            // Find the final message for callback
            finalMessage = updated.find(m => m.id === streamingMessage.id);
            return updated;
          });
          
          setIsLoading(false);
          currentAbortController.current = null; // Clean up abort controller

          // Trigger callback if provided
          if (props.onMessage && finalMessage) {
            props.onMessage(finalMessage);
          }
        },
        // onError - handle streaming errors
        (error: string) => {
          console.error('Streaming error:', error);
          
          const errorMessage: ChatMessage = {
            id: streamingMessage.id,
            type: 'assistant',
            content: 'I apologize, but I encountered an error. Please try again.',
            timestamp: new Date(),
            isLoading: false,
          };

          setMessages(prev => 
            prev.filter(msg => msg.id !== statusMessageId) // Remove status message
              .map(msg => msg.id === streamingMessage.id ? errorMessage : msg)
          );
          setIsLoading(false);
          currentAbortController.current = null; // Clean up abort controller
        },
        // onStatus - update status message
        (status: string) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === statusMessageId 
                ? { ...msg, content: status }
                : msg
            )
          );
        },
        // typingSpeed - configurable typing speed
        props.typingSpeed || 30,
        // abortController - for cancellation support
        abortController
      );

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Replace streaming message with error message
      const errorMessage: ChatMessage = {
        id: streamingMessage.id,
        type: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
        isLoading: false,
      };

      setMessages(prev => 
        prev.map(msg => msg.id === streamingMessage.id ? errorMessage : msg)
      );
      setIsLoading(false);
      currentAbortController.current = null; // Clean up abort controller
    }
  }, [
    isLoading,
    provider,
    model,
    props.tenantId,
    props.apiKey,
    props.projectId,
    props.onMessage
  ]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    if (props.welcomeMessage) {
      const welcomeMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        type: 'assistant',
        content: props.welcomeMessage,
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    }
  }, [props.welcomeMessage]);

  return {
    messages,
    isLoading,
    sendMessage,
    cancelCurrentRequest,
    clearMessages,
    messagesEndRef,
  };
};

export const useChatWidget = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    toggle,
    open,
    close,
  };
};