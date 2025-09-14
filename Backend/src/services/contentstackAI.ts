import { ContentStackMCPService, contentStackMCPManager } from './contentstackMCP';
import * as groq from './llm/groq';
import { CleanMessage, LLMResult } from '../types';

export interface ContentStackQuery {
  query: string;
  tenantId: string;
  apiKey: string;
  projectId?: string;
  context?: string;
}

export interface ContentStackResponse {
  success: boolean;
  response: string;
  contentData?: any;
  error?: string;
}

/**
 * ContentStack AI Service
 * Combines Groq LLM with ContentStack MCP for intelligent content responses
 */
export class ContentStackAIService {

  /**
   * Process a natural language query about ContentStack content
   */
  static async processContentQuery(query: ContentStackQuery): Promise<ContentStackResponse> {
    try {
      console.log(`Processing ContentStack query: ${query.query}`);

      // Step 1: Get or create MCP instance
      const mcpConfig = {
        apiKey: query.apiKey,
        projectId: query.projectId,
        groups: 'cma' as 'launch' | 'cma' | 'both',  // Always use CMA for content operations
        region: 'EU' // EU region only as specified
      };

      const mcpService = contentStackMCPManager.getInstance(query.tenantId, mcpConfig);

      // Step 2: Start MCP server if not connected
      if (!mcpService.isServerConnected()) {
        await mcpService.startMCPServer();
        // Wait a bit for the server to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 3: Get available tools for intelligent selection
      const toolsResult = await mcpService.listAvailableTools();
      if (!toolsResult.success) {
        throw new Error('Failed to retrieve available tools');
      }
      console.log(`✅ Retrieved ${toolsResult.data.tools.length} available tools`);

      // Step 4: Enhanced LLM-driven tool selection
      const selectedTools = await this.selectToolsWithLLM(query.query, toolsResult.data.tools);
      console.log(`🤖 LLM selected ${selectedTools.length} tools:`, selectedTools.map(t => t.name));

      // Step 5: Execute selected tools and gather comprehensive data
      let multiToolData;
      try {
        multiToolData = await this.executeSelectedTools(selectedTools);
        console.log(`📊 Executed tools, results:`, Object.keys(multiToolData));
      } catch (error: any) {
        console.warn('Multi-tool execution failed, using fallback:', error.message);
        // Fallback to simple content fetch
        multiToolData = {
          'get_all_content_types': await mcpService.getContentTypes()
        };
      }

      // Step 6: Generate comprehensive AI response using all gathered data
      const enhancedResponse = await this.generateEnhancedAIResponse(
        query.query,
        multiToolData,
        query.tenantId
      );

      return {
        success: true,
        response: enhancedResponse,
        contentData: multiToolData
      };

    } catch (error: any) {
      console.error('ContentStack AI Service error:', error);
      return {
        success: false,
        response: 'I encountered an error while processing your request. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Analyze the user query to determine the best MCP action
   */
  private static async analyzeQuery(query: string): Promise<{
    action: 'fetch_entries' | 'search_content' | 'get_content_types' | 'general';
    contentType?: string;
    searchTerm?: string;
  }> {
    const lowerQuery = query.toLowerCase();

    // Check for content type queries
    if (lowerQuery.includes('content type') || lowerQuery.includes('what types') || lowerQuery.includes('available content')) {
      return { action: 'get_content_types' };
    }

    // Check for specific content type searches
    const contentTypes = ['blog', 'post', 'article', 'product', 'page', 'news', 'event'];
    for (const type of contentTypes) {
      if (lowerQuery.includes(type)) {
        return { 
          action: 'search_content', 
          contentType: type,
          searchTerm: this.extractSearchTerm(query, type)
        };
      }
    }

    // Check for search-like queries
    if (lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('show me')) {
      return { 
        action: 'search_content',
        searchTerm: this.extractSearchTerm(query)
      };
    }

    // Default to fetching entries
    return { action: 'fetch_entries' };
  }

  /**
   * Extract search terms from the query
   */
  private static extractSearchTerm(query: string, excludeWord?: string): string {
    let searchTerm = query;
    
    // Remove common words
    const removeWords = ['show me', 'find', 'search for', 'get', 'fetch', excludeWord].filter(Boolean);
    for (const word of removeWords) {
      searchTerm = searchTerm.replace(new RegExp(word!, 'gi'), '').trim();
    }
    
    return searchTerm || query;
  }

  /**
   * Enhanced LLM-driven tool selection
   */
  private static async selectToolsWithLLM(userQuery: string, availableTools: any[]): Promise<any[]> {
    const toolDescriptions = availableTools.map(tool => ({
      name: tool.name,
      description: tool.description
    }));

    const systemMessage = `You are an intelligent tool selector for ContentStack CMS. Based on the user's query, select the most appropriate tools to gather comprehensive information.

Available ContentStack tools:
${JSON.stringify(toolDescriptions, null, 2)}

For the query "${userQuery}", select 1-3 tools that would provide the most relevant information. Consider:
1. Start with content types if the user wants to understand the website structure
2. Get entries from relevant content types
3. Get assets if the query involves images or files
4. Get environments if deployment/publishing info is needed

Return ONLY a JSON array of tool names, like: ["get_all_content_types", "get_all_entries", "get_all_assets"]`;

    try {
      const result = await groq.sendToGroq([
        { role: 'system', content: systemMessage },
        { role: 'user', content: userQuery }
      ], 'llama-3.3-70b-versatile');

      const selectedToolNames = JSON.parse(result.content || '[]');
      return availableTools.filter(tool => selectedToolNames.includes(tool.name));
    } catch (error) {
      console.error('LLM tool selection failed, using fallback:', error);
      // Fallback to basic tool selection
      return [
        availableTools.find(t => t.name === 'get_all_content_types'),
        availableTools.find(t => t.name === 'get_all_entries')
      ].filter(Boolean);
    }
  }

  /**
   * Execute selected tools and gather data
   */
  private static async executeSelectedTools(selectedTools: any[]): Promise<any> {
    const results: any = {};

    for (const tool of selectedTools) {
      try {
        let params: any = {};

        // Set up parameters based on tool type
        if (tool.name === 'get_all_content_types') {
          params = { branch: 'main' };
        } else if (tool.name === 'get_all_entries') {
          params = { 
            content_type_uid: 'page', // Default to page content type
            limit: '10',
            include_count: true,
            branch: 'main'
          };
        } else if (tool.name === 'get_all_assets') {
          params = {
            limit: '10',
            include_count: true,
            branch: 'main'
          };
        } else if (tool.name === 'get_all_environments') {
          params = { include_count: true };
        }

        // Execute the tool via MCP
        const activeInstances = contentStackMCPManager.getActiveInstances();
        const mcpInstance = activeInstances.values().next().value;
        if (mcpInstance) {
          const result = await mcpInstance.sendRequest('tools/call', {
            name: tool.name,
            arguments: params
          });
          results[tool.name] = result;
        }
      } catch (error) {
        console.error(`Failed to execute tool ${tool.name}:`, error);
        results[tool.name] = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return results;
  }

  /**
   * Generate enhanced AI response using multiple data sources
   */
  private static async generateEnhancedAIResponse(
    userQuery: string,
    multiToolData: any,
    tenantId: string
  ): Promise<string> {
    
    let systemContext = `You are a knowledgeable ContentStack expert helping analyze website content and structure. `;
    
    // Build comprehensive context from multiple tool results
    const contextParts: string[] = [];
    
    for (const [toolName, result] of Object.entries(multiToolData)) {
      if (result && (result as any).success && (result as any).data) {
        contextParts.push(`\n=== ${toolName.replace(/_/g, ' ').toUpperCase()} ===\n${JSON.stringify((result as any).data, null, 2)}`);
      } else if (result && (result as any).error) {
        contextParts.push(`\n=== ${toolName.replace(/_/g, ' ').toUpperCase()} (ERROR) ===\n${(result as any).error}`);
      }
    }

    if (contextParts.length > 0) {
      systemContext += `\n\nContentStack Data:${contextParts.join('\n')}`;
    } else {
      systemContext += `\n\nNote: No ContentStack data was available for this query.`;
    }

    systemContext += `\n\nPlease provide a comprehensive, helpful response about the website based on the available ContentStack data. Be specific and reference the actual content when possible.`;

    try {
      const result = await groq.sendToGroq([
        { role: 'system', content: systemContext },
        { role: 'user', content: userQuery }
      ], 'llama-3.3-70b-versatile');

      return result.content || 'I apologize, but I couldn\'t generate a response based on the available data.';
    } catch (error) {
      console.error('Enhanced AI response generation failed:', error);
      // Fallback to basic response with raw data
      const dataString = Object.keys(multiToolData).length > 0 
        ? `Here's the available ContentStack data: ${JSON.stringify(multiToolData, null, 2)}`
        : 'Unable to retrieve ContentStack data at this time.';
      
      return `I encountered an issue generating the AI response, but ${dataString}`;
    }
  }

  /**
   * Generate AI response using Groq LLM with ContentStack context
   */
  private static async generateAIResponse(
    userQuery: string, 
    contentData: any, 
    additionalContext?: string
  ): Promise<LLMResult> {
    
    // Build context for the LLM
    let systemContext = `You are a helpful AI assistant with access to ContentStack content management data. `;
    
    if (contentData?.success && contentData.data) {
      systemContext += `\n\nContent from ContentStack:\n${JSON.stringify(contentData.data, null, 2)}`;
    } else if (contentData?.error) {
      systemContext += `\n\nNote: I couldn't fetch the latest content from ContentStack (${contentData.error}), but I can still help with general information.`;
    }

    if (additionalContext) {
      systemContext += `\n\nAdditional context: ${additionalContext}`;
    }

    systemContext += `\n\nPlease provide a helpful, accurate response based on the available content. If the content data is available, reference it in your response. If not, provide general guidance.`;

    const messages: CleanMessage[] = [
      {
        role: 'system',
        content: systemContext
      },
      {
        role: 'user',
        content: userQuery
      }
    ];

    // Use Groq LLM to generate response
    try {
      return await groq.sendToGroq(messages, 'llama-3.3-70b-versatile');
    } catch (groqError) {
      console.error('Groq LLM error:', groqError);
      // Fallback response with content data if available
      let fallbackResponse = 'I apologize, but the AI service is unavailable right now.';
      
      if (contentData?.success && contentData.data) {
        fallbackResponse = `Here's the raw data from ContentStack: ${JSON.stringify(contentData.data, null, 2)}`;
      } else if (contentData?.error) {
        fallbackResponse = `Unable to fetch content from ContentStack. Error: ${contentData.error}`;
      }
      
      return {
        success: true,
        content: fallbackResponse,
        error: 'LLM service unavailable, showing raw data',
        provider: 'groq'
      };
    }
  }

  /**
   * Get available content types for a stack
   */
  static async getContentTypes(tenantId: string, apiKey: string, projectId?: string): Promise<ContentStackResponse> {
    try {
      const mcpConfig = {
        apiKey,
        projectId,
        groups: 'cma' as 'launch' | 'cma' | 'both'  // Always use CMA for content operations
      };

      const mcpService = contentStackMCPManager.getInstance(tenantId, mcpConfig);

      if (!mcpService.isServerConnected()) {
        await mcpService.startMCPServer();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const result = await mcpService.getContentTypes();
      
      if (result.success) {
        return {
          success: true,
          response: 'Successfully retrieved content types.',
          contentData: result.data
        };
      } else {
        return {
          success: false,
          response: 'Failed to retrieve content types.',
          error: result.error
        };
      }
    } catch (error: any) {
      return {
        success: false,
        response: 'Error retrieving content types.',
        error: error.message
      };
    }
  }

  /**
   * Create new content with AI assistance
   */
  static async createContentWithAI(
    tenantId: string,
    apiKey: string,
    contentType: string,
    prompt: string,
    projectId?: string
  ): Promise<ContentStackResponse> {
    try {
      // First, use AI to generate the content structure
      const aiMessages: CleanMessage[] = [
        {
          role: 'system',
          content: `You are helping create content for ContentStack CMS. Generate a JSON structure for a ${contentType} based on the user's prompt. Include common fields like title, body/content, description, tags, etc. Return only valid JSON.`
        },
        {
          role: 'user',
          content: `Create a ${contentType} about: ${prompt}`
        }
      ];

      const aiResult = await groq.sendToGroq(aiMessages, 'llama-3.3-70b-versatile');
      
      if (!aiResult.content) {
        throw new Error('Failed to generate content structure');
      }

      // Parse AI-generated content
      let contentData;
      try {
        contentData = JSON.parse(aiResult.content);
      } catch (parseError) {
        // If JSON parsing fails, create a basic structure
        contentData = {
          title: `AI Generated ${contentType}`,
          description: prompt,
          body: aiResult.content
        };
      }

      // Create content in ContentStack
      const mcpConfig = {
        apiKey,
        projectId,
        groups: 'cma' as 'launch' | 'cma' | 'both'  // Always use CMA for content operations
      };

      const mcpService = contentStackMCPManager.getInstance(tenantId, mcpConfig);

      if (!mcpService.isServerConnected()) {
        await mcpService.startMCPServer();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const result = await mcpService.createContent(contentType, contentData);
      
      if (result.success) {
        return {
          success: true,
          response: `Successfully created ${contentType} with AI assistance.`,
          contentData: result.data
        };
      } else {
        return {
          success: false,
          response: `Failed to create ${contentType}.`,
          error: result.error
        };
      }
    } catch (error: any) {
      return {
        success: false,
        response: 'Error creating content with AI assistance.',
        error: error.message
      };
    }
  }

  /**
   * Stop all MCP instances (cleanup)
   */
  static async cleanup(): Promise<void> {
    const instances = contentStackMCPManager.getActiveInstances();
    for (const [key, instance] of instances) {
      await instance.stopMCPServer();
    }
  }
}

export default ContentStackAIService;
