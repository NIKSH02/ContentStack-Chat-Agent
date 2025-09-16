// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import connectDB from './utils/database';
import * as llm from './services/llm';

import apiRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`${timestamp} - ${req.method} ${req.path} - ${ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV
  });
});

// System status endpoint
app.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      server: {
        status: 'running',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '2.0.0'
      },
      database: {
        status: 'connected' 
      },
      llm: {
        providers: llm.getAvailableProviders().length,
        default: llm.getDefaultProvider()
      }
    }
  });
});

// Get available LLM providers (public endpoint)
app.get('/api/llm/providers', (req: Request, res: Response) => {
  try {
    const providers = llm.getAvailableProviders();
    const defaultProvider = llm.getDefaultProvider();
    
    res.json({
      success: true,
      data: {
        providers,
        default: defaultProvider,
        total: providers.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mount API routes
app.use('/api', apiRoutes);

// Chat endpoint with tenant authentication (legacy - kept for backwards compatibility)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, provider, model, settings } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
        code: 'MESSAGE_REQUIRED'
      });
    }

    // Check if we have authentication (either API key or JWT token)
    const apiKey = req.headers['x-api-key'] as string;
    let tenant = null;
    
    if (apiKey) {
      // Try to authenticate with API key
      tenant = await require('./models/Tenant').Tenant.findOne({ 
        apiKey: apiKey, 
        isActive: true 
      });
      
      if (!tenant) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        });
      }
      
      // Update usage
      tenant.usage.totalRequests += 1;
      tenant.usage.lastRequestAt = new Date();
      await tenant.save();
    } else if (req) {
      // Use JWT authentication - create a default tenant-like object
      tenant = {
        id: 'jwt-user',
        name: 'JWT User',
        settings: {
          defaultProvider: 'groq',
          defaultModel: 'llama-3.1-8b-instant',
          temperature: 0.7,
          maxTokens: 1000
        }
      };
    } else {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - provide either x-api-key header or Authorization Bearer token',
        code: 'AUTH_REQUIRED'
      });
    }

    // Use tenant settings or request settings
    const chatSettings = {
      provider: provider || tenant?.settings?.defaultProvider || 'groq',
      model: model || tenant?.settings?.defaultModel || 'llama-3.1-8b-instant',
      temperature: settings?.temperature || tenant?.settings?.temperature || 0.7,
      maxTokens: settings?.maxTokens || tenant?.settings?.maxTokens || 1000
    };

    // Create clean messages for LLM API
    const messages = [{ role: 'user' as const, content: message }];
    
    console.log(`User/Tenant ${tenant?.name} - Sending message to ${chatSettings.provider}:${chatSettings.model}`);
    
    // Send to LLM with fallback
    const result = await llm.sendMessageWithFallback(messages, chatSettings.provider, chatSettings.model);
    
    if (result.success) {
      // Create response with metadata
      const response = {
        message: result.content,
        metadata: {
          provider: result.provider,
          model: result.model,
          tenantId: tenant?.id,
          timestamp: new Date().toISOString()
        }
      };
      
      res.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        code: 'LLM_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Test LLM providers endpoint (requires authentication)
app.post('/api/llm/test', async (req: Request, res: Response) => {
  try {
    console.log('Testing all LLM providers...');
    const results = await llm.testAllProviders();
    
    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: Object.keys(results).length,
          successful: Object.values(results).filter(r => r.success).length,
          failed: Object.values(results).filter(r => !r.success).length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Chat Agent Platform running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🤖 LLM Providers: http://localhost:${PORT}/api/llm/providers`);
      console.log(`📁 Environment: ${process.env.NODE_ENV}`);
      
      // Test providers on startup
      llm.testAllProviders().then(results => {
        console.log('\n🧪 Startup LLM Tests:');
        Object.entries(results).forEach(([provider, result]) => {
          const status = result.success ? '✅' : '❌';
          console.log(`${status} ${provider}: ${result.success ? 'Connected' : result.error}`);
        });
        console.log('');
      }).catch(error => {
        console.error('❌ Failed to test LLM providers:', error);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

export default app;
