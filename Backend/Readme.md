# Chat Agent Platform Backend

A TypeScript-based enterprise chat agent platform with multi-tenant support, JWT authentication, and multiple LLM providers.

## 🚀 Features

- **Multi-tenant Architecture**: Support multiple client websites/projects
- **JWT Authentication**: Secure user authentication with access and refresh tokens
- **Multiple LLM Providers**: Groq, Gemini, OpenRouter (Mistral + OpenAI models)
- **MongoDB Integration**: Robust data persistence with Mongoose ODM
- **API Key Management**: Secure API keys for tenant access
- **Chat Sessions**: Persistent chat conversations with analytics
- **Role-based Access Control**: Admin, Developer, and Viewer roles
- **Rate Limiting**: Configurable rate limits per tenant plan
- **TypeScript**: Full type safety and modern development experience

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/        # Business logic controllers
│   │   ├── authController.ts
│   │   ├── tenantController.ts
│   │   └── chatController.ts
│   ├── middleware/         # Express middleware
│   │   └── auth.ts
│   ├── models/            # MongoDB/Mongoose models
│   │   ├── User.ts
│   │   ├── Tenant.ts
│   │   ├── ChatSession.ts
│   │   ├── ApiKey.ts
│   │   └── index.ts
│   ├── routes/            # API route definitions
│   │   ├── auth.ts
│   │   ├── tenants.ts
│   │   ├── chat.ts
│   │   └── index.ts
│   ├── services/          # External service integrations
│   │   └── llm/
│   │       ├── groq.ts
│   │       ├── gemini.ts
│   │       ├── openrouter.ts
│   │       └── index.ts
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   │   ├── database.ts
│   │   └── jwt.ts
│   └── server.ts          # Main application entry point
├── dist/                  # Compiled JavaScript output
├── .env.example           # Environment variables template
├── package.json
└── tsconfig.json
```

## 🛠 Setup

### Prerequisites

- Node.js 18+
- MongoDB
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Environment Configuration:**
```bash
cp .env.example .env
```

Required environment variables:
```env
# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=*

# Database
MONGODB_URI=mongodb://localhost:27017/chat-agent

# JWT
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# LLM Providers
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
```

3. **Development:**
```bash
npm run dev
```

4. **Production:**
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Tenant Management
- `POST /api/tenants` - Create new tenant
- `GET /api/tenants` - Get user's tenants
- `GET /api/tenants/:id` - Get tenant details
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant
- `GET /api/tenants/:id/api-keys` - Get tenant API keys
- `POST /api/tenants/:id/api-keys` - Create new API key
- `DELETE /api/tenants/:id/api-keys/:keyId` - Delete API key

### Chat System
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/tenants/:tenantId/sessions` - Get chat sessions
- `GET /api/chat/sessions/:sessionId` - Get chat session
- `PUT /api/chat/sessions/:sessionId` - Update chat session
- `DELETE /api/chat/sessions/:sessionId` - Delete chat session
- `POST /api/chat/sessions/:sessionId/messages` - Send message
- `GET /api/chat/tenants/:tenantId/analytics` - Get chat analytics

### LLM Providers
- `GET /api/llm/providers` - Get available providers
- `POST /api/llm/test` - Test all providers (requires auth)

### Legacy
- `POST /api/chat` - Simple chat endpoint (tenant API key auth)

## 🔐 Authentication Methods

### 1. JWT Authentication (Users)
```javascript
// Header
Authorization: Bearer <access_token>
```

### 2. API Key Authentication (Tenants)
```javascript
// Header
X-API-Key: <tenant_api_key>
```

## 🏗 Architecture

### Multi-tenant Model
- **Users**: Individual developers/admins
- **Tenants**: Client websites/projects
- **API Keys**: Secure access tokens per tenant
- **Chat Sessions**: Isolated conversations per tenant

### LLM Integration
- **Groq**: Fast inference with Llama models
- **Gemini**: Google's powerful language model
- **OpenRouter**: Access to multiple models (Mistral, OpenAI, etc.)
- **Fallback**: Automatic provider switching on failures

### Data Models
- **User**: Authentication, profile, tenant associations
- **Tenant**: Multi-tenant configuration, settings, usage
- **ChatSession**: Conversation history and analytics
- **ApiKey**: Secure tenant access with permissions

## 🔧 Development

### Building
```bash
npm run build
```

### Testing LLM Providers
```bash
curl -X POST http://localhost:3001/api/llm/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### Database Models
All models include:
- TypeScript interfaces
- Mongoose schemas
- Validation rules
- Indexing for performance
- Audit fields (createdAt, updatedAt)

## 📊 Monitoring

- Health check: `GET /health`
- System status: `GET /status`
- Request logging with timestamps
- Error handling with proper HTTP codes
- Rate limiting per endpoint

## 🚀 Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Start the server:
```bash
npm start
```

## 🤝 Contributing

1. Follow TypeScript best practices
2. Use proper error handling
3. Add JSDoc comments for functions
4. Test endpoints with proper authentication
5. Update this README for new features

## 📝 License

MIT License - see LICENSE file for details.
