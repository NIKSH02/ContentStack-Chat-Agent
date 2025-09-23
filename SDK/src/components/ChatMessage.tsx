import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType, ChatWidgetTheme } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  theme: ChatWidgetTheme;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, theme }) => {
  const isUser = message.type === 'user';
  const isStatus = message.type === 'status';
  const isLoading = message.isLoading;

  const LoadingDots = () => (
    <div className="flex space-x-1">
      <div 
        className="w-2 h-2 rounded-full animate-bounce"
        style={{ 
          backgroundColor: theme.textColor,
          animationDelay: '0ms' 
        }}
      />
      <div 
        className="w-2 h-2 rounded-full animate-bounce"
        style={{ 
          backgroundColor: theme.textColor,
          animationDelay: '150ms' 
        }}
      />
      <div 
        className="w-2 h-2 rounded-full animate-bounce"
        style={{ 
          backgroundColor: theme.textColor,
          animationDelay: '300ms' 
        }}
      />
    </div>
  );

  // Special rendering for status messages
  if (isStatus) {
    return (
      <div className="flex justify-center w-full mb-2">
        <div 
          className="px-3 py-2 rounded-full text-xs bg-gray-100 text-gray-600 flex items-center space-x-2 animate-pulse"
          style={{ fontFamily: theme.fontFamily }}
        >
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      <div className="flex items-start max-w-[85%] sm:max-w-[80%] min-w-0">
        {!isUser && (
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center mr-2 text-white text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: theme.primaryColor }}
          >
            CS
          </div>
        )}
        
        <div className="flex flex-col min-w-0 flex-1">
          <div
            className={`px-3 py-2 shadow-sm overflow-hidden ${
              isUser 
                ? 'rounded-2xl rounded-br-md' 
                : 'rounded-2xl rounded-bl-md'
            }`}
            style={{
              backgroundColor: isUser ? theme.primaryColor : '#f1f5f9',
              color: isUser ? '#ffffff' : theme.textColor,
              fontFamily: theme.fontFamily,
              maxWidth: '100%',
              width: '100%',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            {isLoading && !message.content ? (
              <LoadingDots />
            ) : (
              <div className="chat-markdown text-xs leading-relaxed w-full overflow-hidden">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Custom styling for markdown elements
                    h1: ({children}) => <h1 className="text-sm font-bold mb-2 mt-1">{children}</h1>,
                    h2: ({children}) => <h2 className="text-sm font-semibold mb-1 mt-2">{children}</h2>,
                    h3: ({children}) => <h3 className="text-xs font-semibold mb-1 mt-1">{children}</h3>,
                    p: ({children}) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                    ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-2 pl-2">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-3 pl-2">{children}</ol>,
                    li: ({children}) => (
                      <li className="text-xs leading-relaxed mb-2 pb-2 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                        <div className="mt-1">
                          {children}
                        </div>
                      </li>
                    ),
                    strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                    em: ({children}) => <em className="italic">{children}</em>,
                    a: ({href, children}) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                        style={{ color: isUser ? '#bfdbfe' : theme.primaryColor }}
                      >
                        {children}
                      </a>
                    ),
                    blockquote: ({children}) => (
                      <blockquote className="border-l-2 pl-2 my-2 italic opacity-80">
                        {children}
                      </blockquote>
                    ),
                    table: ({children}) => (
                      <div className="overflow-x-auto my-2 w-full border rounded" style={{ maxWidth: '280px' }}>
                        <table className="text-xs border-collapse w-full">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({children}) => (
                      <thead className="bg-gray-100">
                        {children}
                      </thead>
                    ),
                    tbody: ({children}) => (
                      <tbody>
                        {children}
                      </tbody>
                    ),
                    tr: ({children}) => (
                      <tr className="border-b border-gray-200">
                        {children}
                      </tr>
                    ),
                    th: ({children}) => (
                      <th className="border-b border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold text-xs" style={{ maxWidth: '120px' }}>
                        <div className="break-words">
                          {children}
                        </div>
                      </th>
                    ),
                    td: ({children}) => (
                      <td className="border-b border-gray-200 px-2 py-1 text-xs" style={{ maxWidth: '120px' }}>
                        <div className="break-words overflow-hidden text-ellipsis">
                          {children}
                        </div>
                      </td>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {isLoading && message.content && (
                  <span 
                    className="inline-block w-2 h-4 ml-1 animate-pulse"
                    style={{ 
                      backgroundColor: isUser ? '#ffffff' : theme.textColor,
                      animation: 'blink 1s infinite'
                    }}
                  />
                )}
              </div>
            )}
          </div>
          
          <div 
            className={`text-xs mt-1 px-2 ${isUser ? 'text-right' : 'text-left'}`}
            style={{ color: '#9ca3af' }}
          >
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>

        {isUser && (
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center ml-2 text-white text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: '#64748b' }}
          >
            U
          </div>
        )}
      </div>
    </div>
  );
};