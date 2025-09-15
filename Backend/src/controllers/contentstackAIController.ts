import { Request, Response } from 'express';
import ContentStackAIService, { ContentStackQuery, ContentStackResponse } from '../services/contentstackAI';

export interface ContentStackQueryRequest extends Request {
  body: {
    query: string;
    tenantId: string;
    apiKey: string;
    projectId?: string;
    context?: string;
    provider?: string;  // LLM provider for response generation
    model?: string;     // LLM model for response generation
  };
}



/**
 * ContentStack AI Controller
 * Handles API endpoints for AI-powered ContentStack interactions
 */
export class ContentStackAIController {

  /**
   * Process natural language queries about ContentStack content
   * POST /api/contentstack/query
   */
  static async processQuery(req: ContentStackQueryRequest, res: Response): Promise<void> {
    try {
      const { query, tenantId, apiKey, projectId, context, provider, model } = req.body;

      // Validate required fields
      if (!query || !tenantId || !apiKey) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: query, tenantId, apiKey'
        });
        return;
      }

      // Process the query with enhanced workflow
      const queryData: ContentStackQuery = {
        query: query.trim(),
        tenantId,
        apiKey,
        projectId,
        context,
        responseProvider: provider || 'groq',  // User's LLM choice for response generation
        responseModel: model || 'llama-3.3-70b-versatile'  // User's model choice
      };

      console.log(`🚀 Processing ContentStack query for tenant: ${tenantId}`);
      console.log(`🔍 Query: "${query}"`);
      console.log(`🤖 Tool Selection: Groq (fixed) | Response Generation: ${queryData.responseProvider}:${queryData.responseModel}`);
      
      const result: ContentStackResponse = await ContentStackAIService.processContentQuery(queryData);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          response: result.response,
          contentData: result.contentData,
          query: query,
          processingTime: result.processingTime || 'N/A',
          metadata: {
            toolSelectionProvider: 'groq',
            responseProvider: queryData.responseProvider,
            responseModel: queryData.responseModel
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Query processing failed',
          query: query
        });
      }

    } catch (error: any) {
      console.error('ContentStack AI Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while processing query',
        details: error.message
      });
    }
  }

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
   * Get active MCP instances (for debugging/monitoring)
   * GET /api/contentstack/instances
   */
  static async getActiveInstances(req: Request, res: Response): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { contentStackMCPManager } = await import('../services/contentstackMCP');
      
      const instances = contentStackMCPManager.getActiveInstances();
      const instanceInfo = Array.from(instances.entries()).map(([key, instance]) => ({
        tenantId: key,
        connected: instance.isServerConnected(),
        pid: instance.getServerPID()
      }));

      res.status(200).json({
        success: true,
        activeInstances: instanceInfo,
        totalInstances: instances.size
      });
    } catch (error: any) {
      console.error('ContentStack AI instances error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve instance information',
        details: error.message
      });
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
