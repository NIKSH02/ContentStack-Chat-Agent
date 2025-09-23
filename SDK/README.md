# ContentStack AI Chat Widget SDK

[![npm version](https://badge.fury.io/js/contentstack-chat-widget.svg)](https://www.npmjs.com/package/contentstack-chat-widget)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)

A powerful React TypeScript SDK that brings **AI-powered conversational interfaces** to any website using ContentStack CMS. Users can ask questions in natural language and get intelligent responses with real content from your ContentStack projects.

## 🎯 What This SDK Does

Transform your ContentStack CMS into an **intelligent chat assistant** that can:
- **Answer questions** about your website content using natural language
- **Search and retrieve** specific entries, assets, and content types
- **Provide contextual responses** based on your actual ContentStack data
- **Stream responses** in real-time like ChatGPT
- **Handle multimedia content** including images, videos, and documents

## ✨ Key Features

- 🤖 **AI-Powered**: Integrates with multiple LLM providers (Groq, Gemini, OpenRouter)
- � **ContentStack Native**: Direct integration with ContentStack CMS via MCP (Model Context Protocol)
- ⚡ **Real-time Streaming**: ChatGPT-like typing animation with streaming responses
- 🎨 **Fully Customizable**: Themes, positioning, colors, and UI elements
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- 🚫 **Cancellable Requests**: Users can stop and restart conversations anytime
- � **Session Memory**: Maintains conversation context throughout the session
- 🔧 **Developer Friendly**: Full TypeScript support with comprehensive types

## 🚀 Installation

```bash
npm install contentstack-chat-widget
```

### Importing Styles

The SDK requires CSS styles to be imported in your application:

```tsx
// Import the CSS in your main app file (App.tsx, main.tsx, or index.tsx)
import 'contentstack-chat-widget/style.css';
```

**Note**: The CSS includes all necessary Tailwind CSS utilities and is bundled within the package, so you don't need to install Tailwind CSS separately.

## 📋 Prerequisites

You'll need:
- **ContentStack CMS account** with API access
- **ContentStack API Key** (Management or Delivery Token)
- **Backend service** running the ContentStack AI service (included in this repository)

## 🎬 Quick Start

```tsx
import React from 'react';
import { ChatWidget } from 'contentstack-chat-widget';
// Import the required CSS styles
import 'contentstack-chat-widget/style.css';

function App() {
  return (
    <div className="min-h-screen">
      <ChatWidget
        // ContentStack Configuration
        tenantId="your-tenant-id"
        apiKey="blt483a005c4ad32b09"
        
        // AI Provider (Developer Configuration)
        provider= 'gemini',
        model= 'gemini-2.5-flash',
        
        // UI Customization
        chatTitle="ContentStack Assistant"
        welcomeMessage="Hi! I can help you find anything on this website. What would you like to know?"
        placeholder="Ask me about this website..."
        
        // Positioning
        position="bottom-right"
        
        // Performance
        typingSpeed={15} // Fast ChatGPT-like typing
      />
    </div>
  );
}
```

## 🔧 Configuration Options

### Essential Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tenantId` | `string` | ✅ | Your ContentStack tenant identifier |
| `apiKey` | `string` | ✅ | ContentStack API key (Management/Delivery token) |
| `projectId` | `string` | ❌ | ContentStack project ID (optional for filtering) |

### AI Provider Configuration (Developer-Only)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `provider` | `'groq' \| 'gemini' \| 'openrouter'` | `'groq'` | AI provider for responses |
| `model` | `string` | `'llama-3.1-8b-instant'` | Specific model to use |

**Available Providers & Models:**
- **Groq**: `llama-3.1-8b-instant`, `llama-3.1-70b-versatile`
- **Gemini**: `gemini-2.5-flash`, `gemini-1.5-pro`
- **OpenRouter**: `openai/gpt-4o-mini`, `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`

### UI Customization Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Widget position on screen |
| `chatTitle` | `string` | `'ContentStack Assistant'` | Header title of chat widget |
| `placeholder` | `string` | `'Ask me anything...'` | Input placeholder text |
| `welcomeMessage` | `string` | `undefined` | Initial message shown to users |
| `typingSpeed` | `number` | `30` | Typing animation speed (milliseconds per character) |

### Behavior Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Control widget open/closed state externally |
| `onToggle` | `(isOpen: boolean) => void` | Callback when widget is opened/closed |
| `onMessage` | `(message: ChatMessage) => void` | Callback for each message sent/received |
| `className` | `string` | Additional CSS classes for the widget container |
| `style` | `React.CSSProperties` | Inline styles for widget container |

## 🎨 Theme Customization

Create beautiful, branded chat experiences:

```tsx
import { ChatWidget } from 'contentstack-chat-widget';

const customTheme = {
  primaryColor: '#0066cc',        // Your brand color
  secondaryColor: '#f0f4f8',      // Light background for messages
  backgroundColor: '#ffffff',      // Widget background
  textColor: '#2d3748',           // Text color
  userMessageColor: '#0066cc',    // User message bubble color
  assistantMessageColor: '#f7fafc', // AI message bubble color
  borderRadius: '16px',           // Rounded corners
  fontFamily: 'Inter, system-ui, sans-serif' // Custom font
};

function App() {
  return (
    <ChatWidget
      {...yourConfig}
      theme={customTheme}
      position="bottom-left"
      chatTitle="Your Brand Assistant"
      typingSpeed={20} // Slower, more deliberate typing
    />
  );
}
```

## 🔗 Backend Integration

This SDK requires a backend service running the ContentStack AI integration. The backend handles:

- **ContentStack MCP Server**: Connects to your ContentStack CMS
- **AI Processing**: Routes queries to your chosen LLM provider
- **Caching**: Redis-based caching for improved performance
- **Session Management**: Maintains conversation context

### Backend API Endpoint

By default, the SDK connects to `http://localhost:5002/api/contentstack/query`. You can customize this:

```tsx
<ChatWidget
  apiEndpoint="https://your-backend.com/api/contentstack/query"
  {...otherProps}
/>
```

## 💡 Real-World Usage Examples

### E-commerce Website
```tsx
<ChatWidget
  tenantId="ecommerce-site"
  apiKey="blt483a005c4ad32b09"
  provider="groq"
  model="llama-3.1-8b-instant"
  welcomeMessage="Hi! I can help you find products, check availability, and answer questions about our store."
  chatTitle="Shop Assistant"
  placeholder="Ask about products, shipping, returns..."
/>
```

### Documentation Site
```tsx
<ChatWidget
  tenantId="docs-site"
  apiKey="blt3535fd43f0763af7"
  provider="gemini"
  model="gemini-2.5-flash"
  welcomeMessage="I'm here to help you navigate our documentation. What are you looking for?"
  chatTitle="Docs Helper"
  placeholder="Search documentation..."
  typingSpeed={25}
/>
```

### News/Blog Website
```tsx
<ChatWidget
  tenantId="news-blog"
  apiKey="blt483a005c4ad32b09"
  provider="openrouter"
  model="openai/gpt-4o-mini"
  welcomeMessage="I can help you find articles, authors, and topics. What interests you?"
  chatTitle="Content Assistant"
  position="bottom-left"
/>
```

## 🛠️ Advanced Features

### Streaming Responses
- **Real-time typing**: Responses stream character by character like ChatGPT
- **Cancellable**: Users can stop responses mid-stream and ask new questions
- **Status updates**: Shows progress like "Analyzing your query..." and "Gathering content data..."

### Session Management
- **Conversation memory**: Maintains context throughout the chat session
- **Unique session IDs**: Each chat instance gets a unique session for proper isolation
- **Automatic cleanup**: Sessions reset on page refresh

### Content Intelligence
- **Smart content selection**: AI automatically chooses relevant ContentStack tools and content types
- **Media handling**: Properly displays images, videos, and other assets from ContentStack
- **Rich formatting**: Supports markdown, links, lists, and structured content

## 🏗️ TypeScript Support

Full TypeScript support with comprehensive type definitions:

```tsx
import { 
  ChatWidget, 
  ChatWidgetProps, 
  ChatMessage, 
  ChatWidgetTheme,
  DEFAULT_THEME 
} from 'contentstack-chat-widget';

// All props are fully typed
const props: ChatWidgetProps = {
  tenantId: "string",
  apiKey: "string", 
  provider: "groq" | "gemini" | "openrouter",
  // ... full IntelliSense support
};
```

## 🚀 Performance Optimizations

- **Peer Dependencies**: React is externalized to reduce bundle size
- **Tree Shaking**: Only imports what you use
- **Lazy Loading**: Chat interface loads on-demand
- **Caching**: Backend caches ContentStack responses for faster subsequent queries
- **Debounced Inputs**: Prevents excessive API calls during typing

## 📱 Mobile Experience

The chat widget is fully responsive:
- **Mobile-first design**: Optimized for touch interactions
- **Full-screen on mobile**: Provides better typing experience on small screens
- **Adaptive positioning**: Smart positioning that works on all screen sizes
- **Touch-friendly**: Large touch targets and smooth animations

## 🔧 Development

```bash
# Clone the repository
git clone https://github.com/NIKSH02/ContentStack-Chat-Agent.git
cd ContentStack-Chat-Agent/SDK

# Install dependencies
npm install

# Start development server
npm run dev

# Build library for production
npm run build

# Build TypeScript declarations
npm run build:types
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/NIKSH02/ContentStack-Chat-Agent/issues)
- **Documentation**: Full backend setup guide available in `/Backend/docs/`
- **Examples**: Check `/SDK/src/App.tsx` for implementation examples

---

**Built with ❤️ for the ContentStack community**
