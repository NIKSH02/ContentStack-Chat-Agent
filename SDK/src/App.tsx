import { ChatWidget } from './components/ChatWidget';
import type { ChatWidgetProps } from './types';
import './App.css';

function App() {
  // Example configuration for ContentStack Chat Widget
  const chatConfig: ChatWidgetProps = {
    
    // ContentStack Configuration
    tenantId: 'your-tenant-id',
    apiKey: 'blt3535fd43f0763af7',       // blt483a005c4ad32b09            // blt3535fd43f0763af7    blog one 
    // projectId: '68a96ab5567b0b50bd700055',
    
    // LLM Configuration (Developer-only, not exposed to end users)
    // provider: 'groq',
    // model: 'llama-3.1-8b-instant',
    // provider: 'openrouter',
    // model: 'openai/gpt-oss-20b:free',
    // model:"cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    
    // UI Configuration
    position: 'bottom-right',
    chatTitle: 'ContentStack Assistant',
    placeholder: 'Ask me about this website...',
    welcomeMessage: 'Hi! I\'m your ContentStack assistant. I can help you find anything on this website . What would you like to know?',
    
    // Theme customization
    theme: {
      primaryColor: '#6a5ddf', // ContentStack brand color
      secondaryColor: '#f3f4f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderRadius: '12px',
    },
    
    // Typing animation speed (milliseconds per character)
    // typingSpeed: 25, // Fast typing like ChatGPT (25ms per char)
    // typingSpeed: 50, // Slower, more deliberate typing
    typingSpeed: 15, // Very fast typing
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* The ContentStack Chat Widget */}
      <ChatWidget {...chatConfig} />
    </div>
  );
}

export default App
