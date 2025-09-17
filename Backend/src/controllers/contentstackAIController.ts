import { Request, Response } from 'express';
import ContentStackAIService, { ContentStackQuery } from '../services/contentstackAI';

export interface ContentStackQueryRequest extends Request {
  body: {
    query: string;
    tenantId: string;
    apiKey: string;
    projectId?: string;
    context?: string;
    provider?: string;  // LLM provider for response generation
    model?: string;     // LLM model for response generation
    sessionId?: string; // Session ID for conversation memory
  };
}



/**
 * ContentStack AI Controller
 * Handles API endpoints for AI-powered ContentStack interactions
 */
export class ContentStackAIController {

  /**
   * Health check for ContentStack AI service
   * GET /api/contentstack/health
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        service: 'ContentStack AI Service',
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: '2.0.0-enhanced',
        capabilities: [
          'Enhanced LLM-driven tool selection (Groq)',
          'Multi-tool MCP execution',
          'Intelligent ContentStack analysis',
          'Natural language content queries',
          'User-selectable response generation (Groq/Gemini/OpenRouter)',
          'Multi-tenant MCP management'
        ]
      });
    } catch (error: any) {
      console.error('ContentStack AI health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        details: error.message
      });
    }
  }

  /**
   * Process natural language queries with streaming response
   * POST /api/contentstack/query-stream
   */
  static async processQueryStream(req: ContentStackQueryRequest, res: Response): Promise<void> {
    try {
      const { query, tenantId, apiKey, projectId, context, provider, model, sessionId } = req.body;

      // Validation
      if (!query || !tenantId || !apiKey) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: query, tenantId, and apiKey are required'
        });
        return;
      }

      // Set up Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      console.log(`🚀 Processing streaming ContentStack query for tenant: ${tenantId}`);
      console.log(`🔍 Query: "${query}"`);
      console.log(`🤖 Streaming with: ${provider || 'groq'}:${model || 'llama-3.3-70b-versatile'}`);
      console.log(`🧠 Session ID: ${sessionId || 'not provided'}`);

      const queryData: ContentStackQuery = {
        query,
        tenantId,
        apiKey,
        projectId,
        context,
        responseProvider: provider || 'groq',
        responseModel: model || 'llama-3.3-70b-versatile',
        sessionId
      };

      // Send initial event
      res.write(`data: ${JSON.stringify({
        type: 'start',
        message: 'Processing your request...'
      })}\n\n`);

      // Process the query with streaming and status updates
      await ContentStackAIService.processContentQueryStreamWithStatus(queryData, 
        (chunk: string) => {
          // Send each chunk as it arrives
          res.write(`data: ${JSON.stringify({
            chunk: chunk
          })}\n\n`);
        },
        (status: string) => {
          // Send status updates during processing
          res.write(`data: ${JSON.stringify({
            type: 'status',
            message: status
          })}\n\n`);
        }
      );

      // Send completion event
      res.write(`data: ${JSON.stringify({
        type: 'complete'
      })}\n\n`);

      res.end();

    } catch (error: any) {
      console.error('ContentStack AI Streaming Controller error:', error);
      
      // Send error event
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'I apologize, but I encountered an error while processing your request. Please try again.'
      })}\n\n`);
      
      res.end();
    }
  }

  /**
   * Cleanup MCP instances (for maintenance)
   * POST /api/contentstack/cleanup
   */
  static async cleanup(req: Request, res: Response): Promise<void> {
    try {
      console.log('Starting ContentStack AI cleanup...');
      await ContentStackAIService.cleanup();
      
      res.status(200).json({
        success: true,
        message: 'ContentStack AI services cleaned up successfully'
      });
    } catch (error: any) {
      console.error('ContentStack AI cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Cleanup failed',
        details: error.message
      });
    }
  }
}

export default ContentStackAIController;
