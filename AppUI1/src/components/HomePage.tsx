import React from 'react';
import { Paragraph, Heading, Button } from '@contentstack/venus-components';

export const HomePage: React.FC = () => {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="px-8 py-20 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 mb-12">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Ready to Configure
          </div>
          
          {/* Hero Title - EXACT gradient as requested */}
          <h1 className="text-6xl font-bold leading-tight mb-6 text-gray-900">
            Intelligent <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Content Assistant</span>
            <br />
            <span className="text-4xl text-gray-700">Powered by Advanced AI</span>
          </h1>
          
          {/* Hero Description */}
          <Paragraph className="text-xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto" text='Transform how you interact with ContentStack through natural language. 
            Advanced dual-LLM architecture with 59+ integrated tools for intelligent content management.' />

          {/* Hero Actions */}
          <div className="flex gap-4 justify-center mb-16">
            <Button 
              href="/oauth"
              className="px-8 py-4 bg-[#6a5dDF] text-white font-semibold rounded-lg hover:bg-[#5a4ecf] transition-colors"
            >
              Start Chatting
            </Button>
            <Button 
              href="/documentation"
              className="px-8 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Documentation
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#6a5dDF] mb-2">59+</div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Tools</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#6a5dDF] mb-2">4</div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">LLM Providers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#6a5dDF] mb-2">2-3s</div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Response Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="px-8 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto" text='Sophisticated multi-LLM strategy optimized for intelligent content operations' />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-white border-2 border-[#6a5dDF] rounded-2xl flex items-center justify-center">
                <div className="w-6 h-6 bg-[#6a5dDF] rounded"></div>
              </div>
              <Heading className="text-lg font-semibold text-gray-900 mb-3" text='Natural Query' />
              <Paragraph className="text-gray-600" text='Ask anything about your content in plain language' />
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-white border-2 border-[#6a5dDF] rounded-2xl flex items-center justify-center">
                <div className="grid grid-cols-2 gap-1">
                  <div className="w-2 h-2 bg-[#6a5dDF] rounded-sm"></div>
                  <div className="w-2 h-2 bg-[#6a5dDF] rounded-sm"></div>
                  <div className="w-2 h-2 bg-[#6a5dDF] rounded-sm"></div>
                  <div className="w-2 h-2 bg-[#6a5dDF] rounded-sm"></div>
                </div>
              </div>
              <Heading className="text-lg font-semibold text-gray-900 mb-3" text='Smart Routing ' />
              <Paragraph className="text-gray-600" text='Groq intelligence selects optimal tools' />
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-white border-2 border-[#6a5dDF] rounded-2xl flex items-center justify-center">
                <div className="w-8 h-6 bg-[#6a5dDF] rounded"></div>
              </div>
              <Heading className="text-lg font-semibold text-gray-900 mb-3" text='MCP Execution ' />
              <Paragraph className="text-gray-600" text='Execute ContentStack operations seamlessly' />
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-white border-2 border-[#6a5dDF] rounded-2xl flex items-center justify-center">
                <div className="w-6 h-4 bg-[#6a5dDF] rounded-full"></div>
              </div>
              <Heading className="text-lg font-semibold text-gray-900 mb-3" text='AI Response '  />
              <Paragraph className="text-gray-600" text='Get intelligent, contextual answers' />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-8 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Key Features</h2>
            <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto" text='Everything you need for intelligent content management and automation' />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 border border-gray-200 rounded-2xl hover:border-[#6a5dDF] transition-colors group">
              <div className="w-12 h-12 bg-[#6a5dDF] bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 bg-[#6a5dDF] rounded"></div>
              </div>
              <Heading className="text-xl font-semibold text-gray-900 mb-3"  text='Dual-LLM Strategy'/>
              <Paragraph className="text-gray-600 mb-4" text='Groq for tool selection, your choice for intelligent responses' />
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Groq</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">OpenAI</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Gemini</span>
              </div>
            </div>
            
            <div className="p-8 border border-gray-200 rounded-2xl hover:border-[#6a5dDF] transition-colors group">
              <div className="w-12 h-12 bg-[#6a5dDF] bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <div className="grid grid-cols-3 gap-1">
                  <div className="w-1 h-1 bg-[#6a5dDF] rounded-full"></div>
                  <div className="w-1 h-1 bg-[#6a5dDF] rounded-full"></div>
                  <div className="w-1 h-1 bg-[#6a5dDF] rounded-full"></div>
                  <div className="w-1 h-1 bg-[#6a5dDF] rounded-full"></div>
                  <div className="w-1 h-1 bg-[#6a5dDF] rounded-full"></div>
                  <div className="w-1 h-1 bg-[#6a5dDF] rounded-full"></div>
                </div>
              </div>
              <Heading className="text-xl font-semibold text-gray-900 mb-3" text='59+ ContentStack Tools' />
              <Paragraph className="text-gray-600 mb-4" text='Complete CMA & Launch API integration for all operations' />
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Entries</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Assets</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Publishing</span>
              </div>
            </div>
            
            <div className="p-8 border border-gray-200 rounded-2xl hover:border-[#6a5dDF] transition-colors group">
              <div className="w-12 h-12 bg-[#6a5dDF] bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 border-2 border-[#6a5dDF] rounded-full relative">
                  <div className="w-1 h-3 bg-[#6a5dDF] absolute top-1 left-2 rounded-full"></div>
                </div>
              </div>
              <Heading className="text-xl font-semibold text-gray-900 mb-3" text='Real-time Streaming' />
              <Paragraph className="text-gray-600 mb-4">Instant responses with live updates and WebSocket connection</Paragraph>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">2-3s Response</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Live Updates</span>
              </div>
            </div>
            
            <div className="p-8 border border-gray-200 rounded-2xl hover:border-[#6a5dDF] transition-colors group">
              <div className="w-12 h-12 bg-[#6a5dDF] bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 bg-[#6a5dDF] rounded-lg relative">
                  <div className="w-2 h-2 bg-white rounded-full absolute top-1 right-1"></div>
                </div>
              </div>
              <Heading className="text-xl font-semibold text-gray-900 mb-3" text='Smart Automation' />
              <Paragraph className="text-gray-600 mb-4" text='Intelligent workflows and automated content operations' />
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Auto-publish</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Bulk Operations</span>
              </div>
            </div>
            
            <div className="p-8 border border-gray-200 rounded-2xl hover:border-[#6a5dDF] transition-colors group">
              <div className="w-12 h-12 bg-[#6a5dDF] bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 border-2 border-[#6a5dDF] rounded relative">
                  <div className="w-2 h-2 bg-[#6a5dDF] rounded-full absolute top-0.5 left-0.5"></div>
                </div>
              </div>
              <Heading className="text-xl font-semibold text-gray-900 mb-3" text='Natural Language ' />
              <Paragraph className="text-gray-600 mb-4" text='Ask complex questions in plain English, get precise answers' />
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Conversational</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Context-Aware</span>
              </div>
            </div>
            
            <div className="p-8 border border-gray-200 rounded-2xl hover:border-[#6a5dDF] transition-colors group">
              <div className="w-12 h-12 bg-[#6a5dDF] bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <div className="w-6 h-6 bg-[#6a5dDF] rounded-full relative">
                  <div className="w-3 h-0.5 bg-white absolute top-2.5 left-1.5 rounded-full"></div>
                </div>
              </div>
              <Heading className="text-xl font-semibold text-gray-900 mb-3" text='Enterprise Ready' />
              <Paragraph className="text-gray-600 mb-4" text='Secure, scalable, and built for production environments' />
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Secure</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">Scalable</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-8 py-20 bg-[#6a5dDF]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Content Workflow?
          </h2>
          <Paragraph className="text-xl text-purple-100 mb-10 max-w-2xl mx-auto leading-relaxed"  text='Join the next generation of content management. Start having intelligent conversations with your ContentStack data today.' />
          <a 
            href="/oauth"
            className="inline-flex items-center px-8 py-4 bg-white text-[#6a5dDF] font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            Get Started Now
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
};