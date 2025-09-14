import { Request, Response } from 'express';
import ContentStackAIService, { ContentStackQuery, ContentStackResponse } from '../services/contentstackAI';

export interface ContentStackQueryRequest extends Request {
  body: {
    query: string;
    tenantId: string;
    apiKey: string;
    projectId?: string;
    context?: string;
  };
}

export interface CreateContentRequest extends Request {
  body: {
    tenantId: string;
    apiKey: string;
    contentType: string;
    prompt: string;
    projectId?: string;
  };
}

export interface GetContentTypesRequest extends Request {
  body: {
    tenantId: string;
    apiKey: string;
    projectId?: string;
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
      const { query, tenantId, apiKey, projectId, context } = req.body;

      // Validate required fields
      if (!query || !tenantId || !apiKey) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: query, tenantId, apiKey'
        });
        return;
      }

      // Process the query
      const queryData: ContentStackQuery = {
        query: query.trim(),
        tenantId,
        apiKey,
        projectId,
        context
      };

      console.log(`Processing ContentStack query for tenant: ${tenantId}`);
      
      const result: ContentStackResponse = await ContentStackAIService.processContentQuery(queryData);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          response: result.response,
          contentData: result.contentData,
          query: query
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
   * Get available content types from ContentStack
   * POST /api/contentstack/content-types
   */
  static async getContentTypes(req: GetContentTypesRequest, res: Response): Promise<void> {
    try {
      const { tenantId, apiKey, projectId } = req.body;

      // Validate required fields
      if (!tenantId || !apiKey) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: tenantId, apiKey'
        });
        return;
      }

      console.log(`Fetching content types for tenant: ${tenantId}`);
      
      const result: ContentStackResponse = await ContentStackAIService.getContentTypes(tenantId, apiKey, projectId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          contentTypes: result.contentData,
          message: 'Content types retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to retrieve content types'
        });
      }

    } catch (error: any) {
      console.error('ContentStack AI Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching content types',
        details: error.message
      });
    }
  }

  /**
   * Create new content with AI assistance
   * POST /api/contentstack/create-content
   */
  static async createContent(req: CreateContentRequest, res: Response): Promise<void> {
    try {
      const { tenantId, apiKey, contentType, prompt, projectId } = req.body;

      // Validate required fields
      if (!tenantId || !apiKey || !contentType || !prompt) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: tenantId, apiKey, contentType, prompt'
        });
        return;
      }

      console.log(`Creating AI-generated ${contentType} for tenant: ${tenantId}`);
      
      const result: ContentStackResponse = await ContentStackAIService.createContentWithAI(
        tenantId, 
        apiKey, 
        contentType, 
        prompt, 
        projectId
      );
      
      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.response,
          contentData: result.contentData,
          contentType,
          prompt
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Content creation failed',
          contentType,
          prompt
        });
      }

    } catch (error: any) {
      console.error('ContentStack AI Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while creating content',
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
        capabilities: [
          'Natural language content queries',
          'Content type discovery',
          'AI-powered content creation',
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
