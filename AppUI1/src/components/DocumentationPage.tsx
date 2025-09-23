import { useState } from 'react';
import { Link } from 'react-router-dom';

export const DocumentationPage = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sidebarSections = [
    {
      title: 'Getting Started',
      items: [
        { id: 'overview', title: 'Overview',  },
        { id: 'installation', title: 'Installation',  },
        { id: 'quickstart', title: 'Quick Start',  },
      ]
    },
    {
      title: 'OAuth Setup',
      items: [
        { id: 'mcp-oauth', title: 'MCP OAuth',  },
        { id: 'chat-agent-oauth', title: 'Chat Agent OAuth',  },
      ]
    },
    {
      title: 'Examples',
      items: [
        { id: 'basic-chat', title: 'Basic Chat Widget',  },
        { id: 'custom-theme', title: 'Custom Theme',  },
        { id: 'advanced-config', title: 'Advanced Configuration', },
      ]
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return <OverviewContent />;
      case 'installation': return <InstallationContent />;
      case 'quickstart': return <QuickStartContent />;
      case 'react-integration': return <ReactIntegrationContent />;
      case 'authentication': return <AuthenticationContent />;
      case 'vanilla-js': return <VanillaJSContent />;
      case 'configuration': return <ConfigurationContent />;
      case 'theming': return <ThemingContent />;
      case 'mcp-oauth': return <MCPOAuthContent />;
      case 'chat-agent-oauth': return <ChatAgentOAuthContent />;
      case 'oauth-flow': return <OAuthFlowContent />;
      case 'chat-endpoints': return <ChatEndpointsContent />;
      case 'oauth-endpoints': return <OAuthEndpointsContent />;
      case 'basic-chat': return <BasicChatContent />;
      case 'custom-theme': return <CustomThemeContent />;
      case 'advanced-config': return <AdvancedConfigContent />;
      default: return <OverviewContent />;
    }
  };

  return (
    <div className="min-h-screen bg-white">

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <div className="hidden lg:block w-80 border-r border-gray-200 bg-gray-50">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <div className="p-6">
              <div className="space-y-8">
                {sidebarSections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                      {section.title}
                    </h3>
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              activeSection === item.id
                                ? 'bg-indigo-100 text-indigo-700 border-r-2 border-indigo-500'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="px-6 py-8 lg:px-8 max-w-4xl">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Content Components
const OverviewContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">
      ContentStack Chat Agent Platform
    </h1>
    <p className="text-xl text-gray-600 mb-8">
      A plug-and-play platform that helps developers create custom chat agents powered by LLMs and ContentStack CMS.
    </p>

    <div className="grid md:grid-cols-2 gap-6 mb-8 not-prose">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🎯 What You Get</h3>
        <ul className="space-y-2 text-blue-800">
          <li>• Plug-and-play chat agents</li>
          <li>• Multi-LLM provider support</li>
          <li>• ContentStack CMS integration</li>
          <li>• Minimal setup required</li>
        </ul>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-3">⚡ Key Features</h3>
        <ul className="space-y-2 text-green-800">
          <li>• Dual-LLM architecture</li>
          <li>• 59+ ContentStack tools</li>
          <li>• Real-time streaming</li>
          <li>• OAuth authentication</li>
        </ul>
      </div>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Architecture Overview</h2>
    <p className="text-gray-600 mb-6">
      Our platform uses a sophisticated dual-LLM strategy where Groq handles tool selection 
      and your chosen provider generates responses with full ContentStack context.
    </p>

    <div className="bg-gray-50 border rounded-lg p-6 mb-8 not-prose">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
      <div className="flex flex-wrap items-center justify-between text-sm">
        <div className="flex-1 text-center p-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-blue-600 font-semibold">1</span>
          </div>
          <p className="font-medium">User Query</p>
          <p className="text-gray-600">Natural language question</p>
        </div>
        <div className="text-gray-400">→</div>
        <div className="flex-1 text-center p-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-purple-600 font-semibold">2</span>
          </div>
          <p className="font-medium">Tool Selection</p>
          <p className="text-gray-600">Groq selects best tools</p>
        </div>
        <div className="text-gray-400">→</div>
        <div className="flex-1 text-center p-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-green-600 font-semibold">3</span>
          </div>
          <p className="font-medium">ContentStack</p>
          <p className="text-gray-600">Fetch relevant content</p>
        </div>
        <div className="text-gray-400">→</div>
        <div className="flex-1 text-center p-3">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-orange-600 font-semibold">4</span>
          </div>
          <p className="font-medium">Response</p>
          <p className="text-gray-600">Your LLM generates answer</p>
        </div>
      </div>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Use Cases</h2>
    <div className="grid md:grid-cols-3 gap-4 mb-8 not-prose">
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Travel Website</h4>
        <p className="text-gray-600 text-sm">"What tours are available for Italy?"</p>
      </div>
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">E-commerce</h4>
        <p className="text-gray-600 text-sm">"Show me products under $100"</p>
      </div>
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Knowledge Base</h4>
        <p className="text-gray-600 text-sm">"How do I reset my password?"</p>
      </div>
    </div>
  </div>
);

const InstallationContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Installation</h1>
    
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 not-prose">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="font-semibold text-yellow-800">Coming Soon</span>
      </div>
      <p className="text-yellow-700">
        The NPM package is currently in development. For now, you can use the SDK by downloading the source code.
      </p>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Prerequisites</h2>
    <ul className="space-y-2 mb-6 not-prose">
      <li className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Node.js 16+ or React 18+</span>
      </li>
      <li className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>ContentStack account and stack</span>
      </li>
      <li className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>OAuth app configured in ContentStack</span>
      </li>
    </ul>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Option 1: NPM Package (Coming Soon)</h2>
    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 not-prose">
      <code className="text-green-400"># Install the package</code><br/>
      <code>npm install contentstack-chat-agent-sdk</code><br/><br/>
      <code className="text-green-400"># Or with yarn</code><br/>
      <code>yarn add contentstack-chat-agent-sdk</code>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Option 2: Local Development</h2>
    <p className="text-gray-600 mb-4">
      For now, you can clone the repository and use the SDK components directly:
    </p>
    
    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 not-prose">
      <code className="text-green-400"># Clone the repository</code><br/>
      <code>git clone https://github.com/your-org/contentstack-chat-agent.git</code><br/><br/>
      <code className="text-green-400"># Navigate to SDK directory</code><br/>
      <code>cd contentstack-chat-agent/SDK</code><br/><br/>
      <code className="text-green-400"># Install dependencies</code><br/>
      <code>npm install</code><br/><br/>
      <code className="text-green-400"># Run the example</code><br/>
      <code>npm run dev</code>
    </div>
  </div>
);

const QuickStartContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Quick Start</h1>
    
    <p className="text-xl text-gray-600 mb-8">
      Get your chat agent up and running in under 5 minutes with this step-by-step guide.
    </p>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 1: Setup OAuth Authentication</h2>
    <p className="text-gray-600 mb-4">
      First, you need to authenticate with ContentStack to enable the chat agent to access your content.
    </p>
    
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 not-prose">
      <ol className="list-decimal list-inside space-y-2 text-blue-800">
        <li>Go to the <Link to="/oauth" className="text-blue-600 hover:underline">OAuth Setup page</Link></li>
        <li>Click "Setup MCP OAuth" to configure your ContentStack connection</li>
        <li>Follow the OAuth flow to grant permissions</li>
        <li>Save your tenant ID and API key for the next step</li>
      </ol>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 2: Install and Configure the SDK</h2>
    
    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 not-prose">
      <code><span className="text-blue-400">import</span> React <span className="text-blue-400">from</span> <span className="text-green-400">'react'</span>;</code><br/>
      <code><span className="text-blue-400">import</span> {'{'} <span className="text-yellow-300">ChatWidget</span> {'}'} <span className="text-blue-400">from</span> <span className="text-green-400">'contentstack-chat-agent-sdk'</span>;</code><br/><br/>
      
      <code><span className="text-blue-400">function</span> <span className="text-yellow-300">App</span>() {'{'}</code><br/>
      <code>&nbsp;&nbsp;<span className="text-blue-400">return</span> (</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-red-400">div</span>&gt;</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-yellow-300">ChatWidget</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">tenantId</span>=<span className="text-green-400">"your-tenant-id"</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">apiKey</span>=<span className="text-green-400">"your-contentstack-api-key"</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">projectId</span>=<span className="text-green-400">"your-project-id"</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">chatTitle</span>=<span className="text-green-400">"My Assistant"</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&gt;</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-red-400">div</span>&gt;</code><br/>
      <code>&nbsp;&nbsp;);</code><br/>
      <code>{'}'}</code>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 3: Test Your Chat Agent</h2>
    <p className="text-gray-600 mb-4">
      Once configured, you can test your chat agent with natural language queries about your ContentStack content:
    </p>

    <div className="grid md:grid-cols-2 gap-4 mb-6 not-prose">
      <div className="bg-gray-50 border rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Example Queries</h4>
        <ul className="space-y-2 text-gray-700 text-sm">
          <li>• "Show me all blog posts"</li>
          <li>• "Find products under $50"</li>
          <li>• "What content was published today?"</li>
          <li>• "Create a new blog entry"</li>
        </ul>
      </div>
      <div className="bg-gray-50 border rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">What It Can Do</h4>
        <ul className="space-y-2 text-gray-700 text-sm">
          <li>• Query entries and assets</li>
          <li>• Publish and unpublish content</li>
          <li>• Search across content types</li>
          <li>• Manage content workflows</li>
        </ul>
      </div>
    </div>

    <div className="bg-green-50 border border-green-200 rounded-lg p-4 not-prose">
      <h3 className="font-semibold text-green-900 mb-2">🎉 That's it!</h3>
      <p className="text-green-800">
        Your ContentStack Chat Agent is now ready to use. Check out the configuration options to customize the experience further.
      </p>
    </div>
  </div>
);

const ReactIntegrationContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">React Integration</h1>
    
    <p className="text-xl text-gray-600 mb-8">
      Learn how to integrate the ContentStack Chat Agent SDK into your React applications.
    </p>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Basic Integration</h2>
    
    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 not-prose">
      <code><span className="text-blue-400">import</span> React <span className="text-blue-400">from</span> <span className="text-green-400">'react'</span>;</code><br/>
      <code><span className="text-blue-400">import</span> {'{'} <span className="text-yellow-300">ChatWidget</span> {'}'} <span className="text-blue-400">from</span> <span className="text-green-400">'contentstack-chat-agent-sdk'</span>;</code><br/><br/>
      
      <code><span className="text-blue-400">const</span> <span className="text-yellow-300">MyApp</span> = () =&gt; {`{`}</code><br/>
      <code>&nbsp;&nbsp;<span className="text-blue-400">return</span> (</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-red-400">div</span> <span className="text-green-300">className</span>=<span className="text-green-400">"app"</span>&gt;</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-red-400">h1</span>&gt;My Website&lt;/<span className="text-red-400">h1</span>&gt;</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-yellow-300">ChatWidget</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">tenantId</span>=<span className="text-green-400">"your-tenant-id"</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">apiKey</span>=<span className="text-green-400">"your-api-key"</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">projectId</span>=<span className="text-green-400">"your-project-id"</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">position</span>=<span className="text-green-400">"bottom-right"</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">chatTitle</span>=<span className="text-green-400">"Support Assistant"</span></code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&gt;</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-red-400">div</span>&gt;</code><br/>
      <code>&nbsp;&nbsp;);</code><br/>
      <code>{'}'}</code>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Using the useChat Hook</h2>
    <p className="text-gray-600 mb-4">
      For more control over the chat functionality, use the useChat hook directly:
    </p>

    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 not-prose">
      <code><span className="text-blue-400">import</span> React, {'{'} <span className="text-yellow-300">useState</span> {'}'} <span className="text-blue-400">from</span> <span className="text-green-400">'react'</span>;</code><br/>
      <code><span className="text-blue-400">import</span> {'{'} <span className="text-yellow-300">useChat</span> {'}'} <span className="text-blue-400">from</span> <span className="text-green-400">'contentstack-chat-agent-sdk'</span>;</code><br/><br/>
      
      <code><span className="text-blue-400">const</span> <span className="text-yellow-300">CustomChat</span> = () =&gt; {`{`}</code><br/>
      <code>&nbsp;&nbsp;<span className="text-blue-400">const</span> {'{'} <span className="text-yellow-300">messages</span>, <span className="text-yellow-300">sendMessage</span>, <span className="text-yellow-300">isLoading</span> {'}'} = <span className="text-yellow-300">useChat</span>({'{'}</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">tenantId</span>: <span className="text-green-400">'your-tenant-id'</span>,</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-300">apiKey</span>: <span className="text-green-400">'your-api-key'</span></code><br/>
      <code>&nbsp;&nbsp;{'}'});</code><br/>
      <code>&nbsp;&nbsp;</code><br/>
      <code>&nbsp;&nbsp;<span className="text-blue-400">const</span> [<span className="text-yellow-300">input</span>, <span className="text-yellow-300">setInput</span>] = <span className="text-yellow-300">useState</span>(<span className="text-green-400">''</span>);</code><br/><br/>
      
      <code>&nbsp;&nbsp;<span className="text-blue-400">const</span> <span className="text-yellow-300">handleSend</span> = () =&gt; {`{`}</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">if</span> (<span className="text-yellow-300">input</span>.<span className="text-yellow-300">trim</span>()) {'{'}</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">sendMessage</span>(<span className="text-yellow-300">input</span>);</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">setInput</span>(<span className="text-green-400">''</span>);</code><br/>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;{'}'}</code><br/>
      <code>&nbsp;&nbsp;{'}'};</code><br/><br/>
      
      <code>&nbsp;&nbsp;<span className="text-blue-400">return</span> (<span className="text-gray-400">/* Your custom UI */</span>);</code><br/>
      <code>{'}'};</code>
    </div>
  </div>
);

const MCPOAuthContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">MCP OAuth Setup</h1>
    <p className="text-xl text-gray-600 mb-8">
      Configure OAuth for MCP (Model Context Protocol) server integration with ContentStack.
    </p>
    
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 not-prose">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">What is MCP OAuth?</h3>
      <p className="text-blue-800">
        MCP OAuth enables the chat agent to securely access your ContentStack content through 
        the Model Context Protocol server with 59+ specialized tools for content management.
      </p>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Setup Steps</h2>
    
    <div className="space-y-6 mb-8 not-prose">
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">1</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Start MCP OAuth Flow</h3>
        </div>
        <p className="text-gray-600 mb-4">
          Navigate to the OAuth setup page and click "Setup MCP OAuth" to begin the authentication process.
        </p>
        <div className="bg-gray-900 text-gray-100 rounded p-3 text-sm">
          <code>POST /api/mcp/oauth/start</code>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">2</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Authorize Access</h3>
        </div>
        <p className="text-gray-600 mb-4">
          You'll be redirected to ContentStack where you can grant the necessary permissions 
          for the MCP server to access your content.
        </p>
      </div>
      
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">3</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Complete Setup</h3>
        </div>
        <p className="text-gray-600">
          Once authorized, the MCP server will be configured and ready to handle content queries 
          through the chat agent interface.
        </p>
      </div>
    </div>
  </div>
);

// Placeholder components for other sections
const AuthenticationContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Authentication</h1>
    <p className="text-gray-600">Authentication documentation content goes here...</p>
  </div>
);

const VanillaJSContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Vanilla JavaScript</h1>
    <p className="text-gray-600">Vanilla JavaScript integration content goes here...</p>
  </div>
);

const ConfigurationContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Configuration</h1>
    <p className="text-gray-600">Configuration documentation content goes here...</p>
  </div>
);

const ThemingContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Theming</h1>
    <p className="text-gray-600">Theming documentation content goes here...</p>
  </div>
);

const ChatAgentOAuthContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Chat Agent OAuth Setup</h1>
    
    <p className="text-xl text-gray-600 mb-8">
      Configure OAuth authentication for your Chat Agent to securely access ContentStack APIs and provide personalized chat experiences.
    </p>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 not-prose">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">🔐 What is Chat Agent OAuth?</h3>
      <p className="text-blue-800">
        Chat Agent OAuth allows your users to authenticate with ContentStack, enabling the chat agent to access their specific content, 
        entries, and assets based on their permissions.
      </p>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 1: ContentStack App Configuration</h2>
    <p className="mb-4">First, configure your ContentStack app to support OAuth:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`1. Go to your ContentStack Organization Settings
2. Navigate to "Apps" section
3. Click "Create App" or edit existing app
4. Add OAuth redirect URL:
   - Development: http://localhost:3000/auth/callback
   - Production: https://yourdomain.com/auth/callback`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 2: Environment Variables</h2>
    <p className="mb-4">Configure your backend environment variables:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`# ContentStack OAuth Configuration
CONTENTSTACK_CLIENT_ID=your_app_client_id
CONTENTSTACK_CLIENT_SECRET=your_app_client_secret
CONTENTSTACK_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT Configuration for session management
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=24h

# ContentStack API Configuration
CONTENTSTACK_API_HOST=api.contentstack.io
CONTENTSTACK_CDN_HOST=cdn.contentstack.io`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 3: OAuth Flow Implementation</h2>
    <p className="mb-4">The Chat Agent OAuth flow works as follows:</p>

    <div className="bg-gray-50 border rounded-lg p-6 mb-8 not-prose">
      <div className="flex flex-wrap items-center justify-between text-sm">
        <div className="flex-1 text-center p-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-blue-600 font-semibold">1</span>
          </div>
          <p className="font-medium">User Login</p>
          <p className="text-gray-600">Click "Connect ContentStack"</p>
        </div>
        <div className="text-gray-400">→</div>
        <div className="flex-1 text-center p-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-purple-600 font-semibold">2</span>
          </div>
          <p className="font-medium">Authorization</p>
          <p className="text-gray-600">Redirect to ContentStack</p>
        </div>
        <div className="text-gray-400">→</div>
        <div className="flex-1 text-center p-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-green-600 font-semibold">3</span>
          </div>
          <p className="font-medium">Callback</p>
          <p className="text-gray-600">Exchange code for token</p>
        </div>
        <div className="text-gray-400">→</div>
        <div className="flex-1 text-center p-3">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-orange-600 font-semibold">4</span>
          </div>
          <p className="font-medium">Chat Ready</p>
          <p className="text-gray-600">Access user's content</p>
        </div>
      </div>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 4: Frontend Integration</h2>
    <p className="mb-4">Add OAuth login to your chat widget:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`import { ChatWidget } from 'contentstack-chat-widget-sdk';
import 'contentstack-chat-widget-sdk/style.css';

export default function App() {
  const handleOAuthLogin = () => {
    // Redirect to OAuth endpoint
    window.location.href = '/api/auth/contentstack';
  };

  return (
    <div>
      <ChatWidget
        tenantId="your-tenant-id"
        apiKey="your-api-key"
        provider="groq"
        model="llama-3.1-8b-instant"
        position="bottom-right"
        chatTitle="Personal Assistant"
        welcomeMessage="Connect your ContentStack account for personalized responses!"
        
        // OAuth Configuration
        enableOAuth={true}
        onOAuthRequired={handleOAuthLogin}
        oauthButtonText="Connect ContentStack"
      />
    </div>
  );
}`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 5: Backend OAuth Routes</h2>
    <p className="mb-4">Your backend should handle these OAuth endpoints:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`// Start OAuth flow
GET /api/auth/contentstack
→ Redirects to ContentStack authorization

// Handle callback
GET /api/auth/callback
→ Exchanges code for access token
→ Creates user session
→ Redirects back to app

// Check authentication status
GET /api/auth/status
→ Returns current user's auth state

// Logout
POST /api/auth/logout
→ Clears user session`}</code></pre>
    </div>

    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 not-prose">
      <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Benefits of OAuth Integration</h3>
      <ul className="space-y-2 text-green-800">
        <li>• <strong>Personalized responses:</strong> Access user's specific content and permissions</li>
        <li>• <strong>Secure access:</strong> No need to store API keys in frontend</li>
        <li>• <strong>User-specific data:</strong> Chat agent can access user's organizations, stacks, and entries</li>
        <li>• <strong>Permission-based:</strong> Respects ContentStack's user permissions and roles</li>
      </ul>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Testing OAuth Flow</h2>
    <p className="mb-4">Test your OAuth implementation:</p>
    
    <div className="bg-gray-100 border rounded-lg p-4 mb-6 not-prose">
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li>Start your backend server with OAuth environment variables</li>
        <li>Open your app and click the chat widget</li>
        <li>Click "Connect ContentStack" button</li>
        <li>Complete ContentStack authorization</li>
        <li>Verify you're redirected back with authentication</li>
        <li>Test chat queries that require authenticated access</li>
      </ol>
    </div>

    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 not-prose">
      <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Security Notes</h4>
      <ul className="text-yellow-800 text-sm space-y-1">
        <li>• Never expose client secrets in frontend code</li>
        <li>• Use secure JWT secrets in production</li>
        <li>• Implement proper CSRF protection</li>
        <li>• Validate all OAuth callbacks</li>
        <li>• Use HTTPS in production</li>
      </ul>
    </div>
  </div>
);

const OAuthFlowContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">OAuth Flow</h1>
    <p className="text-gray-600">OAuth Flow documentation content goes here...</p>
  </div>
);

const ChatEndpointsContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Chat Endpoints</h1>
    <p className="text-gray-600">Chat Endpoints documentation content goes here...</p>
  </div>
);

const OAuthEndpointsContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">OAuth Endpoints</h1>
    <p className="text-gray-600">OAuth Endpoints documentation content goes here...</p>
  </div>
);

const BasicChatContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Basic Chat Widget Example</h1>
    
    <p className="text-xl text-gray-600 mb-8">
      Get started with the ContentStack Chat Widget SDK in just a few lines of code. This example shows the minimal setup required.
    </p>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 not-prose">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">🚀 What You'll Build</h3>
      <p className="text-blue-800 mb-3">
        A fully functional chat widget that appears in the bottom-right corner of your page, with:
      </p>
      <ul className="space-y-1 text-blue-800">
        <li>• Fixed positioning that stays visible during scroll</li>
        <li>• Real-time streaming responses</li>
        <li>• ContentStack CMS integration</li>
        <li>• Mobile responsive design</li>
      </ul>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Installation</h2>
    <p className="mb-4">First, install the SDK package:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>npm install contentstack-chat-widget-sdk@1.0.7</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">React Implementation</h2>
    <p className="mb-4">Here's a complete working example for React/Next.js:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`"use client"; // For Next.js 13+ App Router

import { useEffect, useState } from 'react';
import 'contentstack-chat-widget-sdk/style.css';

export default function MyPage() {
  const [ChatWidget, setChatWidget] = useState(null);

  useEffect(() => {
    // Dynamic import prevents SSR issues
    import('contentstack-chat-widget-sdk').then((mod) => {
      setChatWidget(() => mod.ChatWidget);
    });
  }, []);

  return (
    <div className="min-h-screen">
      <h1>My Website</h1>
      <p>Your regular content goes here...</p>
      
      {/* Chat Widget */}
      {ChatWidget && (
        <ChatWidget
          // Required Configuration
          tenantId="your-tenant-id"
          apiKey="blt483a005c4ad32b09"
          
          // LLM Provider Settings
          provider="groq"
          model="llama-3.1-8b-instant"
          
          // UI Configuration
          position="bottom-right"
          chatTitle="Website Assistant"
          welcomeMessage="Hi! I can help you find anything on this website. What would you like to know?"
          placeholder="Ask me about this website..."
          
          // Performance
          typingSpeed={25}
        />
      )}
    </div>
  );
}`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vanilla JavaScript Implementation</h2>
    <p className="mb-4">For non-React projects, use this approach:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <!-- Import CSS -->
    <link rel="stylesheet" href="./node_modules/contentstack-chat-widget-sdk/dist/contentstack-chat-widget-sdk.css">
</head>
<body>
    <h1>My Website</h1>
    <p>Your content here...</p>

    <!-- Widget will be injected here -->
    <div id="chat-widget"></div>

    <script type="module">
        import { ChatWidget } from './node_modules/contentstack-chat-widget-sdk/dist/index.es.js';
        
        // Create widget instance
        const widget = new ChatWidget({
            tenantId: 'your-tenant-id',
            apiKey: 'blt483a005c4ad32b09',
            provider: 'groq',
            model: 'llama-3.1-8b-instant',
            position: 'bottom-right',
            chatTitle: 'Website Assistant',
            welcomeMessage: 'Hi! How can I help you today?',
            placeholder: 'Type your question...'
        });
        
        // Mount to DOM
        widget.mount('#chat-widget');
    </script>
</body>
</html>`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Configuration Options</h2>
    <p className="mb-4">Essential configuration properties:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-semibold">Property</th>
            <th className="text-left p-2 font-semibold">Type</th>
            <th className="text-left p-2 font-semibold">Required</th>
            <th className="text-left p-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody className="text-xs">
          <tr className="border-b">
            <td className="p-2 font-mono">tenantId</td>
            <td className="p-2">string</td>
            <td className="p-2 text-red-600">✓</td>
            <td className="p-2">Your ContentStack tenant identifier</td>
          </tr>
          <tr className="border-b">
            <td className="p-2 font-mono">apiKey</td>
            <td className="p-2">string</td>
            <td className="p-2 text-red-600">✓</td>
            <td className="p-2">ContentStack API key (Management/Delivery token)</td>
          </tr>
          <tr className="border-b">
            <td className="p-2 font-mono">provider</td>
            <td className="p-2">string</td>
            <td className="p-2 text-green-600">○</td>
            <td className="p-2">LLM provider: 'groq', 'gemini', 'openrouter'</td>
          </tr>
          <tr className="border-b">
            <td className="p-2 font-mono">model</td>
            <td className="p-2">string</td>
            <td className="p-2 text-green-600">○</td>
            <td className="p-2">Specific model to use for responses</td>
          </tr>
          <tr className="border-b">
            <td className="p-2 font-mono">position</td>
            <td className="p-2">string</td>
            <td className="p-2 text-green-600">○</td>
            <td className="p-2">'bottom-right', 'bottom-left', 'top-right', 'top-left'</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Available Models by Provider</h2>
    <div className="grid md:grid-cols-3 gap-4 mb-8 not-prose">
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">🚀 Groq (Fast)</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• llama-3.1-8b-instant</li>
          <li>• llama-3.1-70b-versatile</li>
          <li>• mixtral-8x7b-32768</li>
        </ul>
      </div>
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">🧠 Gemini (Smart)</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• gemini-2.5-flash</li>
          <li>• gemini-1.5-pro</li>
          <li>• gemini-2.0-flash-thinking</li>
        </ul>
      </div>
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">🌐 OpenRouter (Diverse)</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• openai/gpt-4o-mini</li>
          <li>• anthropic/claude-3-haiku</li>
          <li>• meta-llama/llama-3.1-8b</li>
        </ul>
      </div>
    </div>

    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 not-prose">
      <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Features Included</h3>
      <ul className="space-y-2 text-green-800">
        <li>• <strong>Fixed positioning:</strong> Widget stays visible during page scroll</li>
        <li>• <strong>SSR compatible:</strong> Works with Next.js, Nuxt, and other SSR frameworks</li>
        <li>• <strong>Mobile responsive:</strong> Adapts to different screen sizes</li>
        <li>• <strong>Real-time streaming:</strong> ChatGPT-like typing animation</li>
        <li>• <strong>Error handling:</strong> Graceful fallbacks for network issues</li>
        <li>• <strong>Customizable styling:</strong> CSS bundled, no external dependencies</li>
      </ul>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Testing Your Widget</h2>
    <p className="mb-4">After implementing, test these scenarios:</p>
    
    <div className="bg-gray-100 border rounded-lg p-4 mb-6 not-prose">
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li><strong>Visibility:</strong> Widget appears in the correct corner</li>
        <li><strong>Positioning:</strong> Stays fixed while scrolling the page</li>
        <li><strong>Interaction:</strong> Click to open/close chat window</li>
        <li><strong>Functionality:</strong> Send a test message and verify response</li>
        <li><strong>Mobile:</strong> Test on mobile device or browser dev tools</li>
        <li><strong>Performance:</strong> Check for console errors or warnings</li>
      </ol>
    </div>

    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 not-prose">
      <h4 className="font-semibold text-yellow-900 mb-2">🚨 Common Issues</h4>
      <ul className="text-yellow-800 text-sm space-y-2">
        <li>• <strong>"document is not defined":</strong> Use dynamic import for SSR frameworks</li>
        <li>• <strong>Widget not visible:</strong> Check CSS import and z-index conflicts</li>
        <li>• <strong>Wrong position:</strong> Ensure position prop matches available options</li>
        <li>• <strong>No responses:</strong> Verify tenantId and apiKey are correct</li>
      </ul>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Next Steps</h2>
    <p className="mb-4">Once your basic widget is working:</p>
    <ul className="mb-6">
      <li>• Explore <Link to="/docs/custom-theme" className="text-blue-600 hover:underline">Custom Theme</Link> for styling customization</li>
      <li>• Check <Link to="/docs/advanced-config" className="text-blue-600 hover:underline">Advanced Configuration</Link> for more options</li>
      <li>• Set up <Link to="/docs/chat-agent-oauth" className="text-blue-600 hover:underline">OAuth authentication</Link> for personalized responses</li>
    </ul>
  </div>
);

const CustomThemeContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Custom Theme Examples</h1>
    
    <p className="text-xl text-gray-600 mb-8">
      Customize the chat widget's appearance to match your brand with comprehensive theme options, 
      custom CSS, and pre-built theme templates.
    </p>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 not-prose">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">🎨 Theme Customization Options</h3>
      <ul className="space-y-2 text-blue-800">
        <li>• <strong>Colors:</strong> Primary, secondary, background, text colors</li>
        <li>• <strong>Typography:</strong> Font family, sizes, weights</li>
        <li>• <strong>Layout:</strong> Border radius, spacing, shadows</li>
        <li>• <strong>Animations:</strong> Typing speed, transitions, hover effects</li>
      </ul>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Basic Theme Configuration</h2>
    <p className="mb-4">Use the <code>theme</code> prop to customize colors and styling:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`<ChatWidget
  tenantId="your-tenant-id"
  apiKey="your-api-key"
  
  theme={{
    // Primary brand color (header, buttons, accents)
    primaryColor: '#6366f1',
    
    // Secondary color (subtle backgrounds)
    secondaryColor: '#f1f5f9',
    
    // Main background color
    backgroundColor: '#ffffff',
    
    // Text colors
    textColor: '#1e293b',
    
    // Border radius for rounded corners
    borderRadius: '12px',
    
    // Font family
    fontFamily: 'Inter, -apple-system, sans-serif',
  }}
/>`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Pre-built Theme Examples</h2>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Dark Mode Theme</h3>
    <div className="bg-gray-900 text-white rounded-lg p-4 mb-6 not-prose">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">CS</div>
        <div>
          <div className="font-semibold text-sm">Dark Assistant</div>
          <div className="text-xs opacity-80">Powered by ContentStack</div>
        </div>
      </div>
      <div className="text-sm opacity-90">Perfect for dark-themed websites</div>
    </div>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`theme={{
  primaryColor: '#8b5cf6',
  secondaryColor: '#374151',
  backgroundColor: '#1f2937',
  textColor: '#f9fafb',
  borderRadius: '16px',
  fontFamily: 'system-ui, sans-serif',
}}`}</code></pre>
    </div>

    <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Minimal Clean Theme</h3>
    <div className="bg-white border-2 border-gray-100 rounded-lg p-4 mb-6 not-prose shadow-sm">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold text-white">CS</div>
        <div>
          <div className="font-semibold text-sm text-gray-900">Clean Assistant</div>
          <div className="text-xs text-gray-500">Minimal & Professional</div>
        </div>
      </div>
      <div className="text-sm text-gray-600">Clean and professional appearance</div>
    </div>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`theme={{
  primaryColor: '#000000',
  secondaryColor: '#f8fafc',
  backgroundColor: '#ffffff',
  textColor: '#334155',
  borderRadius: '8px',
  fontFamily: '"SF Pro Display", system-ui, sans-serif',
}}`}</code></pre>
    </div>

    <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Colorful Brand Theme</h3>
    <div className="bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg p-4 mb-6 not-prose">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm font-bold">CS</div>
        <div>
          <div className="font-semibold text-sm">Brand Assistant</div>
          <div className="text-xs opacity-80">Vibrant & Engaging</div>
        </div>
      </div>
      <div className="text-sm opacity-90">Bold colors for creative brands</div>
    </div>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`theme={{
  primaryColor: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
  secondaryColor: '#fef3f2',
  backgroundColor: '#ffffff',
  textColor: '#7c2d12',
  borderRadius: '20px',
  fontFamily: '"Poppins", sans-serif',
}}`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Advanced CSS Customization</h2>
    <p className="mb-4">For more control, use custom CSS to override widget styles:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`/* Custom CSS for chat widget */
.contentstack-chat-widget {
  /* Override widget container */
  --chat-primary: #3b82f6;
  --chat-secondary: #e5e7eb;
  --chat-background: #ffffff;
  --chat-text: #111827;
  --chat-radius: 12px;
}

/* Custom chat bubble styles */
.contentstack-chat-widget .chat-message {
  border-radius: var(--chat-radius);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* User message styling */
.contentstack-chat-widget .chat-message.user {
  background: var(--chat-primary);
  color: white;
  margin-left: 20%;
}

/* Bot message styling */
.contentstack-chat-widget .chat-message.bot {
  background: var(--chat-secondary);
  color: var(--chat-text);
  margin-right: 20%;
}

/* Custom header gradient */
.contentstack-chat-widget .chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Typing indicator animation */
.contentstack-chat-widget .typing-indicator {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Custom scrollbar */
.contentstack-chat-widget .chat-messages::-webkit-scrollbar {
  width: 6px;
}

.contentstack-chat-widget .chat-messages::-webkit-scrollbar-thumb {
  background: var(--chat-primary);
  border-radius: 3px;
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .contentstack-chat-widget {
    border-radius: 0;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }
}`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Theme with Custom Positioning</h2>
    <p className="mb-4">Combine theming with custom positioning and sizing:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`<ChatWidget
  tenantId="your-tenant-id"
  apiKey="your-api-key"
  
  // Position and sizing
  position="bottom-left"
  className="custom-chat-widget"
  style={{
    width: '420px',
    height: '600px',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  }}
  
  // Custom theme
  theme={{
    primaryColor: '#0ea5e9',
    secondaryColor: '#f0f9ff',
    backgroundColor: '#ffffff',
    textColor: '#0c4a6e',
    borderRadius: '16px',
    fontFamily: '"Inter", system-ui, sans-serif',
  }}
  
  // Branding
  chatTitle="Support Assistant"
  welcomeMessage="👋 Hi there! I'm here to help you with any questions about our products and services."
  placeholder="Type your message here..."
/>`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Dynamic Theme Switching</h2>
    <p className="mb-4">Allow users to switch between themes dynamically:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`import { useState } from 'react';

const themes = {
  light: {
    primaryColor: '#3b82f6',
    secondaryColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    borderRadius: '12px',
  },
  dark: {
    primaryColor: '#8b5cf6',
    secondaryColor: '#374151',
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    borderRadius: '16px',
  },
  corporate: {
    primaryColor: '#059669',
    secondaryColor: '#ecfccb',
    backgroundColor: '#ffffff',
    textColor: '#365314',
    borderRadius: '8px',
  }
};

export default function App() {
  const [currentTheme, setCurrentTheme] = useState('light');
  
  return (
    <div>
      {/* Theme selector */}
      <div className="theme-selector">
        <button onClick={() => setCurrentTheme('light')}>Light</button>
        <button onClick={() => setCurrentTheme('dark')}>Dark</button>
        <button onClick={() => setCurrentTheme('corporate')}>Corporate</button>
      </div>
      
      <ChatWidget
        tenantId="your-tenant-id"
        apiKey="your-api-key"
        theme={themes[currentTheme]}
        chatTitle={\`\${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)} Assistant\`}
      />
    </div>
  );
}`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Theme Best Practices</h2>
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 not-prose">
      <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Design Guidelines</h3>
      <ul className="space-y-2 text-green-800">
        <li>• <strong>Contrast:</strong> Ensure sufficient color contrast for accessibility (WCAG 2.1)</li>
        <li>• <strong>Brand consistency:</strong> Match your website's color scheme and typography</li>
        <li>• <strong>Mobile-first:</strong> Test themes on different screen sizes</li>
        <li>• <strong>Readability:</strong> Choose fonts and sizes that are easy to read</li>
        <li>• <strong>Performance:</strong> Avoid complex gradients or animations on mobile</li>
      </ul>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Theme Testing Checklist</h2>
    <div className="bg-gray-100 border rounded-lg p-4 mb-6 not-prose">
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li><strong>Color contrast:</strong> Use tools like WebAIM contrast checker</li>
        <li><strong>Multiple devices:</strong> Test on desktop, tablet, and mobile</li>
        <li><strong>Different browsers:</strong> Verify appearance in Chrome, Firefox, Safari</li>
        <li><strong>Light/dark modes:</strong> Test with system dark mode enabled</li>
        <li><strong>Accessibility:</strong> Test with screen readers and keyboard navigation</li>
        <li><strong>Performance:</strong> Check for any theme-related performance issues</li>
      </ol>
    </div>

    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 not-prose">
      <h4 className="font-semibold text-yellow-900 mb-2">💡 Pro Tips</h4>
      <ul className="text-yellow-800 text-sm space-y-2">
        <li>• Use CSS custom properties for easier theme switching</li>
        <li>• Test themes with real content, not just placeholder text</li>
        <li>• Consider seasonal or promotional theme variations</li>
        <li>• Save user theme preferences in localStorage</li>
        <li>• Use relative units (rem, em) for better scaling</li>
      </ul>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Resources</h2>
    <ul className="mb-6">
      <li>• <a href="https://coolors.co/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">Coolors.co</a> - Color palette generator</li>
      <li>• <a href="https://fonts.google.com/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">Google Fonts</a> - Free web fonts</li>
      <li>• <a href="https://webaim.org/resources/contrastchecker/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">WebAIM</a> - Contrast checker</li>
      <li>• <a href="https://tailwindcss.com/docs/customizing-colors" className="text-blue-600 hover:underline" target="_blank" rel="noopener">Tailwind Colors</a> - Pre-defined color palettes</li>
    </ul>
  </div>
);

const AdvancedConfigContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-4xl font-bold text-gray-900 mb-6">Advanced Configuration</h1>
    
    <p className="text-xl text-gray-600 mb-8">
      Dive deep into advanced features, custom event handlers, performance optimization, 
      integration patterns, and production deployment strategies.
    </p>

    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8 not-prose">
      <h3 className="text-lg font-semibold text-purple-900 mb-3">🚀 Advanced Features</h3>
      <ul className="space-y-2 text-purple-800">
        <li>• <strong>Event Handlers:</strong> Custom callbacks for chat lifecycle events</li>
        <li>• <strong>Memory Management:</strong> Persistent conversation history</li>
        <li>• <strong>Custom Providers:</strong> Integration with multiple LLM providers</li>
        <li>• <strong>Performance:</strong> Lazy loading, caching, and optimization</li>
      </ul>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Complete Configuration Reference</h2>
    <p className="mb-4">Full list of all available props and configuration options:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`<ChatWidget
  // === REQUIRED PROPS ===
  tenantId="your-tenant-id"                    // ContentStack tenant identifier
  apiKey="your-api-key"                        // ContentStack API key
  
  // === AUTHENTICATION ===
  enableOAuth={true}                           // Enable OAuth authentication
  oauthUrl="/api/auth/contentstack"            // OAuth initiation endpoint
  jwtSecret="your-jwt-secret"                  // JWT token secret (server-side)
  
  // === UI CUSTOMIZATION ===
  position="bottom-right"                      // bottom-right | bottom-left | top-right | top-left
  chatTitle="AI Assistant"                     // Header title text
  welcomeMessage="Hello! How can I help?"      // Initial greeting message
  placeholder="Type your message..."           // Input field placeholder
  
  // === THEMING ===
  theme={{
    primaryColor: '#3b82f6',                   // Main brand color
    secondaryColor: '#f1f5f9',                 // Secondary/background color
    backgroundColor: '#ffffff',                // Chat background
    textColor: '#1e293b',                      // Text color
    borderRadius: '12px',                      // Border radius for elements
    fontFamily: 'Inter, sans-serif',           // Font family
  }}
  
  // === BEHAVIOR SETTINGS ===
  autoOpen={false}                             // Auto-open chat on page load
  showTypingIndicator={true}                   // Show typing animation
  enableSoundNotifications={false}             // Sound notifications
  enableBrowserNotifications={false}           // Browser push notifications
  typingSpeed={50}                             // Typing animation speed (ms)
  
  // === CONVERSATION SETTINGS ===
  maxMessages={100}                            // Maximum messages to keep in memory
  persistConversation={true}                   // Save conversation in localStorage
  conversationKey="chat-session"               // localStorage key for persistence
  clearOnNewSession={false}                    // Clear history on new sessions
  
  // === LLM PROVIDER CONFIGURATION ===
  llmProvider="groq"                           // groq | gemini | openrouter
  model="llama-3.1-70b-versatile"             // Model name for the provider
  temperature={0.7}                            // Response creativity (0-1)
  maxTokens={1000}                             // Maximum response length
  
  // === CUSTOM STYLING ===
  className="custom-chat-widget"               // Custom CSS class
  style={{ width: '400px', height: '600px' }} // Inline styles
  
  // === EVENT HANDLERS ===
  onMessageSent={(message) => console.log('Sent:', message)}
  onMessageReceived={(message) => console.log('Received:', message)}
  onChatOpened={() => console.log('Chat opened')}
  onChatClosed={() => console.log('Chat closed')}
  onError={(error) => console.error('Chat error:', error)}
  onAuthRequired={() => console.log('Authentication required')}
  onAuthSuccess={(user) => console.log('Auth success:', user)}
  
  // === ADVANCED FEATURES ===
  enableFileUpload={false}                     // Allow file attachments
  enableVoiceInput={false}                     // Voice message input
  enableScreenShare={false}                    // Screen sharing capability
  enableVideoCall={false}                      // Video call integration
  
  // === PERFORMANCE ===
  lazy={true}                                  // Lazy load chat component
  preloadMessages={false}                      // Preload recent messages
  cacheResponses={true}                        // Cache AI responses
  
  // === ANALYTICS ===
  enableAnalytics={true}                       // Track usage analytics
  analyticsProvider="contentstack"             // Analytics service
  trackingId="your-tracking-id"                // Analytics tracking ID
  
  // === DEBUGGING ===
  debug={false}                                // Enable debug logging
  apiEndpoint="https://api.contentstack.io"    // Custom API endpoint
  timeout={30000}                              // Request timeout (ms)
/>`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Event Handling System</h2>
    <p className="mb-4">Implement custom logic with comprehensive event handlers:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`import { useState, useCallback } from 'react';

export default function AdvancedChatImplementation() {
  const [chatMetrics, setChatMetrics] = useState({
    messageCount: 0,
    sessionDuration: 0,
    userSatisfaction: null
  });

  // Message tracking
  const handleMessageSent = useCallback((message) => {
    console.log('User message:', message);
    
    // Track message analytics
    setChatMetrics(prev => ({
      ...prev,
      messageCount: prev.messageCount + 1
    }));
    
    // Send to analytics service
    gtag('event', 'chat_message_sent', {
      message_length: message.length,
      timestamp: Date.now()
    });
  }, []);

  const handleMessageReceived = useCallback((message) => {
    console.log('AI response:', message);
    
    // Check for specific response types
    if (message.includes('error') || message.includes('sorry')) {
      // Log potential issues
      console.warn('Potentially problematic response:', message);
    }
    
    // Update conversation context
    updateConversationContext(message);
  }, []);

  // Session management
  const handleChatOpened = useCallback(() => {
    console.log('Chat session started');
    
    // Start session timer
    const startTime = Date.now();
    
    // Welcome analytics
    gtag('event', 'chat_opened', {
      timestamp: startTime
    });
    
    // Custom welcome logic
    if (isFirstTimeUser()) {
      // Show onboarding
      showOnboardingTour();
    }
  }, []);

  const handleChatClosed = useCallback(() => {
    console.log('Chat session ended');
    
    // Calculate session duration
    const duration = Date.now() - sessionStartTime;
    setChatMetrics(prev => ({
      ...prev,
      sessionDuration: duration
    }));
    
    // Trigger satisfaction survey
    if (chatMetrics.messageCount > 3) {
      setTimeout(() => {
        showSatisfactionSurvey();
      }, 1000);
    }
  }, [chatMetrics.messageCount]);

  // Error handling
  const handleChatError = useCallback((error) => {
    console.error('Chat error occurred:', error);
    
    // Send error to monitoring service
    Sentry.captureException(error, {
      tags: {
        component: 'chat-widget',
        user_id: getCurrentUserId()
      }
    });
    
    // Show user-friendly error message
    showErrorNotification('Something went wrong. Please try again.');
    
    // Attempt recovery
    if (error.type === 'network') {
      // Retry with exponential backoff
      retryWithBackoff();
    }
  }, []);

  // Authentication events
  const handleAuthRequired = useCallback(() => {
    console.log('Authentication required');
    
    // Show auth modal or redirect
    window.location.href = '/login?redirect=chat';
    
    // Or show inline auth
    setShowAuthModal(true);
  }, []);

  const handleAuthSuccess = useCallback((user) => {
    console.log('User authenticated:', user);
    
    // Update user context
    setCurrentUser(user);
    
    // Personalize experience
    setChatTitle(\`Welcome back, \${user.name}!\`);
    
    // Load user's conversation history
    loadUserChatHistory(user.id);
  }, []);

  return (
    <ChatWidget
      tenantId="your-tenant-id"
      apiKey="your-api-key"
      
      // Event handlers
      onMessageSent={handleMessageSent}
      onMessageReceived={handleMessageReceived}
      onChatOpened={handleChatOpened}
      onChatClosed={handleChatClosed}
      onError={handleChatError}
      onAuthRequired={handleAuthRequired}
      onAuthSuccess={handleAuthSuccess}
      
      // Advanced configuration
      enableAnalytics={true}
      persistConversation={true}
      maxMessages={200}
      debug={process.env.NODE_ENV === 'development'}
    />
  );
}`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Multi-Provider LLM Configuration</h2>
    <p className="mb-4">Configure different LLM providers for optimal performance:</p>
    
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`// Provider-specific configurations
const llmConfigs = {
  groq: {
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    temperature: 0.7,
    maxTokens: 1000,
    apiKey: process.env.GROQ_API_KEY,
    // Groq-specific settings
    streaming: true,
    topP: 0.9,
    frequencyPenalty: 0,
  },
  
  gemini: {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    temperature: 0.8,
    maxTokens: 2048,
    apiKey: process.env.GEMINI_API_KEY,
    // Gemini-specific settings
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ]
  },
  
  openrouter: {
    provider: 'openrouter',
    model: 'anthropic/claude-3-sonnet',
    temperature: 0.6,
    maxTokens: 1500,
    apiKey: process.env.OPENROUTER_API_KEY,
    // OpenRouter-specific settings
    route: 'fallback',
    transforms: ['middle-out']
  }
};

// Dynamic provider selection
function ChatWithProviderSwitching() {
  const [currentProvider, setCurrentProvider] = useState('groq');
  const [providerHealth, setProviderHealth] = useState({});
  
  // Monitor provider health
  useEffect(() => {
    const checkProviderHealth = async () => {
      const health = {};
      for (const [provider, config] of Object.entries(llmConfigs)) {
        try {
          const response = await fetch(\`/api/health/\${provider}\`);
          health[provider] = response.ok;
        } catch {
          health[provider] = false;
        }
      }
      setProviderHealth(health);
    };
    
    checkProviderHealth();
    const interval = setInterval(checkProviderHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);
  
  // Auto-fallback to healthy provider
  const handleProviderError = useCallback((error) => {
    console.error(\`Provider \${currentProvider} failed:\`, error);
    
    // Find next healthy provider
    const healthyProviders = Object.keys(providerHealth).filter(
      provider => providerHealth[provider] && provider !== currentProvider
    );
    
    if (healthyProviders.length > 0) {
      const nextProvider = healthyProviders[0];
      console.log(\`Switching to \${nextProvider}\`);
      setCurrentProvider(nextProvider);
    }
  }, [currentProvider, providerHealth]);
  
  return (
    <div>
      {/* Provider status indicator */}
      <div className="provider-status">
        {Object.entries(providerHealth).map(([provider, isHealthy]) => (
          <span 
            key={provider}
            className={\`status \${isHealthy ? 'healthy' : 'unhealthy'}\`}
          >
            {provider}: {isHealthy ? '✅' : '❌'}
          </span>
        ))}
      </div>
      
      <ChatWidget
        {...llmConfigs[currentProvider]}
        onError={handleProviderError}
        tenantId="your-tenant-id"
        apiKey="your-api-key"
      />
    </div>
  );
}`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Performance Optimization</h2>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Lazy Loading & Code Splitting</h3>
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`// Lazy load the chat widget
import { lazy, Suspense } from 'react';

const ChatWidget = lazy(() => import('@contentstack/chat-widget'));

export default function App() {
  return (
    <div>
      {/* Main app content */}
      <main>Your main content here</main>
      
      {/* Lazy-loaded chat widget */}
      <Suspense fallback={<div className="chat-loading">Loading chat...</div>}>
        <ChatWidget
          tenantId="your-tenant-id"
          apiKey="your-api-key"
          lazy={true}
          preloadMessages={false}
        />
      </Suspense>
    </div>
  );
}

// Advanced lazy loading with intersection observer
import { useState, useEffect, useRef } from 'react';

function LazyChat() {
  const [shouldLoadChat, setShouldLoadChat] = useState(false);
  const triggerRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadChat(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <>
      <div ref={triggerRef} className="chat-trigger" />
      {shouldLoadChat && <ChatWidget {...chatProps} />}
    </>
  );
}`}</code></pre>
    </div>

    <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Caching & Memory Management</h3>
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`// Advanced caching configuration
const cacheConfig = {
  // Message caching
  messageCache: {
    enabled: true,
    maxSize: 1000,     // Maximum cached messages
    ttl: 3600000,      // 1 hour TTL
    compression: true   // Compress cached data
  },
  
  // Response caching
  responseCache: {
    enabled: true,
    strategy: 'lru',    // Least Recently Used
    maxSize: 100,       // Cache 100 responses
    keyGenerator: (message) => \`msg_\${btoa(message).slice(0, 10)}\`
  },
  
  // User context caching
  contextCache: {
    enabled: true,
    persistToStorage: true,
    storageKey: 'chat_context',
    maxContextLength: 10  // Keep last 10 conversation turns
  }
};

// Memory management utilities
class ChatMemoryManager {
  constructor(maxMemory = 50 * 1024 * 1024) { // 50MB default
    this.maxMemory = maxMemory;
    this.currentMemory = 0;
    this.messageCache = new Map();
  }
  
  addMessage(id, message) {
    const messageSize = new Blob([JSON.stringify(message)]).size;
    
    // Check memory limit
    if (this.currentMemory + messageSize > this.maxMemory) {
      this.cleanupMemory();
    }
    
    this.messageCache.set(id, {
      ...message,
      timestamp: Date.now(),
      size: messageSize
    });
    
    this.currentMemory += messageSize;
  }
  
  cleanupMemory() {
    // Remove oldest messages
    const sortedMessages = Array.from(this.messageCache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp);
    
    let freedMemory = 0;
    const targetMemory = this.maxMemory * 0.7; // Clean to 70% capacity
    
    for (const [id, message] of sortedMessages) {
      this.messageCache.delete(id);
      freedMemory += message.size;
      this.currentMemory -= message.size;
      
      if (this.currentMemory <= targetMemory) break;
    }
    
    console.log(\`Cleaned up \${freedMemory} bytes of chat memory\`);
  }
}

// Usage with chat widget
const memoryManager = new ChatMemoryManager();

<ChatWidget
  cacheConfig={cacheConfig}
  memoryManager={memoryManager}
  maxMessages={100}
  persistConversation={true}
  onMessageReceived={(message) => {
    memoryManager.addMessage(message.id, message);
  }}
/>`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Production Deployment Guide</h2>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-3">Environment Configuration</h3>
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`// .env.production
CONTENTSTACK_TENANT_ID=your-production-tenant-id
CONTENTSTACK_API_KEY=your-production-api-key
CONTENTSTACK_CLIENT_ID=your-oauth-client-id
CONTENTSTACK_CLIENT_SECRET=your-oauth-client-secret
CONTENTSTACK_REDIRECT_URI=https://yourdomain.com/api/auth/callback
JWT_SECRET=your-production-jwt-secret-key

# LLM Provider Keys
GROQ_API_KEY=your-groq-production-key
GEMINI_API_KEY=your-gemini-production-key
OPENROUTER_API_KEY=your-openrouter-production-key

# Analytics & Monitoring
ANALYTICS_TRACKING_ID=your-ga-tracking-id
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info

# Performance Settings
REDIS_URL=redis://your-redis-instance
DATABASE_URL=postgresql://your-db-connection

# Security
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100`}</code></pre>
    </div>

    <h3 className="text-xl font-semibold text-gray-900 mb-3">Security Configuration</h3>
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 not-prose">
      <h4 className="text-lg font-semibold text-red-900 mb-3">🔒 Security Checklist</h4>
      <ul className="space-y-2 text-red-800">
        <li>• <strong>API Keys:</strong> Never expose API keys in client-side code</li>
        <li>• <strong>CORS:</strong> Configure strict CORS policies for production</li>
        <li>• <strong>Rate Limiting:</strong> Implement rate limiting to prevent abuse</li>
        <li>• <strong>Input Validation:</strong> Sanitize all user inputs</li>
        <li>• <strong>Content Security Policy:</strong> Set up CSP headers</li>
      </ul>
    </div>

    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`// Security middleware for Next.js API routes
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Security headers
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://api.contentstack.io"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.contentstack.io", "wss:"]
    }
  }
};

// Apply to API routes
export default function handler(req, res) {
  // Apply security middleware
  limiter(req, res, () => {
    cors(corsOptions)(req, res, () => {
      helmet(helmetConfig)(req, res, () => {
        // Your chat API logic here
        handleChatRequest(req, res);
      });
    });
  });
}`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Monitoring & Analytics</h2>
    <div className="bg-gray-50 border rounded-lg p-4 mb-6 not-prose">
      <pre className="text-sm"><code>{`// Advanced analytics setup
import { Analytics } from '@contentstack/analytics';

const analytics = new Analytics({
  trackingId: process.env.ANALYTICS_TRACKING_ID,
  enableUserTracking: true,
  enableConversationAnalytics: true,
  enablePerformanceMonitoring: true
});

// Custom events tracking
const trackChatEvent = (event, data) => {
  analytics.track(event, {
    timestamp: Date.now(),
    sessionId: getSessionId(),
    userId: getCurrentUserId(),
    ...data
  });
};

// Performance monitoring
const performanceMonitor = {
  startTimer: (operation) => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      trackChatEvent('performance', {
        operation,
        duration,
        slow: duration > 1000
      });
    };
  },
  
  trackMemoryUsage: () => {
    if (performance.memory) {
      trackChatEvent('memory_usage', {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      });
    }
  }
};

// Error monitoring with Sentry
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out non-critical errors
    if (event.exception) {
      const error = event.exception.values[0];
      if (error.type === 'ChunkLoadError') {
        return null; // Don't send chunk load errors
      }
    }
    return event;
  }
});

<ChatWidget
  tenantId="your-tenant-id"
  apiKey="your-api-key"
  
  // Analytics integration
  onMessageSent={(message) => {
    const endTimer = performanceMonitor.startTimer('message_send');
    trackChatEvent('message_sent', {
      messageLength: message.length,
      hasMedia: message.includes('data:'),
    });
    endTimer();
  }}
  
  onError={(error) => {
    Sentry.captureException(error, {
      tags: { component: 'chat-widget' },
      extra: { timestamp: Date.now() }
    });
  }}
  
  enableAnalytics={true}
  analyticsProvider="contentstack"
/>`}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Troubleshooting Guide</h2>
    <div className="bg-gray-100 border rounded-lg p-4 mb-6 not-prose">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-semibold">Issue</th>
            <th className="text-left p-2 font-semibold">Cause</th>
            <th className="text-left p-2 font-semibold">Solution</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-2">Chat not loading</td>
            <td className="p-2">Missing API keys or incorrect configuration</td>
            <td className="p-2">Check environment variables and API key validity</td>
          </tr>
          <tr className="border-b">
            <td className="p-2">SSR errors</td>
            <td className="p-2">Client-only code running on server</td>
            <td className="p-2">Use dynamic imports with <code>ssr: false</code></td>
          </tr>
          <tr className="border-b">
            <td className="p-2">Positioning issues</td>
            <td className="p-2">CSS conflicts with host site</td>
            <td className="p-2">Add custom CSS with higher specificity</td>
          </tr>
          <tr className="border-b">
            <td className="p-2">Slow responses</td>
            <td className="p-2">Network latency or provider issues</td>
            <td className="p-2">Implement caching and provider fallbacks</td>
          </tr>
          <tr className="border-b">
            <td className="p-2">Memory leaks</td>
            <td className="p-2">Event listeners not cleaned up</td>
            <td className="p-2">Implement proper cleanup in useEffect</td>
          </tr>
          <tr>
            <td className="p-2">Authentication failures</td>
            <td className="p-2">OAuth configuration or JWT issues</td>
            <td className="p-2">Verify OAuth endpoints and JWT secret</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 not-prose">
      <h4 className="font-semibold text-blue-900 mb-2">🔧 Debug Mode</h4>
      <p className="text-blue-800 text-sm mb-3">
        Enable debug mode for detailed logging and troubleshooting information:
      </p>
      <pre className="text-sm bg-blue-100 p-2 rounded"><code>{"<ChatWidget debug={true} />"}</code></pre>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Performance Benchmarks</h2>
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 not-prose">
      <h4 className="font-semibold text-green-900 mb-3">⚡ Expected Performance</h4>
      <ul className="space-y-2 text-green-800 text-sm">
        <li>• <strong>Initial Load:</strong> &lt; 200ms (with lazy loading)</li>
        <li>• <strong>Message Response:</strong> &lt; 2s (varies by LLM provider)</li>
        <li>• <strong>Memory Usage:</strong> &lt; 10MB for 100 messages</li>
        <li>• <strong>Bundle Size:</strong> ~25KB gzipped (excluding dependencies)</li>
        <li>• <strong>Network Requests:</strong> Minimal, only for API calls</li>
      </ul>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Best Practices Summary</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 not-prose">
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-3">✅ Do's</h4>
        <ul className="text-sm space-y-2 text-gray-700">
          <li>• Use environment variables for sensitive data</li>
          <li>• Implement proper error handling and fallbacks</li>
          <li>• Test across different devices and browsers</li>
          <li>• Monitor performance and user experience</li>
          <li>• Keep the SDK updated to latest version</li>
          <li>• Use TypeScript for better development experience</li>
        </ul>
      </div>
      
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-3">❌ Don'ts</h4>
        <ul className="text-sm space-y-2 text-gray-700">
          <li>• Don't expose API keys in client-side code</li>
          <li>• Don't ignore SSR compatibility issues</li>
          <li>• Don't skip rate limiting in production</li>
          <li>• Don't forget to handle edge cases</li>
          <li>• Don't disable security features without consideration</li>
          <li>• Don't ignore accessibility requirements</li>
        </ul>
      </div>
    </div>

    <div className="bg-gray-900 text-white rounded-lg p-6 mb-8 not-prose">
      <h4 className="font-semibold mb-3">🚀 Ready for Production?</h4>
      <p className="text-gray-300 text-sm mb-4">
        Make sure you've completed all the steps in this advanced configuration guide 
        before deploying to production. Need help? Check our documentation or contact support.
      </p>
      <div className="flex space-x-4">
        <a href="#" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium">
          Documentation
        </a>
        <a href="#" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-medium">
          Get Support
        </a>
      </div>
    </div>
  </div>
);