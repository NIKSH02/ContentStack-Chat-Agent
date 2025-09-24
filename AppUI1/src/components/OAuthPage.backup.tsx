import React, { useState } from 'react';
import { Paragraph, Heading } from '@contentstack/venus-components';


interface AuthStatus {
  type: 'mcp' | 'chat-agent' | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  sessionId?: string;
  error?: string;
}

export const OAuthPage: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    type: null,
    status: 'idle'
  });
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  const handleMCPAuth = async () => {
    try {
      setAuthStatus({ type: 'mcp', status: 'loading' });
      
      const response = await fetch('http://localhost:5002/api/mcp/oauth/start');
      const data = await response.json();
      
      if (data.success) {
        // Open authorization URL in new window
        window.open(data.authorizationUrl, '_blank', 'width=800,height=600');
        
        setAuthStatus({ 
          type: 'mcp', 
          status: 'loading', 
          sessionId: data.sessionId 
        });
        
        // Start polling for completion
        startPolling(data.sessionId, 'mcp');
      } else {
        throw new Error(data.error || 'Failed to start OAuth flow');
      }
    } catch (error: any) {
      setAuthStatus({ 
        type: 'mcp', 
        status: 'error', 
        error: error.message 
      });
    }
  };

  const handleChatAgentAuth = async () => {
    try {
      setAuthStatus({ type: 'chat-agent', status: 'loading' });
      
      const response = await fetch('http://localhost:5001/api/oauth/start');
      const data = await response.json();
      
      if (data.success) {
        window.open(data.authorizationUrl, '_blank', 'width=800,height=600');
        
        setAuthStatus({ 
          type: 'chat-agent', 
          status: 'loading', 
          sessionId: data.sessionId 
        });
        
        startPolling(data.sessionId, 'chat-agent');
      } else {
        throw new Error(data.error || 'Failed to start OAuth flow');
      }
    } catch (error: any) {
      setAuthStatus({ 
        type: 'chat-agent', 
        status: 'error', 
        error: error.message 
      });
    }
  };

  const startPolling = (sessionId: string, type: 'mcp' | 'chat-agent') => {
    const interval = setInterval(async () => {
      try {
        const endpoint = type === 'mcp' 
          ? `http://localhost:5002/api/mcp/oauth/status/${sessionId}`
          : `http://localhost:5001/api/oauth/status/${sessionId}`;
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setAuthStatus({ type, status: 'success', sessionId });
          clearInterval(interval);
          setPollInterval(null);
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Authentication failed');
        }
      } catch (error: any) {
        setAuthStatus({ type, status: 'error', error: error.message });
        clearInterval(interval);
        setPollInterval(null);
      }
    }, 2000);
    
    setPollInterval(interval);
  };

  const resetAuth = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    setAuthStatus({ type: null, status: 'idle' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
        );
      case 'success':
        return (
          <div className="text-green-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            OAuth <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Setup</span>
          </h1>
           <Paragraph text='Connect your ContentStack account to unlock the full power of our AI-driven chat agent' className="text-xl text-gray-600 max-w-2xl mx-auto" />
            
           
        </div>

        {/* Status Display */}
        {authStatus.status !== 'idle' && (
          <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(authStatus.status)}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {authStatus.type === 'mcp' ? 'MCP Server' : 'Chat Agent'} Authentication
                  </h3>
                   <p className="text-sm text-gray-600">
                    {authStatus.status === 'loading' && 'Waiting for authorization...'}
                    {authStatus.status === 'success' && 'Successfully authenticated!'}
                    {authStatus.status === 'error' && `Error: ${authStatus.error}`}
                   </p>
                </div>
              </div>
              {authStatus.status !== 'loading' && (
                <button
                  onClick={resetAuth}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* Authentication Options */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* MCP Server Auth */}
          <div className="bg-white rounded-2xl shadow-xl border p-8 hover:shadow-2xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">MCP Server</h3>
               <Paragraph text='Connect to the Model Context Protocol server for enhanced AI capabilities' className="text-gray-600" />
                
               
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Direct ContentStack API integration</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>59+ specialized tools</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Real-time data access</span>
              </div>
            </div>

            <button
              onClick={handleMCPAuth}
              disabled={authStatus.status === 'loading' && authStatus.type === 'mcp'}
              className="w-full py-3 px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {authStatus.status === 'loading' && authStatus.type === 'mcp' 
                ? 'Connecting...' 
                : 'Connect MCP Server'
              }
            </button>
          </div>

          {/* Chat Agent Auth */}
          <div className="bg-white rounded-2xl shadow-xl border p-8 hover:shadow-2xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Chat Agent</h3>
               <Paragraph text='Authenticate with the main chat interface for conversational AI' className="text-gray-600" />
                
               
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Multi-LLM support</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Natural language interface</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Streaming responses</span>
              </div>
            </div>

            <button
              onClick={handleChatAgentAuth}
              disabled={authStatus.status === 'loading' && authStatus.type === 'chat-agent'}
              className="w-full py-3 px-6 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {authStatus.status === 'loading' && authStatus.type === 'chat-agent' 
                ? 'Connecting...' 
                : 'Connect Chat Agent'
              }
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg border p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Setup Instructions</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Choose Service</h4>
               <Paragraph text='Select either MCP Server or Chat Agent based on your needs ' className="text-sm text-gray-600" />
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Authorize Access</h4>
               <Paragraph text='Complete the OAuth flow in the popup window ' className="text-sm text-gray-600" />
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Start Chatting</h4>
               <Paragraph text='Begin using the AI-powered ContentStack assistant ' className="text-sm text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};