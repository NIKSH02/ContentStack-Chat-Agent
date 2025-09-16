# ContentStack AI Integration

This document provides a comprehensive guide to the ContentStack AI integration that combines Groq LLM with ContentStack MCP (Model Context Protocol) for intelligent content management.

## 🚀 Overview

The ContentStack AI integration allows users to:
- Query ContentStack content using natural language
- Get AI-powered responses with real content data
- Create new content with AI assistance
- Manage content types and entries programmatically

## 🏗️ Architecture

```
User Query → ContentStack AI Service → MCP Server → ContentStack CMS
                     ↓
            Groq LLM Processing → AI Response with Content Context
```

### Components

1. **ContentStackAIService**: Main service that orchestrates AI + MCP integration
2. **ContentStackMCPService**: Manages MCP server instances for ContentStack communication
3. **ContentStackAIController**: API endpoints for external integration
4. **Groq LLM**: Natural language processing and response generation

## 🔧 Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# ContentStack Configuration
CONTENTSTACK_API_KEY=your_api_key_here
CONTENTSTACK_PROJECT_ID=your_project_id_here  # Optional

# Groq LLM Configuration
GROQ_API_KEY=your_groq_api_key_here
```

### 2. Install Dependencies

```bash
npm install @contentstack/mcp @modelcontextprotocol/sdk
```

### 3. Start the Server

```bash
npm run dev
```

## 📡 API Endpoints

### Base URL: `/api/contentstack`

#### 1. Health Check
```http
GET /api/contentstack/health
```

Response:
```json
{
  "success": true,
  "service": "ContentStack AI Service",
  "status": "operational",
  "capabilities": [
    "Natural language content queries",
    "Content type discovery",
    "AI-powered content creation"
  ]
}
```

#### 2. Process Natural Language Query
```http
POST /api/contentstack/query
```

Request Body:
```json
{
  "query": "Show me all blog posts about technology",
  "tenantId": "your-tenant-id",
  "apiKey": "your-contentstack-api-key",
  "projectId": "your-project-id",  // Optional
  "context": "Additional context for the query"  // Optional
}
```

Response:
```json
{
  "success": true,
  "response": "I found 5 blog posts about technology...",
  "contentData": { /* ContentStack data */ },
  "query": "Show me all blog posts about technology"
}
```

#### 3. Get Content Types
```http
POST /api/contentstack/content-types
```

Request Body:
```json
{
  "tenantId": "your-tenant-id",
  "apiKey": "your-contentstack-api-key",
  "projectId": "your-project-id"  // Optional
}
```

#### 4. Create Content with AI
```http
POST /api/contentstack/create-content
```

Request Body:
```json
{
  "tenantId": "your-tenant-id",
  "apiKey": "your-contentstack-api-key",
  "contentType": "blog_post",
  "prompt": "Create a blog post about sustainable living",
  "projectId": "your-project-id"  // Optional
}
```

#### 5. Cleanup MCP Instances
```http
POST /api/contentstack/cleanup
```

## 🧪 Testing

### Manual Testing

1. **Quick Test Script**:
```bash
npx ts-node test/contentstack-ai-test.ts
```

2. **API Testing with curl**:
```bash
curl -X POST http://localhost:3000/api/contentstack/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What content do you have?",
    "tenantId": "test-tenant",
    "apiKey": "your-api-key"
  }'
```

### Integration Testing

The integration automatically:
- Spawns MCP server processes per tenant
- Manages multiple ContentStack configurations
- Handles server lifecycle and cleanup
- Provides intelligent query analysis and routing

## 🔍 Query Types

The AI service automatically detects different query types:

### 1. Content Type Queries
```
"What content types are available?"
"Show me all available content types"
```

### 2. Content Search
```
"Find all blog posts"
"Show me products with price under $100"
"Search for articles about AI"
```

### 3. Specific Content Fetching
```
"Get the latest blog post"
"Show me featured products"
"Find news articles from this week"
```

### 4. General Queries
```
"What content do you have?"
"Tell me about this stack"
"How is the content organized?"
```

## 🛠️ Configuration Options

### MCP Configuration
```typescript
{
  apiKey: string;          // ContentStack API key
  projectId?: string;      // Optional project ID
  groups: 'launch' | 'cma' | 'both';  // API groups to enable
}
```

### AI Query Configuration
```typescript
{
  query: string;           // Natural language query
  tenantId: string;        // Unique tenant identifier
  apiKey: string;          // ContentStack API key
  projectId?: string;      // Optional project ID
  context?: string;        // Additional context for AI
}
```

## 🔐 Security Considerations

1. **API Key Management**: Store ContentStack API keys securely
2. **Tenant Isolation**: Each tenant has isolated MCP instances
3. **Process Management**: MCP servers are properly cleaned up
4. **Error Handling**: Graceful degradation when services are unavailable

## 🚦 Error Handling

The service provides robust error handling:

### MCP Server Failures
- Falls back to LLM-only responses
- Logs errors for debugging
- Continues operation without ContentStack data

### API Errors
- Returns structured error responses
- Includes debugging information
- Maintains service availability

### Example Error Response
```json
{
  "success": false,
  "error": "MCP server connection failed",
  "query": "original query",
  "details": "Connection timeout after 30s"
}
```

## 📊 Monitoring and Debugging

### Debug and Troubleshooting
The system provides built-in logging and error handling for monitoring MCP instance health and performance.
      "pid": 12345
    }
  ],
  "totalInstances": 1
}
```

### Cleanup for Maintenance
```http
POST /api/contentstack/cleanup
```

## 🎯 Use Cases

### 1. Content Discovery
"What blog posts do I have about machine learning?"

### 2. Content Analysis
"Summarize the key topics in my published articles"

### 3. Content Creation
"Create a product description for a sustainable water bottle"

### 4. Content Management
"Show me all draft content that needs review"

## 📈 Performance Considerations

1. **MCP Server Reuse**: Servers are cached per tenant
2. **Process Management**: Automatic cleanup prevents resource leaks
3. **Concurrent Handling**: Multiple queries can run simultaneously
4. **Caching Strategy**: Consider implementing response caching for frequently accessed content

## 🔄 Development Workflow

1. Update environment variables
2. Test with the provided test script
3. Make API calls to verify functionality
4. Monitor logs for any issues
5. Use cleanup endpoint for maintenance

## 📞 Support and Troubleshooting

### Common Issues

1. **MCP Server Won't Start**
   - Check ContentStack API key validity
   - Verify network connectivity
   - Ensure @contentstack/mcp package is installed

2. **Groq LLM Errors**
   - Verify GROQ_API_KEY is set
   - Check API quota and limits
   - Monitor for rate limiting

3. **Process Management Issues**
   - Use cleanup endpoint to reset
   - Check system process limits
   - Monitor memory usage

### Debug Mode

Set environment variable for verbose logging:
```bash
DEBUG=contentstack:mcp npm run dev
```

This integration provides a powerful foundation for AI-powered content management with ContentStack!
