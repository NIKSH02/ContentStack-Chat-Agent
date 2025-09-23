import React from 'react';
import { ChatWidget } from '../src/components/ChatWidget';

/**
 * Example implementation of the ContentStack Chat Widget
 * 
 * This demonstrates the updated API format that aligns with the backend expectations.
 * The widget now uses tenantId, apiKey, and projectId instead of the previous
 * deliveryToken-based configuration.
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          ContentStack Chat Widget Demo
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Features:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>AI-powered chat with ContentStack integration</li>
            <li>Multiple LLM provider support (Groq, Gemini, OpenRouter)</li>
            <li>Fully responsive design for desktop and mobile</li>
            <li>Customizable themes and branding</li>
            <li>Real-time chat interface with loading states</li>
          </ul>
        </div>

        {/* Chat Widget with updated API format */}
        <ChatWidget
          // Required ContentStack configuration
          tenantId="your-tenant-id"
          apiKey="your-contentstack-api-key"
          projectId="your-project-id"
          
          // Optional API configuration
          apiEndpoint="http://localhost:5002/api/contentstack/query"
          
          // UI Configuration
          chatTitle="ContentStack Assistant"
          welcomeMessage="Hello! I'm your ContentStack assistant. Ask me anything about your content!"
          placeholder="Type your question here..."
          position="bottom-right"
          
          // LLM Configuration
        //   defaultProvider="groq"
        //   defaultModel="llama-3.1-70b-versatile"
          
          // Theme customization
          theme={{
            primaryColor: '#6a5ddf',
            secondaryColor: '#f3f4f6',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            userMessageColor: '#6a5ddf',
            assistantMessageColor: '#f3f4f6',
            borderRadius: '12px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          
          // Event handlers
          onToggle={(isOpen) => {
            console.log('Chat widget toggled:', isOpen);
          }}
          
          onMessage={(message) => {
            console.log('New message:', message);
          }}
        />
      </div>
    </div>
  );
}

export default App;
