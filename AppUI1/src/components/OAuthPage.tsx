import { useState } from 'react';

interface ConnectionDetails {
  tenantId: string;
  stackApiKey: string;
  projectId: string;
  region?: string;
  organization_uid?: string;
  user_uid?: string;
  access_token?: string;
}

export const OAuthPage = () => {
  const [mcpStatus, setMcpStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [chatAgentStatus, setChatAgentStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>({
    tenantId: '',
    stackApiKey: '',
    projectId: ''
  });
  const [mcpSessionId, setMcpSessionId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleMCPOAuth = async () => {
    setMcpStatus('connecting');
    setErrorMessage('');
    
    try {
      // Start MCP OAuth flow
      const response = await fetch('http://localhost:5002/api/mcp/oauth/start');
      const data = await response.json();
      
      if (data.success) {
        setMcpSessionId(data.sessionId);
        
        // Open authorization URL in new window
        const authWindow = window.open(
          data.authorizationUrl, 
          '_blank', 
          'width=800,height=600,scrollbars=yes,resizable=yes'
        );
        
        // Start polling for completion
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`http://localhost:5002/api/mcp/oauth/check/${data.sessionId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.completed) {
              clearInterval(pollInterval);
              authWindow?.close();
              
              if (statusData.success) {
                setMcpStatus('connected');
                setConnectionDetails(prev => ({
                  ...prev,
                  tenantId: statusData.tokenData?.organization_uid || 'mcp_tenant_id',
                  region: statusData.tokenData?.region || 'EU',
                  organization_uid: statusData.tokenData?.organization_uid || '',
                  user_uid: statusData.tokenData?.user_uid || '',
                  access_token: statusData.tokenData?.access_token?.substring(0, 20) + '...' || ''
                }));
              } else {
                setMcpStatus('error');
                setErrorMessage(statusData.error || 'MCP OAuth failed');
              }
            }
          } catch (error) {
            console.error('Error polling MCP OAuth status:', error);
          }
        }, 2000);
        
        // Stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (mcpStatus === 'connecting') {
            setMcpStatus('error');
            setErrorMessage('OAuth timeout - please try again');
          }
        }, 300000);
        
      } else {
        throw new Error(data.error || 'Failed to start MCP OAuth flow');
      }
    } catch (error: any) {
      setMcpStatus('error');
      setErrorMessage(error.message || 'Failed to connect to MCP OAuth service');
      console.error('MCP OAuth error:', error);
    }
  };

  const handleChatAgentOAuth = async () => {
    setChatAgentStatus('connecting');
    setErrorMessage('');
    
    try {
      console.log('🚀 Starting ContentStack OAuth flow...');
      
      // Start Chat Agent OAuth flow
      const response = await fetch('http://localhost:5002/api/oauth/contentstack/initiate');
      const data = await response.json();
      
      console.log('📋 OAuth initiate response:', data);
      
      if (data.success && data.authUrl) {
        console.log('🔗 Redirecting to OAuth URL:', data.authUrl);
        
        // Set up callback URL with proper redirect
        const callbackUrl = `${window.location.origin}/oauth/callback`;
        console.log('📍 Callback URL configured:', callbackUrl);
        
        // Open authorization URL in new window
        const authWindow = window.open(
          data.authUrl, 
          'contentstack-oauth',
          'width=800,height=600,scrollbars=yes,resizable=yes'
        );
        
        // Listen for messages from the callback window
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          console.log('📨 Received callback message:', event.data);
          
          if (event.data.type === 'OAUTH_SUCCESS') {
            console.log('✅ OAuth Success - Session Data:', JSON.stringify(event.data.sessionData, null, 2));
            
            setChatAgentStatus('connected');
            setConnectionDetails(prev => ({
              ...prev,
              tenantId: event.data.sessionData?.tokenInfo?.organization_uid || 'oauth_tenant',
              stackApiKey: event.data.sessionData?.projects?.[0]?.stacks?.[0]?.api_key || 'oauth_stack',
              projectId: event.data.sessionData?.projects?.[0]?.uid || 'oauth_project',
              region: event.data.sessionData?.tokenInfo?.location || 'US',
              organization_uid: event.data.sessionData?.tokenInfo?.organization_uid || '',
              user_uid: event.data.sessionData?.user?.uid || '',
              access_token: event.data.sessionData?.tokenInfo?.access_token?.substring(0, 20) + '...' || ''
            }));
            
            authWindow?.close();
            window.removeEventListener('message', messageHandler);
            
          } else if (event.data.type === 'OAUTH_ERROR') {
            console.error('❌ OAuth Error:', event.data.error);
            
            setChatAgentStatus('error');
            setErrorMessage(event.data.error || 'OAuth authorization failed');
            
            authWindow?.close();
            window.removeEventListener('message', messageHandler);
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Handle window close manually (user cancelled)
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            if (chatAgentStatus === 'connecting') {
              setChatAgentStatus('error');
              setErrorMessage('OAuth cancelled by user');
            }
            window.removeEventListener('message', messageHandler);
          }
        }, 1000);
        
      } else {
        throw new Error(data.message || 'Failed to get OAuth URL');
      }
    } catch (error: any) {
      console.error('❌ Chat Agent OAuth error:', error);
      setChatAgentStatus('error');
      setErrorMessage(error.message || 'Failed to connect to Chat Agent OAuth service');
    }
  };

  const resetMCP = () => {
    setMcpStatus('idle');
    setConnectionDetails({ tenantId: '', stackApiKey: '', projectId: '' });
  };

  const resetChatAgent = () => {
    setChatAgentStatus('idle');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'connecting': return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>;
      case 'error': return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default: return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Failed';
      default: return 'Not Connected';
    }
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Header Section */}
      <section className="px-8 py-16 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 mb-8">
          <div className="w-2 h-2 bg-[#6a5dDF] rounded-full"></div>
          OAuth Setup
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Connect Your <span className="text-[#6a5dDF]">ContentStack</span> Account
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
          Choose your preferred integration method to enable AI-powered content management
        </p>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <div className="flex items-center gap-2">
            {getStatusIcon(mcpStatus)}
            <span className="text-sm text-gray-600">MCP Server</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className="flex items-center gap-2">
            {getStatusIcon(chatAgentStatus)}
            <span className="text-sm text-gray-600">Chat Agent</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 pb-20">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* MCP OAuth Setup */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#6a5dDF] bg-opacity-10 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-[#6a5dDF] rounded"></div>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">MCP Server</h2>
                  <p className="text-gray-600">Model Context Protocol Integration</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-6">
                {getStatusIcon(mcpStatus)}
                <span className="text-sm font-medium text-gray-700">
                  {getStatusText(mcpStatus)}
                </span>
              </div>
            </div>
            
            <div className="p-8">
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Why OAuth is necessary</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-3 h-3 text-blue-600">🔒</div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Secure Access</h4>
                        <p className="text-blue-800 text-sm">OAuth ensures secure, token-based access to your ContentStack data without exposing credentials.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-3 h-3 text-purple-600">🛠️</div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-purple-900 mb-1">MCP Server Integration</h4>
                        <p className="text-purple-800 text-sm">Enables 59+ specialized tools for content management, publishing workflows, and complex operations.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-3 h-3 text-green-600">⚡</div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">Real-time Operations</h4>
                        <p className="text-green-800 text-sm">Required for live content queries, asset management, and dynamic content operations in your chat agent.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {mcpStatus === 'idle' && (
                <button
                  onClick={handleMCPOAuth}
                  className="w-full bg-[#6a5dDF] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#5a4ecf] transition-colors"
                >
                  Connect MCP Server
                </button>
              )}

              {mcpStatus === 'connecting' && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-[#6a5dDF] rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-700 font-medium mb-2">Connecting to ContentStack</p>
                  <p className="text-sm text-gray-500">Complete the OAuth authorization in the popup</p>
                </div>
              )}

              {mcpStatus === 'connected' && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="font-semibold text-green-900">Successfully Connected</span>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Tenant ID</span>
                        <code className="bg-white px-3 py-1 rounded-md text-gray-800 font-mono text-xs">
                          {connectionDetails.tenantId}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Stack API Key</span>
                        <code className="bg-white px-3 py-1 rounded-md text-gray-800 font-mono text-xs">
                          {connectionDetails.stackApiKey}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Project ID</span>
                        <code className="bg-white px-3 py-1 rounded-md text-gray-800 font-mono text-xs">
                          {connectionDetails.projectId}
                        </code>
                      </div>
                      {mcpSessionId && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Session ID</span>
                          <code className="bg-white px-3 py-1 rounded-md text-gray-800 font-mono text-xs">
                            {mcpSessionId.substring(0, 12)}...
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={resetMCP}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Reset Connection
                  </button>
                </div>
              )}

              {mcpStatus === 'error' && (
                <div className="space-y-6">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <span className="font-semibold text-red-900">Connection Failed</span>
                    </div>
                    <p className="text-red-700 text-sm">
                      {errorMessage || 'Unable to establish OAuth connection. Please check your ContentStack permissions and try again.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMcpStatus('idle');
                      setErrorMessage('');
                    }}
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Chat Agent OAuth Setup */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#6a5dDF] bg-opacity-10 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-[#6a5dDF] rounded-full relative">
                    <div className="w-2 h-2 bg-white rounded-full absolute top-1 right-1"></div>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Chat Agent</h2>
                  <p className="text-gray-600">Direct Content Integration</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-6">
                {getStatusIcon(chatAgentStatus)}
                <span className="text-sm font-medium text-gray-700">
                  {getStatusText(chatAgentStatus)}
                </span>
              </div>
            </div>
            
            <div className="p-8">
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Why OAuth is necessary</h3>
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-3 h-3 text-indigo-600">💬</div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-indigo-900 mb-1">Direct Chat Integration</h4>
                        <p className="text-indigo-800 text-sm">Enables your chat widget to directly access ContentStack content for real-time responses without server overhead.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-3 h-3 text-orange-600">⚡</div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-900 mb-1">Faster Performance</h4>
                        <p className="text-orange-800 text-sm">Bypasses MCP server for simple queries, reducing latency and providing instant content access for better user experience.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-3 h-3 text-teal-600">🎯</div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-teal-900 mb-1">Lightweight Operations</h4>
                        <p className="text-teal-800 text-sm">Essential for basic content retrieval, search operations, and simple chat interactions without complex tool requirements.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {chatAgentStatus === 'idle' && (
                <button
                  onClick={handleChatAgentOAuth}
                  className="w-full bg-[#6a5dDF] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#5a4ecf] transition-colors"
                >
                  Connect Chat Agent
                </button>
              )}

              {chatAgentStatus === 'connecting' && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-[#6a5dDF] rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-700 font-medium mb-2">Connecting to ContentStack</p>
                  <p className="text-sm text-gray-500">Complete the OAuth authorization in the popup</p>
                </div>
              )}

              {chatAgentStatus === 'connected' && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="font-semibold text-green-900">Successfully Connected</span>
                    </div>
                    <p className="text-green-700 text-sm">
                      Your chat agent is now ready to access ContentStack content directly. 
                      Perfect for SDK integration and real-time queries.
                    </p>
                  </div>
                  <button
                    onClick={resetChatAgent}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Reset Connection
                  </button>
                </div>
              )}

              {chatAgentStatus === 'error' && (
                <div className="space-y-6">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <span className="font-semibold text-red-900">Connection Failed</span>
                    </div>
                    <p className="text-red-700 text-sm">
                      {errorMessage || 'Unable to establish OAuth connection. Please check your ContentStack permissions and try again.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setChatAgentStatus('idle');
                      setErrorMessage('');
                    }}
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {(mcpStatus === 'connected' || chatAgentStatus === 'connected') && (
          <div className="mt-16 bg-gray-50 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
              You're All Set!
            </h2>
            <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Your ContentStack integration is ready. Choose your next step to start building.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-6 bg-blue-600 rounded"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Documentation</h3>
                <p className="text-gray-600 mb-6">
                  Complete guides and API references for quick integration
                </p>
                <a 
                  href="/documentation" 
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Read Docs
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
              
              <div className="bg-white rounded-xl p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 border-2 border-green-600 rounded-full relative">
                    <div className="w-2 h-3 bg-green-600 absolute top-1 left-2 rounded-full"></div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Quick Start</h3>
                <p className="text-gray-600 mb-6">
                  Get up and running in minutes with our step-by-step guide
                </p>
                <a 
                  href="/documentation#quickstart" 
                  className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold"
                >
                  Get Started
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
              
              <div className="bg-white rounded-xl p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-sm"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-sm"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-sm"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-sm"></div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Analytics</h3>
                <p className="text-gray-600 mb-6">
                  Monitor performance, usage, and optimize your integration
                </p>
                <a 
                  href="/analytics" 
                  className="inline-flex items-center text-purple-600 hover:text-purple-700 font-semibold"
                >
                  View Analytics
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Debug Section */}
        <div className="mt-8 p-6 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">🔧 Debug OAuth Flow</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={async () => {
                console.log('🧪 Testing OAuth initiate endpoint...');
                try {
                  const response = await fetch('http://localhost:5002/api/oauth/contentstack/initiate');
                  const data = await response.json();
                  console.log('✅ OAuth Initiate Response:', data);
                  alert(`OAuth URL received: ${data.authUrl ? 'SUCCESS' : 'FAILED'}`);
                } catch (error) {
                  console.error('❌ OAuth Initiate Error:', error);
                  alert('Failed to connect to OAuth service');
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Test OAuth Initiate
            </button>
            
            <button
              onClick={() => {
                console.log('🧪 Testing OAuth callback endpoint...');
                window.open('http://localhost:5002/api/oauth/contentstack/callback?code=test&state=debug', '_blank');
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Test OAuth Callback
            </button>
          </div>
          
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
              <p className="text-red-800 text-sm"><strong>Error:</strong> {errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};