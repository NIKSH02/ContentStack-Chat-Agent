import React, { useState, useRef, useEffect } from 'react';
import type { ChatWidgetProps } from '../types';
import { DEFAULT_THEME } from '../types';
import { useChat, useChatWidget } from '../hooks/useChat';
import { ChatMessage } from './ChatMessage';

export const ChatWidget: React.FC<ChatWidgetProps> = (props) => {
  // ALL HOOKS MUST BE CALLED IN THE SAME ORDER EVERY RENDER
  // 1. State hooks first
  const [isMounted, setIsMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // 2. Ref hooks
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 3. Custom hooks
  const { isOpen, toggle } = useChatWidget(props.isOpen);
  const {
    messages,
    isLoading,
    sendMessage,
    cancelCurrentRequest,  
    clearMessages,
    messagesEndRef,
  } = useChat(props);

  // 4. Effect hooks last
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      setIsMounted(true);
    }, 100); // Small delay to ensure proper hydration
    
    return () => clearTimeout(timeoutId);
  }, []);

  // 5. Non-hook computations after all hooks
  const theme = { ...DEFAULT_THEME, ...props.theme };

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle toggle callback
  useEffect(() => {
    if (props.onToggle) {
      props.onToggle(isOpen);
    }
  }, [isOpen, props.onToggle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleStop = () => {
    cancelCurrentRequest();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const positionClass = (() => {
    switch (props.position) {
      case 'bottom-left': return 'bottom-5 left-2 sm:left-4';
      case 'bottom-right': return 'bottom-5 right-2 sm:right-4';
      case 'top-right': return 'top-5 right-2 sm:right-4';
      case 'top-left': return 'top-5 left-2 sm:left-4';
      default: return 'bottom-5 right-2 sm:right-4'; // Default to bottom-right
    }
  })();

  // Get chat window positioning based on button position
  const chatWindowPositionClass = (() => {
    switch (props.position) {
      case 'bottom-left': return 'fixed bottom-24 left-2 sm:left-4';
      case 'bottom-right': return 'fixed bottom-24 right-2 sm:right-4';
      case 'top-right': return 'fixed top-24 right-2 sm:right-4';
      case 'top-left': return 'fixed top-24 left-2 sm:left-4';
      default: return 'fixed bottom-24 right-2 sm:right-4'; // Default to bottom-right
    }
  })();

  // Don't render on server or before hydration (after all hooks are called)
  if (!isMounted) {
    console.log('🔍 ChatWidget: Not mounted yet, returning null');
    return null;
  }
  
  console.log('✅ ChatWidget: Rendering with position:', props.position);

  return (
    <>
      {/* Chat Widget Container */}
      <div 
        className={`contentstack-chat-widget fixed z-50 ${positionClass} ${props.className || ''}`}
        style={props.style}
      >
        {/* Chat Window with Animation - fixed positioning */}
        <div 
          className={`${chatWindowPositionClass} w-auto sm:w-96 max-w-[85%] sm:max-w-none h-[70vh] sm:h-[500px] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out transform z-50 ${
            isOpen 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }`}
          style={{
            backgroundColor: theme.backgroundColor,
            borderRadius: '16px',
            fontFamily: theme.fontFamily,
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3 text-white relative"
            style={{ 
              backgroundColor: theme.primaryColor,
              borderRadius: '16px 16px 0 0'
            }}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                CS
              </div>
              <div>
                <div className="font-semibold text-xs">
                  {props.chatTitle || 'ContentStack Assistant'}
                </div>
                <div className="text-xs opacity-80">
                  Powered by ContentStack
                </div>
              </div>
            </div>
            
            {/* Close Button - Better positioned */}
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-full hover:bg-white hover:text-[#6a5ddf] hover:bg-opacity-20 transition-colors flex items-center justify-center text-lg"
              title="Close Chat"
            >
              ✕
            </button>
          </div>

          {/* Settings Row */}
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={clearMessages}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-white rounded-md hover:bg-gray-100 transition-colors border"
                title="Clear Chat"
              >
                <span className="text-xs">🗑️</span>
                <span className="text-gray-600 text-xs hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 py-2 sm:py-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div 
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  CS
                </div>
                <div className="text-gray-600 text-xs mb-2">
                  Welcome to ContentStack Assistant
                </div>
                <div className="text-gray-400 text-xs">
                  Ask me anything about your content!
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full overflow-hidden">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    theme={theme}
                  />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2 sm:p-4 bg-gray-50 border-t border-gray-100">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={props.placeholder || "Ask me about your content..."}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:border-transparent text-xs"
                  style={{
                    fontFamily: theme.fontFamily
                  }}
                />
              </div>
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full text-white hover:opacity-90 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg bg-red-500 hover:bg-red-600"
                  title="Stop response"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full text-white hover:opacity-90 disabled:opacity-50 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
                  style={{ backgroundColor: theme.primaryColor }}
                  title="Send message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m22 2-7 20-4-9-9-4z"/>
                    <path d="M22 2 11 13"/>
                  </svg>
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Toggle Button with Animation */}
        <button
          onClick={toggle}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-xl transform hover:scale-105 ${
            isOpen ? 'rotate-45' : 'rotate-0'
          }`}
          style={{ backgroundColor: theme.primaryColor }}
          title={isOpen ? 'Close Chat' : 'Open Chat'}
        >
          {isOpen ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          )}
        </button>
      </div>
    </>
  );
};




