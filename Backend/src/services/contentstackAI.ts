import { ContentStackMCPService, contentStackMCPManager } from './contentstackMCP';
import { redisCacheService } from './redisCache';
import * as groq from './llm/groq';
import * as llm from './llm';  // Full LLM service for user provider choice
import { CleanMessage, LLMResult } from '../types';
import { conversationMemory, ConversationMessage } from './conversationMemory';

export interface ContentStackQuery {
  query: string;
  tenantId: string;
  apiKey: string;
  projectId?: string;
  context?: string;
  responseProvider?: string;  // LLM provider for response generation (user choice)
  responseModel?: string;     // LLM model for response generation (user choice)
  sessionId?: string;         // Session ID for conversation memory
}

export interface ContentStackResponse {
  success: boolean;
  response: string;
  contentData?: any;
  error?: string;
  processingTime?: string;
  toolSelectionProvider?: string;
  responseProvider?: string;
}

/**
 * ContentStack AI Service
 * Combines Groq LLM with ContentStack MCP for intelligent content responses
 */
export class ContentStackAIService {

  /**
   * Process a natural language query about ContentStack content with streaming response
   */
  static async processContentQueryStream(
    query: ContentStackQuery, 
    onChunk: (chunk: string) => void
  ): Promise<void> {
    return this.processContentQueryStreamWithStatus(query, onChunk, () => {});
  }

  /**
   * Process a natural language query with streaming response and status updates
   */
  static async processContentQueryStreamWithStatus(
    query: ContentStackQuery, 
    onChunk: (chunk: string) => void,
    onStatus: (status: string) => void
  ): Promise<void> {
    try {
      console.log(`Processing ContentStack streaming query: ${query.query}`);
      onStatus('🔍 Analyzing your query...');

      // Step 1: Get or create MCP instance
      onStatus('🔧 Connecting to ContentStack...');
      const mcpConfig = {
        apiKey: query.apiKey,
        projectId: query.projectId,
        groups: 'cma' as 'launch' | 'cma' | 'both',
        region: 'EU'
      };

      const mcpService = contentStackMCPManager.getInstance(query.tenantId, mcpConfig);

      // Step 2: Ensure MCP server is properly connected and validated
      onStatus('⚡ Starting content service...');
      
      // Always restart MCP server to avoid stale connections
      if (mcpService.isServerConnected()) {
        console.log('🔄 Restarting MCP server to ensure fresh connection...');
        await mcpService.stopMCPServer();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
      }
      
      await mcpService.startMCPServer();
      await new Promise(resolve => setTimeout(resolve, 3000)); // Longer wait for stability
      
      // Validate MCP server is working by testing tools list
      try {
        const testResult = await mcpService.sendRequest('tools/list', {});
        if (!testResult.success) {
          throw new Error('MCP server validation failed');
        }
        console.log('✅ MCP server validation successful');
      } catch (error) {
        console.error('❌ MCP server validation failed:', error);
        throw new Error('MCP server not responding properly');
      }

      // Step 3: Get available tools for intelligent selection (with caching)
      onStatus('🛠️ Loading content tools...');
      
      // 🚀 Try cache first, fallback to MCP if not found
      let toolsResult: any;
      const cachedTools = await redisCacheService.get(query.tenantId, query.apiKey, 'tools_list');
      
      if (cachedTools) {
        toolsResult = { success: true, data: cachedTools };
        console.log('🎯 Using cached tools list');
      } else {
        toolsResult = await mcpService.listAvailableTools();
        // Cache successful result
        if (toolsResult.success && toolsResult.data) {
          redisCacheService.set(query.tenantId, query.apiKey, 'tools_list', toolsResult.data);
        }
      }
      if (!toolsResult.success) {
        const errorMsg = `I'm having trouble connecting to ContentStack. This might be due to an invalid Stack API key or network issues. Error: ${toolsResult.error || 'Unknown error'}. Please check your API key and try again.`;
        console.error('Tools list failed:', toolsResult.error);
        onChunk(errorMsg);
        return;
      }

      // Step 4: Get content types FIRST for intelligent content-aware selection (with caching)
      onStatus('📋 Analyzing content structure...');
      let contentTypes: any[] = [];
      try {
        // 🚀 Try cache first, fallback to MCP if not found
        let contentTypesResult: any;
        const cachedContentTypes = await redisCacheService.get(query.tenantId, query.apiKey, 'get_all_content_types');
        
        if (cachedContentTypes) {
          contentTypesResult = { success: true, data: cachedContentTypes };
          console.log('🎯 Using cached content types');
        } else {
          contentTypesResult = await mcpService.sendRequest('tools/call', {
            name: 'get_all_content_types',
            arguments: { branch: 'main' }
          });
          console.log('🔍 Raw content types response:', JSON.stringify(contentTypesResult, null, 2));
          // Cache successful result
          if (contentTypesResult.success && contentTypesResult.data) {
            redisCacheService.set(query.tenantId, query.apiKey, 'get_all_content_types', contentTypesResult.data);
          }
        }
        
        if (contentTypesResult.success && contentTypesResult.data) {
          // Parse content types data
          let contentTypesData = contentTypesResult.data;
          console.log('🔍 Content types data structure:', JSON.stringify(contentTypesData, null, 2));
          
          if (contentTypesData.content && Array.isArray(contentTypesData.content)) {
            console.log('🔍 Found content array with', contentTypesData.content.length, 'items');
            try {
              contentTypes = contentTypesData.content.map((item: any) => {
                if (item.type === 'text' && item.text) {
                  try {
                    return JSON.parse(item.text);
                  } catch {
                    return item.text;
                  }
                }
                return item;
              });
              console.log('🔍 Mapped content types:', contentTypes);
              contentTypes = contentTypes[0]?.content_types || contentTypes;
              console.log('🔍 Final content types after extraction:', contentTypes);
            } catch (e) {
              console.log('🔍 Error parsing content, using fallback:', e);
              contentTypes = contentTypesData.content_types || [];
            }
          } else {
            console.log('🔍 No content array found, checking for direct content_types');
            contentTypes = contentTypesData.content_types || [];
          }
        }
        console.log(`📋 Found ${contentTypes.length} content types:`, contentTypes.map((ct: any) => ct.uid || ct.name).join(', '));
      } catch (error) {
        console.warn('Failed to get content types, proceeding without them:', error);
        contentTypes = [];
      }

      // Step 5: Enhanced LLM-driven tool AND content-type selection
      onStatus('🤖 Selecting relevant content sources...');
      const { selectedTools, selectedContentTypes } = await this.selectToolsAndContentTypesWithLLM(
        query.query, 
        toolsResult.data.tools, 
        contentTypes
      );

      console.log(`🤖 LLM selected ${selectedTools.length} tools:`, selectedTools.map((t: any) => t.name));
      console.log(`📋 LLM selected content types:`, selectedContentTypes);

      // Step 6: Execute selected tools with content-type awareness
      onStatus('📊 Gathering content data...');
      let multiToolData;
      try {
        multiToolData = await this.executeSelectedToolsWithContentTypes(selectedTools, selectedContentTypes, query.tenantId, query.apiKey, mcpService);
        console.log(`📊 Executed tools, results:`, Object.keys(multiToolData));
      } catch (error: any) {
        console.warn('Multi-tool execution failed, trying fallback:', error.message);
        try {
          // Fallback to basic content types and page entries
          multiToolData = {
            'get_all_content_types': await mcpService.getContentTypes(),
            'get_all_entries_page': await mcpService.sendRequest('tools/call', {
              name: 'get_all_entries',
              arguments: {
                content_type_uid: 'page',
                limit: '10',
                include_count: true,
                branch: 'main'
              }
            })
          };
          
          // Check if fallback also failed
          if (multiToolData.get_all_content_types && !multiToolData.get_all_content_types.success) {
            throw new Error(multiToolData.get_all_content_types.error || 'ContentStack connection failed');
          }
        } catch (fallbackError: any) {
          console.error('Fallback also failed:', fallbackError.message);
          onChunk(`I'm unable to retrieve content from ContentStack. This usually indicates an API key issue or connectivity problem. Error details: ${fallbackError.message}. Please verify your Stack API key is correct and try again.`);
          return;
        }
      }

      // Check if we have any meaningful data
      console.log('🔍 Debug - multiToolData:', Object.keys(multiToolData || {}));
      console.log('🔍 Debug - first tool result:', multiToolData ? multiToolData[Object.keys(multiToolData)[0]] : 'no data');
      
      const hasValidData = multiToolData && Object.keys(multiToolData).some(key => 
        multiToolData[key] && multiToolData[key].success && multiToolData[key].data
      );

      if (!hasValidData) {
        console.warn('⚠️ No valid content data available, providing informative response');
        onChunk(`I apologize, but I'm currently unable to retrieve specific content from this website. This could be due to:

- API rate limiting (we're receiving high traffic)
- Temporary connectivity issues with the content service
- Configuration issues with the content management system

**What you can try:**
- Wait a moment and try your question again
- Ask about general website topics or navigation
- Try a more specific question about particular content you're looking for

I'm designed to help you find information about this website's content, products, and services. Once the content service is available again, I'll be able to provide detailed, accurate information directly from the website.`);
        return;
      }

      // Step 6: Generate streaming AI response using user's chosen LLM provider
      onStatus('✨ Generating your response...');
      
      // Add user message to conversation memory (can be done in parallel)
      if (query.sessionId) {
        conversationMemory.addMessage(query.sessionId, query.tenantId, 'user', query.query);
      }

      let assistantResponse = '';
      
      await this.generateEnhancedAIResponseStream(
        query.query,
        multiToolData,
        query.tenantId,
        (chunk: string) => {
          assistantResponse += chunk;
          onChunk(chunk);
        },
        query.responseProvider || 'groq',
        query.responseModel || 'llama-3.1-8b-instant',
        query.sessionId
      );

      // Step 8: Add complete assistant response to conversation memory
      if (query.sessionId && assistantResponse) {
        conversationMemory.addMessage(query.sessionId, query.tenantId, 'assistant', assistantResponse);
      }

    } catch (error: any) {
      console.error('ContentStack streaming service error:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'I encountered an error while processing your request. ';
      
      if (error.message?.includes('API key') || error.message?.includes('authentication')) {
        errorMessage += 'This appears to be an authentication issue. Please verify your ContentStack API key is correct.';
      } else if (error.message?.includes('timeout') || error.message?.includes('connection')) {
        errorMessage += 'There seems to be a connectivity issue with ContentStack. Please try again in a moment.';
      } else if (error.message?.includes('MCP') || error.message?.includes('server')) {
        errorMessage += 'The ContentStack service is having issues. Please wait a moment and try again.';
      } else {
        errorMessage += `Error details: ${error.message}. Please try again or contact support if this persists.`;
      }
      
      onChunk(errorMessage);
    }
  }

  /**
   * Analyze the user query to determine the best MCP action
   */
  // private static async analyzeQuery(query: string): Promise<{
  //   action: 'fetch_entries' | 'search_content' | 'get_content_types' | 'general';
  //   contentType?: string;
  //   searchTerm?: string;
  // }> {
  //   const lowerQuery = query.toLowerCase();

  //   // Check for content type queries
  //   if (lowerQuery.includes('content type') || lowerQuery.includes('what types') || lowerQuery.includes('available content')) {
  //     return { action: 'get_content_types' };
  //   }

  //   // Check for specific content type searches
  //   const contentTypes = ['blog', 'post', 'article', 'product', 'page', 'news', 'event'];
  //   for (const type of contentTypes) {
  //     if (lowerQuery.includes(type)) {
  //       return { 
  //         action: 'search_content', 
  //         contentType: type,
  //         searchTerm: this.extractSearchTerm(query, type)
  //       };
  //     }
  //   }

  //   // Check for search-like queries
  //   if (lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('show me')) {
  //     return { 
  //       action: 'search_content',
  //       searchTerm: this.extractSearchTerm(query)
  //     };
  //   }

  //   // Default to fetching entries
  //   return { action: 'fetch_entries' };
  // }

  // /**
  //  * Extract search terms from the query
  //  */
  // private static extractSearchTerm(query: string, excludeWord?: string): string {
  //   let searchTerm = query;
    
  //   // Remove common words
  //   const removeWords = ['show me', 'find', 'search for', 'get', 'fetch', excludeWord].filter(Boolean);
  //   for (const word of removeWords) {
  //     searchTerm = searchTerm.replace(new RegExp(word!, 'gi'), '').trim();
  //   }
    
  //   return searchTerm || query;
  // }

  /**
   * Process and enhance content data for better media handling
   */
  private static processContentForMediaHandling(contentData: any): any {
    if (!contentData) return contentData;

    try {
      // If it's a string, try to parse as JSON
      if (typeof contentData === 'string') {
        contentData = JSON.parse(contentData);
      }

      // Process entries to enhance media fields
      if (contentData.entries && Array.isArray(contentData.entries)) {
        contentData.entries = contentData.entries.map((entry: any) => {
          const processedEntry = { ...entry };
          
          // Look for common image/media fields and mark them for special handling
          Object.keys(processedEntry).forEach(key => {
            const value = processedEntry[key];
            
            // Detect image/asset fields
            if (this.isImageAssetField(key, value)) {
              processedEntry[`_formatted_${key}`] = this.formatMediaField(value);
            }
            
            // Detect rich text fields that might contain images
            if (this.isRichTextField(key, value)) {
              processedEntry[`_formatted_${key}`] = this.formatRichTextWithMedia(value);
            }
          });
          
          return processedEntry;
        });
      }

      // Process assets to ensure proper formatting
      if (contentData.assets && Array.isArray(contentData.assets)) {
        contentData.assets = contentData.assets.map((asset: any) => ({
          ...asset,
          _display_format: this.getAssetDisplayFormat(asset)
        }));
      }

      return contentData;
    } catch (error) {
      console.warn('Error processing content for media handling:', error);
      return contentData;
    }
  }

  /**
   * Check if a field contains image/asset data
   */
  private static isImageAssetField(fieldName: string, value: any): boolean {
    const imageFieldPatterns = [
      /image/i, /photo/i, /picture/i, /banner/i, /hero/i, 
      /thumbnail/i, /avatar/i, /logo/i, /icon/i, /gallery/i,
      /media/i, /asset/i, /file/i
    ];
    
    const fieldMatches = imageFieldPatterns.some(pattern => pattern.test(fieldName));
    
    // Check if value structure indicates an asset
    const valueIndicatesAsset = value && (
      (typeof value === 'object' && (value.url || value.href || value.filename)) ||
      (typeof value === 'string' && (value.includes('http') || value.includes('.jpg') || value.includes('.png')))
    );
    
    return fieldMatches || valueIndicatesAsset;
  }

  /**
   * Check if field contains rich text that might have embedded media
   */
  private static isRichTextField(fieldName: string, value: any): boolean {
    const richTextPatterns = [/content/i, /body/i, /description/i, /text/i, /rich/i];
    const fieldMatches = richTextPatterns.some(pattern => pattern.test(fieldName));
    
    const valueIndicatesRichText = typeof value === 'string' && 
      (value.includes('<img') || value.includes('![') || value.includes('http'));
    
    return fieldMatches && valueIndicatesRichText;
  }

  /**
   * Format media field for display
   */
  private static formatMediaField(value: any): string {
    if (!value) return '';
    
    if (typeof value === 'string') {
      if (this.isImageUrl(value)) {
        return `![Image](${value})`;
      }
      return `[📄 File](${value})`;
    }
    
    if (typeof value === 'object') {
      const url = value.url || value.href || value.src;
      const title = value.title || value.alt || value.filename || 'Media';
      
      if (url && this.isImageUrl(url)) {
        return `![${title}](${url})`;
      } else if (url) {
        return `[📄 ${title}](${url})`;
      }
    }
    
    return '';
  }

  /**
   * Format rich text content with embedded media
   */
  private static formatRichTextWithMedia(value: string): string {
    if (!value || typeof value !== 'string') return value;
    
    // Convert HTML img tags to markdown
    let formatted = value.replace(
      /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, 
      '![$2]($1)'
    );
    
    // Convert HTML img tags without alt
    formatted = formatted.replace(
      /<img[^>]+src="([^"]+)"[^>]*>/g, 
      '![Image]($1)'
    );
    
    return formatted;
  }

  /**
   * Check if URL is likely an image
   */
  private static isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('image') || lowerUrl.includes('photo');
  }

  /**
   * Get proper display format for asset
   */
  private static getAssetDisplayFormat(asset: any): string {
    if (!asset) return '';
    
    const url = asset.url || asset.href;
    const title = asset.title || asset.filename || 'Asset';
    const contentType = asset.content_type || asset.type || '';
    
    if (!url) return title;
    
    if (contentType.includes('image') || this.isImageUrl(url)) {
      return `![${title}](${url})`;
    } else if (contentType.includes('video')) {
      return `[🎥 ${title}](${url})`;
    } else if (contentType.includes('pdf') || contentType.includes('document')) {
      return `[📄 ${title}](${url})`;
    } else {
      return `[📎 ${title}](${url})`;
    }
  }

  /**
   * Estimate token count for content (rough approximation)
   */
  private static estimateTokens(content: string): number {
    // Rough estimation: ~4 characters per token for English text
    // JSON tends to be more dense, so use ~3 characters per token
    return Math.ceil(content.length / 3);
  }

  /**
   * Intelligently summarize large data while preserving key information
   */
  private static summarizeContentData(data: any, maxTokens: number = 5000): string {
    if (!data) return '';

    try {
      // Convert to JSON string first
      const jsonString = JSON.stringify(data, null, 2);
      
      // If it's already small enough, return as is
      if (this.estimateTokens(jsonString) <= maxTokens) {
        return jsonString;
      }

      console.log(`📊 Large content detected (${this.estimateTokens(jsonString)} tokens), summarizing for ${maxTokens} token limit...`);

      // For very small limits (Groq with 6K TPM), use ultra-compact format
      if (maxTokens <= 300) {
        let ultraCompact = '';
        
        if (data.content_types && Array.isArray(data.content_types)) {
          const types = data.content_types.slice(0, 3).map((ct: any) => ct.title || ct.uid).join(', ');
          ultraCompact += `Types[${data.content_types.length}]: ${types}${data.content_types.length > 3 ? '...' : ''}; `;
        }
        
        if (data.entries && Array.isArray(data.entries)) {
          const entries = data.entries.slice(0, 2).map((e: any) => e.title || e.uid || 'Entry').join(', ');
          ultraCompact += `Entries[${data.entries.length}]: ${entries}${data.entries.length > 2 ? '...' : ''}; `;
        }
        
        if (data.assets && Array.isArray(data.assets)) {
          const assets = data.assets.slice(0, 2).map((a: any) => a.title || a.filename || 'Asset').join(', ');
          ultraCompact += `Assets[${data.assets.length}]: ${assets}${data.assets.length > 2 ? '...' : ''}`;
        }
        
        const result = ultraCompact.trim() || 'Content available but too large to display';
        console.log(`🔥 Ultra-compact format: ${result} (${this.estimateTokens(result)} tokens)`);
        return result;
      }

      // Build a smart summary instead of raw JSON dump
      let summary = '';

      if (data.content_types && Array.isArray(data.content_types)) {
        summary += `Content Types Available (${data.content_types.length}):\n`;
        data.content_types.slice(0, 10).forEach((ct: any, i: number) => {
          summary += `${i + 1}. ${ct.title || ct.uid} - ${ct.description || 'No description'}\n`;
        });
        if (data.content_types.length > 10) {
          summary += `... and ${data.content_types.length - 10} more content types\n`;
        }
        summary += '\n';
      }

      if (data.entries && Array.isArray(data.entries)) {
        summary += `Content Entries Found (${data.entries.length}):\n`;
        data.entries.slice(0, 8).forEach((entry: any, i: number) => {
          const title = entry.title || entry.name || entry.uid || `Entry ${i + 1}`;
          const description = entry.description || entry.summary || '';
          summary += `${i + 1}. **${title}**`;
          if (description) summary += ` - ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`;
          
          // Add key fields that might contain images
          const keyFields = Object.keys(entry).filter(key => 
            !['uid', 'created_at', 'updated_at', '_version', 'ACL', 'locale'].includes(key) &&
            entry[key] && typeof entry[key] === 'string' && entry[key].length < 200
          ).slice(0, 3);
          
          if (keyFields.length > 0) {
            summary += `\n   Fields: ${keyFields.map(field => `${field}: ${entry[field]}`).join(', ')}`;
          }
          
          // Check for image/media fields and format them properly
          Object.keys(entry).forEach(fieldKey => {
            if (this.isImageAssetField(fieldKey, entry[fieldKey])) {
              const imageFormatted = this.formatMediaField(entry[fieldKey]);
              if (imageFormatted) {
                summary += `\n   ${fieldKey}: ${imageFormatted}`;
              }
            }
          });
          
          summary += '\n';
        });
        if (data.entries.length > 8) {
          summary += `... and ${data.entries.length - 8} more entries\n`;
        }
        summary += '\n';
      }

      if (data.assets && Array.isArray(data.assets)) {
        summary += `Media Assets Found (${data.assets.length}):\n`;
        data.assets.slice(0, 6).forEach((asset: any, i: number) => {
          const title = asset.title || asset.filename || `Asset ${i + 1}`;
          const type = asset.content_type || 'Unknown type';
          const url = asset.url || '';
          
          summary += `${i + 1}. **${title}** (${type})`;
          if (url && this.isImageUrl(url)) {
            summary += ` ![${title}](${url})`;
          } else if (url) {
            summary += ` [📄 Download](${url})`;
          }
          summary += '\n';
        });
        if (data.assets.length > 6) {
          summary += `... and ${data.assets.length - 6} more assets\n`;
        }
        summary += '\n';
      }

      // Add any other important fields as summaries
      Object.keys(data).forEach(key => {
        if (!['content_types', 'entries', 'assets'].includes(key) && data[key]) {
          if (Array.isArray(data[key])) {
            summary += `${key}: ${data[key].length} items\n`;
          } else if (typeof data[key] === 'object') {
            summary += `${key}: ${Object.keys(data[key]).length} properties\n`;
          } else {
            summary += `${key}: ${String(data[key]).substring(0, 100)}\n`;
          }
        }
      });

      // Ensure we stay under the token limit
      if (this.estimateTokens(summary) > maxTokens) {
        summary = summary.substring(0, maxTokens * 3) + '\n\n[Content truncated for length...]';
      }

      return summary;

    } catch (error) {
      console.error('Error summarizing content:', error);
      return `Content available but couldn't be properly formatted (${Object.keys(data).join(', ')})`;
    }
  }

  /**
   * Filter tools to exclude any modification/write operations - READ-ONLY system
   */
  private static filterReadOnlyTools(availableTools: any[]): any[] {
    const FORBIDDEN_OPERATIONS = [
      'create', 'update', 'delete', 'publish', 'unpublish', 'deploy', 
      'add', 'remove', 'merge', 'clone', 'localize', 'unlocalize'
    ];

    // SIMPLIFIED APPROACH: Only allow get_all_* tools that don't require specific IDs
    const ALLOWED_TOOLS = [
      // Content & Structure
      'get_all_content_types',
      'get_all_entries', 
      'get_all_assets',
      
      // Taxonomies & Terms  
      'get_all_taxonomies',
      'get_all_terms',
      'get_all_terms_across_all_taxonomies',
      
      // System & Configuration
      'get_all_languages',
      'get_all_branches', 
      'get_all_branch_aliases',
      'get_all_global_fields',
      'get_all_releases',
      'get_all_items_in_a_release',
      'get_all_variants_of_a_content_type',
      'get_all_environments',
      
      // Specialized Gets
      'get_publish_queue',
      'export_a_taxonomy'
    ];

    // EXCLUDED: All single/specific ID-required tools
    // 'get_single_entry', 'get_a_single_asset', 'get_a_single_taxonomy', etc.
    // These require specific IDs that we don't have and are complex to implement

    // Filter out any tools that contain forbidden operations
    const safeTools = availableTools.filter(tool => {
      const toolName = tool.name.toLowerCase();
      const toolDesc = (tool.description || '').toLowerCase();
      
      // Check if tool name or description contains forbidden operations
      const hasForbiddenOperation = FORBIDDEN_OPERATIONS.some(op => 
        toolName.includes(op) || toolDesc.includes(op)
      );
      
      // Also ensure it's in our explicit allowed list
      const isExplicitlyAllowed = ALLOWED_TOOLS.includes(tool.name);
      
      if (hasForbiddenOperation && !isExplicitlyAllowed) {
        console.log(`🚫 Excluding modification tool: ${tool.name} (${tool.description})`);
        return false;
      }
      
      return isExplicitlyAllowed;
    });

    console.log(`✅ Filtered to ${safeTools.length} read-only tools from ${availableTools.length} total tools`);
    return safeTools;
  }

  /**
   * Enhanced LLM-driven tool AND content-type selection - READ-ONLY OPERATIONS ONLY
   */
  private static async selectToolsAndContentTypesWithLLM(
    userQuery: string, 
    availableTools: any[], 
    availableContentTypes: any[]
  ): Promise<{ selectedTools: any[], selectedContentTypes: any[] }> {
    // CRITICAL SECURITY: Filter out ALL modification tools
    const safeTools = this.filterReadOnlyTools(availableTools);
    
    const toolDescriptions = safeTools.map(tool => ({
      name: tool.name,
      description: tool.description
    }));

    const contentTypeDescriptions = availableContentTypes.map(ct => ({
      uid: ct.uid,
      title: ct.title || ct.uid,
      description: ct.description || 'No description'
    }));
    
    console.log("🔒 Safe read-only tools:", toolDescriptions);
    console.log("📋 Available content types:", contentTypeDescriptions);
    
    const systemMessage = `You are a READ-ONLY content retrieval system for ContentStack CMS. 

🚫 ABSOLUTELY FORBIDDEN - NEVER SELECT TOOLS THAT:
- CREATE, UPDATE, DELETE, or MODIFY any content
- PUBLISH, UNPUBLISH, or DEPLOY content
- ADD, REMOVE, MERGE, or ALTER data in any way
- LOCALIZE, UNLOCALIZE, or change content structure
- Require specific IDs (entry_id, asset_id, term_id, etc.)

✅ ONLY SELECT "get_all_*" TOOLS THAT:
- Start with "get_all_" prefix (get_all_entries, get_all_assets, get_all_terms)
- Retrieve bulk/list data without requiring specific IDs
- Are simple to execute with minimal parameters

🎯 PREFERRED TOOL PATTERNS:
- get_all_entries (for content like blogs, articles, pages)
- get_all_assets (for images, files, media)
- get_all_terms (for taxonomy/categories)
- get_all_content_types (for schema information)

Available READ-ONLY tools:
${JSON.stringify(toolDescriptions, null, 2)}

Available Content Types:
${JSON.stringify(contentTypeDescriptions, null, 2)}

QUERY: "${userQuery}"

🧠 INTELLIGENT CONTENT SELECTION:
- Analyze the user query to understand what content they want
- For "blog", "article", "post" queries → look for blog_post, article, post content types
- For "product", "item" queries → look for product, item content types  
- For "page", "about", "contact" queries → look for page content types
- For "recent", "latest", "newest" → select content types that likely have dated content
- For "image", "photo", "media" → include get_all_assets tool AND relevant content types

🔒 SAFETY & SIMPLICITY RULES:
- This is a READ-ONLY system for content display only
- ONLY select "get_all_*" tools (no single item tools)
- Select 1-2 most relevant bulk GET tools only
- Select 1-3 most relevant content types for the query
- Avoid tools that need specific IDs or complex parameters
- Return ONLY a JSON object with this structure:

{
  "tools": ["tool_name1", "tool_name2"],
  "content_types": ["content_type_uid1", "content_type_uid2"]
}

RESPOND WITH ONLY THE JSON OBJECT:`;

    try {
      const result = await groq.sendToGroq(
        [
          { role: "system", content: systemMessage },
          { role: "user", content: `Return JSON object for: ${userQuery}` },
        ],
        "llama-3.1-8b-instant"
      );

      let responseContent = result.content || '{}';
      console.log(`🤖 LLM tool+content-type selection raw response: "${responseContent}"`);

      // Extract JSON object from response
      let jsonMatch = responseContent.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        responseContent = jsonMatch[0];
      } else {
        throw new Error('No JSON object found in LLM response');
      }

      console.log(`🤖 Extracted JSON: "${responseContent}"`);
      const selection = JSON.parse(responseContent);
      
      if (!selection.tools || !Array.isArray(selection.tools)) {
        throw new Error('Invalid tools array in response');
      }

      const selectedTools = safeTools.filter(tool => selection.tools.includes(tool.name));
      const selectedContentTypes = selection.content_types || [];
      
      console.log(`🎯 Selected tools: ${selectedTools.map(t => t.name).join(', ')}`);
      console.log(`📋 Selected content types: ${selectedContentTypes.join(', ')}`);
      
      return { selectedTools, selectedContentTypes };

    } catch (error) {
      console.error('LLM tool+content-type selection failed, using fallback:', error);
      
      // CRITICAL SECURITY: Use only filtered safe tools for fallback
      const safeTools = this.filterReadOnlyTools(availableTools);
      
      // Intelligent fallback based on query patterns
      const query = userQuery.toLowerCase();
      let fallbackTools: any[] = [];
      let fallbackContentTypes: string[] = [];
      
      if (query.includes('blog') || query.includes('post') || query.includes('article')) {
        fallbackTools = [safeTools.find(t => t.name === 'get_all_entries')];
        fallbackContentTypes = availableContentTypes
          .filter(ct => ct.uid && (ct.uid.includes('blog') || ct.uid.includes('post') || ct.uid.includes('article')))
          .map(ct => ct.uid)
          .slice(0, 2);
      } else if (query.includes('product') || query.includes('item')) {
        fallbackTools = [safeTools.find(t => t.name === 'get_all_entries')];
        fallbackContentTypes = availableContentTypes
          .filter(ct => ct.uid && (ct.uid.includes('product') || ct.uid.includes('item')))
          .map(ct => ct.uid)
          .slice(0, 2);
      } else if (query.includes('image') || query.includes('photo') || query.includes('media')) {
        fallbackTools = [
          safeTools.find(t => t.name === 'get_all_entries'),
          safeTools.find(t => t.name === 'get_all_assets')
        ];
        fallbackContentTypes = ['page']; // Default fallback
      } else {
        fallbackTools = [
          safeTools.find(t => t.name === 'get_all_content_types'),
          safeTools.find(t => t.name === 'get_all_entries')
        ];
        fallbackContentTypes = ['page']; // Default fallback
      }
      
      const validFallbackTools = fallbackTools.filter(Boolean);
      console.log(`🔒 Using SAFE READ-ONLY fallback tools: ${validFallbackTools.map(t => t?.name).join(', ')}`);
      console.log(`📋 Using fallback content types: ${fallbackContentTypes.join(', ')}`);
      
      return { selectedTools: validFallbackTools, selectedContentTypes: fallbackContentTypes };
    }
  }

  /**
   * Legacy tool selection - kept for backward compatibility
   */
  private static async selectToolsWithLLM(userQuery: string, availableTools: any[]): Promise<any[]> {
    // CRITICAL SECURITY: Filter out ALL modification tools
    const safeTools = this.filterReadOnlyTools(availableTools);
    
    const toolDescriptions = safeTools.map(tool => ({
      name: tool.name,
      description: tool.description
    }));
    
    console.log("🔒 Safe read-only tools:", toolDescriptions);
    
    const systemMessage = `You are a READ-ONLY content retrieval system for ContentStack CMS. 

🚫 ABSOLUTELY FORBIDDEN - NEVER SELECT TOOLS THAT:
- CREATE, UPDATE, DELETE, or MODIFY any content
- PUBLISH, UNPUBLISH, or DEPLOY content
- ADD, REMOVE, MERGE, or ALTER data in any way
- LOCALIZE, UNLOCALIZE, or change content structure

✅ ONLY SELECT READ-ONLY TOOLS THAT:
- GET, RETRIEVE, FETCH, or READ existing content
- LIST, VIEW, or DISPLAY information
- EXPORT data for viewing (not modification)

Available READ-ONLY tools:
${JSON.stringify(toolDescriptions, null, 2)}

QUERY: "${userQuery}"

🔒 SAFETY RULES:
- This is a READ-ONLY system for content display only
- NEVER select tools that modify ContentStack data
- Select 1-3 most relevant GET/READ tools only
- Return ONLY a JSON array: ["tool_name1", "tool_name2"]

Selection Guidelines:
- Recent/latest content → ["get_all_entries"] (with proper sorting)
- Blog posts → ["get_all_entries"] 
- Images/media → ["get_all_entries", "get_all_assets"]
- Content types → ["get_all_content_types"]
- Specific content → ["get_single_entry"] or ["get_all_entries"]

RESPOND WITH ONLY THE JSON ARRAY OF READ-ONLY TOOLS:`;

    try {
      const result = await groq.sendToGroq(
        [
          { role: "system", content: systemMessage },
          { role: "user", content: `Return JSON array for: ${userQuery}` },
        ],
        "llama-3.1-8b-instant"
      );

      let responseContent = result.content || '[]';
      console.log(`🤖 LLM tool selection raw response: "${responseContent}"`);

      // Extract JSON array from response if it contains extra text
      let jsonMatch = responseContent.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        responseContent = jsonMatch[0];
      } else {
        // If no array found, try to extract tool names mentioned
        console.warn('No JSON array found in LLM response, attempting to extract tool names');
        const toolNames = availableTools.map(t => t.name);
        const mentionedTools = toolNames.filter(name => responseContent.toLowerCase().includes(name.toLowerCase()));
        responseContent = JSON.stringify(mentionedTools.slice(0, 3));
      }

      console.log(`🤖 Extracted JSON: "${responseContent}"`);
      const selectedToolNames = JSON.parse(responseContent);
      
      if (!Array.isArray(selectedToolNames)) {
        throw new Error('Response is not an array');
      }

      const selectedTools = availableTools.filter(tool => selectedToolNames.includes(tool.name));
      console.log(`🎯 Selected tools: ${selectedTools.map(t => t.name).join(', ')}`);
      
      return selectedTools;
    } catch (error) {
      console.error('LLM tool selection failed, using fallback:', error);
      
      // CRITICAL SECURITY: Use only filtered safe tools for fallback
      const safeTools = this.filterReadOnlyTools(availableTools);
      
      // Intelligent fallback based on query patterns - READ-ONLY ONLY
      const query = userQuery.toLowerCase();
      let fallbackTools: any[] = [];
      
      if (query.includes('recent') || query.includes('latest') || query.includes('newest')) {
        fallbackTools = [
          safeTools.find(t => t.name === 'get_all_entries')
        ];
      } else if (query.includes('blog') || query.includes('post') || query.includes('article')) {
        fallbackTools = [
          safeTools.find(t => t.name === 'get_all_entries')
        ];
      } else if (query.includes('image') || query.includes('photo') || query.includes('media') || query.includes('gallery')) {
        fallbackTools = [
          safeTools.find(t => t.name === 'get_all_entries'),
          safeTools.find(t => t.name === 'get_all_assets')
        ];
      } else if (query.includes('content type') || query.includes('structure') || query.includes('schema')) {
        fallbackTools = [
          safeTools.find(t => t.name === 'get_all_content_types')
        ];
      } else {
        // Default comprehensive fallback - READ-ONLY ONLY
        fallbackTools = [
          safeTools.find(t => t.name === 'get_all_content_types'),
          safeTools.find(t => t.name === 'get_all_entries'),
          safeTools.find(t => t.name === 'get_all_assets')
        ];
      }
      
      const validFallbackTools = fallbackTools.filter(Boolean);
      console.log(`� Using SAFE READ-ONLY fallback tools: ${validFallbackTools.map(t => t?.name).join(', ')}`);
      return validFallbackTools;
    }
  }

  /**
   * Execute selected tools with content-type awareness
   */
  private static async executeSelectedToolsWithContentTypes(
    selectedTools: any[], 
    selectedContentTypes: string[],
    tenantId: string,
    apiKey: string,
    mcpService: ContentStackMCPService
  ): Promise<any> {
    const results: any = {};

    // ✅ SIMPLE CACHING: Keep original logic, just add cache layer
    for (const tool of selectedTools) {
      try {
        if (tool.name === 'get_all_content_types') {
          // Check cache first
          const cached = await redisCacheService.get(tenantId, apiKey, 'get_all_content_types');
          if (cached) {
            results[tool.name] = { success: true, data: cached };
            console.log('🎯 Cache HIT: get_all_content_types');
          } else {
            // Original MCP logic using the specific service instance
            const params = { branch: 'main' };
            if (mcpService) {
              const result = await mcpService.sendRequest('tools/call', {
                name: tool.name,
                arguments: params
              });
              results[tool.name] = result;
              // Cache successful result
              if (result.success && result.data) {
                redisCacheService.set(tenantId, apiKey, 'get_all_content_types', result.data);
              }
            } else {
              console.error(`❌ No MCP service available for ${tool.name}`);
              results[tool.name] = {
                success: false,
                error: 'No MCP service available'
              };
            }
          }
        } else if (tool.name === 'get_all_entries') {
          // Execute get_all_entries for EACH selected content type
          for (const contentType of selectedContentTypes) {
            const cacheKey = `get_all_entries_${contentType}`;
            const cached = await redisCacheService.get(tenantId, apiKey, cacheKey);
            
            if (cached) {
              results[`get_all_entries_${contentType}`] = { success: true, data: cached };
              console.log(`🎯 Cache HIT: get_all_entries_${contentType}`);
            } else {
              // Original MCP logic
              const params = {
                content_type_uid: contentType,
                limit: '10',
                include_count: true,
                branch: 'main'
              };

              // Use the specific MCP service instance for this request
              if (mcpService) {
                console.log(`🔍 Sending MCP request for get_all_entries with content_type: ${contentType}`);
                const result = await mcpService.sendRequest('tools/call', {
                  name: tool.name,
                  arguments: params
                });
                
                console.log(`🔍 MCP Response for ${contentType}:`, JSON.stringify(result, null, 2));
                
                // Store results with content type suffix for clarity
                const resultKey = `get_all_entries_${contentType}`;
                results[resultKey] = result;
                console.log(`📊 Executed get_all_entries for content type: ${contentType}`);
                
                // Cache successful result
                if (result.success && result.data) {
                  redisCacheService.set(tenantId, apiKey, cacheKey, result.data);
                }
              } else {
                console.error(`❌ No MCP service available for get_all_entries_${contentType}`);
                results[`get_all_entries_${contentType}`] = {
                  success: false,
                  error: 'No MCP service available'
                };
              }
            }
          }
        } else if (tool.name === 'get_all_assets') {
          // Check cache first
          const cached = await redisCacheService.get(tenantId, apiKey, 'get_all_assets');
          if (cached) {
            results[tool.name] = { success: true, data: cached };
            console.log('🎯 Cache HIT: get_all_assets');
          } else {
            // Original MCP logic  
            const params = {
              limit: '10',
              include_count: true,
              branch: 'main'
            };

            // Use the specific MCP service instance for this request
            if (mcpService) {
              const result = await mcpService.sendRequest('tools/call', {
                name: tool.name,
                arguments: params
              });
              results[tool.name] = result;
              // Cache successful result
              if (result.success && result.data) {
                redisCacheService.set(tenantId, apiKey, 'get_all_assets', result.data);
              }
            } else {
              console.error(`❌ No MCP service available for ${tool.name}`);
              results[tool.name] = {
                success: false,
                error: 'No MCP service available'
              };
            }
          }
        } else {
          // Check cache first for other tools
          const cached = await redisCacheService.get(tenantId, apiKey, tool.name);
          if (cached) {
            results[tool.name] = { success: true, data: cached };
            console.log(`🎯 Cache HIT: ${tool.name}`);
          } else {
            // Original MCP logic
            let params: any = {};
            
            if (tool.name === 'get_all_environments') {
              params = { include_count: true };
            }

            // Use the specific MCP service instance for this request
            if (mcpService) {
              const result = await mcpService.sendRequest('tools/call', {
                name: tool.name,
                arguments: params
              });
              results[tool.name] = result;
              // Cache successful result
              if (result.success && result.data) {
                redisCacheService.set(tenantId, apiKey, tool.name, result.data);
              }
            } else {
              console.error(`❌ No MCP service available for ${tool.name}`);
              results[tool.name] = {
                success: false,
                error: 'No MCP service available'
              };
            }
          }
        }
      } catch (error) {
        console.error(`❌ Failed to execute tool ${tool.name}:`, error);
        console.error(`❌ Error stack:`, error instanceof Error ? error.stack : error);
        
        // Check if this is a "Cannot read properties of undefined" error which indicates MCP server issues
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isUndefinedPropertyError = errorMessage.includes('Cannot read properties of undefined') || 
                                       errorMessage.includes('reading \'get_all_entries\'') ||
                                       errorMessage.includes('reading \'get_all_content_types\'');
        
        if (isUndefinedPropertyError && mcpService) {
          console.log('🔄 Detected MCP server undefined property error, attempting restart...');
          try {
            // Force restart the MCP server
            await mcpService.stopMCPServer();
            await new Promise(resolve => setTimeout(resolve, 3000));
            await mcpService.startMCPServer();
            
            // Test that the server is working
            console.log('🧪 Testing MCP server after restart...');
            await mcpService.sendRequest('tools/list', {});
            console.log('✅ MCP server restart successful, retrying tool execution...');
            
            // Retry the tool execution once
            let params: any = {};
            if (tool.name === 'get_all_environments') {
              params = { include_count: true };
            } else if (tool.name === 'get_all_content_types') {
              params = { branch: 'main' };
            }
            
            const retryResult = await mcpService.sendRequest('tools/call', {
              name: tool.name,
              arguments: params
            });
            
            results[tool.name] = retryResult;
            // Cache successful retry result
            if (retryResult.success && retryResult.data) {
              redisCacheService.set(tenantId, apiKey, tool.name, retryResult.data);
            }
            console.log(`✅ Tool ${tool.name} executed successfully after MCP restart`);
            continue; // Skip the error handling below
          } catch (restartError) {
            console.error('❌ Failed to restart MCP server and retry:', restartError);
            // Fall through to original error handling
          }
        }
        
        // Handle get_all_entries failures for each content type
        if (tool.name === 'get_all_entries') {
          for (const contentType of selectedContentTypes) {
            results[`get_all_entries_${contentType}`] = { 
              success: false, 
              error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
          }
        } else {
          results[tool.name] = { 
            success: false, 
            error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }
    }

    return results;
  }

  /**
   * Legacy tool execution - kept for backward compatibility
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
          console.log("tools", results)
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
   * Strategy: Groq for tool selection, user's chosen provider for response generation
   */
//   private static async generateEnhancedAIResponse(
//     userQuery: string,
//     multiToolData: any,
//     tenantId: string,
//     responseProvider: string = 'groq',
//     responseModel: string = 'llama-3.3-70b-versatile',
//     sessionId?: string
//   ): Promise<string> {
    
//     // Enhanced system context optimized for production website assistance
//     let systemContext = `You are a helpful AI assistant for this website. Your role is to help visitors find information and answer questions using only the actual content and data from this website.

// 🔒 GUARDRAILS:
// - ONLY use information from the provided website content data
// - NEVER invent, assume, or hallucinate information not present in the data
// - If information is not available in the provided data, clearly state this limitation
// - Do not make up product details, prices, availability, or contact information
// - Always base your responses on factual content from the website
// - Do NOT discuss ContentStack, CMS, or technical backend details
// - Focus ONLY on the website's actual content, products, services, or information

// 🎯 YOUR MISSION:
// You have access to real, live content from this website. Use this data to provide accurate, helpful responses about what's available on this website - not about the technology behind it.`;
    
//     // Build comprehensive context from multiple tool results
//     const contextParts: string[] = [];
    
//     for (const [toolName, result] of Object.entries(multiToolData)) {
//       if (result && (result as any).success && (result as any).data) {
//         // Parse the content to make it more readable for LLMs
//         let dataContent = (result as any).data;
//         if (dataContent.content && Array.isArray(dataContent.content)) {
//           try {
//             // Try to parse the nested JSON text content
//             const parsedContent = dataContent.content.map((item: any) => {
//               if (item.type === 'text' && item.text) {
//                 try {
//                   return JSON.parse(item.text);
//                 } catch {
//                   return item.text;
//                 }
//               }
//               return item;
//             });
//             dataContent = parsedContent[0] || dataContent;
//           } catch (e) {
//             // Keep original if parsing fails
//           }
//         }
        
//         contextParts.push(`\n=== ${toolName.replace(/_/g, ' ').toUpperCase()} DATA ===\n${JSON.stringify(dataContent, null, 2)}`);
//       } else if (result && (result as any).error) {
//         contextParts.push(`\n=== ${toolName.replace(/_/g, ' ').toUpperCase()} (ERROR) ===\n${(result as any).error}`);
//       }
//     }

//     if (contextParts.length > 0) {
//       systemContext += `\n\n📊 WEBSITE CONTENT DATA:${contextParts.join('\n')}`;
//     } else {
//       systemContext += `\n\n⚠️ IMPORTANT: No specific website content data is currently available for this query. 
      
// 🚫 Since you don't have access to the actual website content, you should:
// - Inform the user that you need more specific information to help them with this website
// - Suggest they try asking about different topics or sections of the website
// - Do NOT mention ContentStack, CMS, or technical details
// - Focus on helping them find information that might be available on the website`;
//     }

//     systemContext += `\n\n📋 RESPONSE GUIDELINES:
// - Provide concise, accurate answers based EXCLUSIVELY on the website content above
// - Talk about the website's content, products, services, or information - NOT about ContentStack or CMS
// - If asked about anything not related to this website's content, politely redirect: "I'm here to help with information about this website. What would you like to know about our content?"
// - Reference specific details, links, or information found in the actual website data
// - If asked about products, services, or content not in the data, say "I don't have that information available on this website"
// - Keep responses conversational but professional - you're representing this website
// - For general questions (math, weather, etc.), say: "I can only help with questions about this website's content"

// ⚠️ CRITICAL: Never mention ContentStack, CMS, or technical details. Focus only on the website's actual content and services. Never guess, assume or create information.

// 📝 RESPONSE FORMATTING GUIDELINES:
// - Use markdown formatting for better readability
// - Structure information with headings (## for main topics, ### for subtopics)
// - Use bullet points (-) for lists of items
// - Use **bold** for important information or key terms
// - Format links as [text](url) when available in the content
// - Use numbered lists (1. 2. 3.) for step-by-step instructions
// - Keep responses well-organized and scannable
// - Use line breaks to separate different topics or sections`;

//     try {
//       // Use user's chosen LLM provider for response generation
//       console.log(`🎯 Generating response with ${responseProvider}:${responseModel}`);
      
//       // Build messages array with conversation history
//       const messages: CleanMessage[] = [
//         { role: 'system' as const, content: systemContext }
//       ];

//       // Add conversation history if session exists
//       if (sessionId) {
//         const conversationHistory = conversationMemory.getFormattedConversation(sessionId, 8); // Last 8 messages for context
//         console.log(`💭 Including ${conversationHistory.length} previous messages for context`);
        
//         conversationHistory.forEach(msg => {
//           messages.push({
//             role: msg.role as 'user' | 'assistant',
//             content: msg.content
//           });
//         });
//       }

//       // Add current user query
//       messages.push({ role: 'user' as const, content: userQuery });

//       const result = await llm.sendMessageWithFallback(
//         messages,
//         responseProvider,
//         responseModel
//       );

//       if (result.success) {
//         return result.content || 'I apologize, but I couldn\'t generate a response based on the available data.';
//       } else {
//         throw new Error(`LLM response failed: ${result.error}`);
//       }
//     } catch (error) {
//       console.error('Enhanced AI response generation failed:', error);
//       // NEVER expose raw data to end users - provide a clean, professional error message
//       return `I apologize, but I'm having trouble processing your request right now. Please try asking your question in a different way, or contact our support team if you need immediate assistance.`;
//     }
//   }

  /**
   * Generate streaming AI response using user's chosen LLM provider with ContentStack context
   */
  private static async generateEnhancedAIResponseStream(
    userQuery: string,
    multiToolData: any,
    tenantId: string,
    onChunk: (chunk: string) => void,
    responseProvider: string = 'groq',
    responseModel?: string,
    sessionId?: string
  ): Promise<void> {
    
    // READ-ONLY system context - emphasizes no modification capabilities
    let systemContext = `You are a READ-ONLY AI assistant for this website. Your role is to help visitors find and view existing content ONLY.

🔒 CRITICAL READ-ONLY RESTRICTIONS:
- You are a READ-ONLY system that can ONLY display existing content
- You CANNOT and MUST NOT create, update, delete, publish, or modify ANY content
- You can ONLY retrieve and show information that already exists on this website
- NEVER suggest actions that would modify, add, or change website content
- If users ask to create, update, or modify content, explain this is not possible

🔒 CONTENT GUARDRAILS:
- ONLY use information from the provided website content data
- NEVER invent, assume, or hallucinate information not present in the data
- If information is not available in the provided data, clearly state this limitation
- Do not make up product details, prices, availability, or contact information
- Always base your responses on factual content from the website
- Do NOT discuss ContentStack, CMS, or technical backend details
- Focus ONLY on the website's actual content, products, services, or information

🎯 YOUR READ-ONLY MISSION:
You have access to real, live content from this website for VIEWING purposes only. Use this data to provide accurate, helpful responses about what's available on this website - you cannot modify or create anything.

🖼️ MEDIA CONTENT HANDLING:
- When users ask about images, photos, or visual content - SHOW the actual images using ![alt](url) format
- When entries contain image fields or asset references - DISPLAY the visual content, not just describe it
- When users ask "show me [content]" - provide the actual content (images, documents, etc.) not just links
- For galleries or image collections - display multiple images in sequence
- For videos, documents, or downloadable assets - use appropriate icons and direct links`;
    
    // Build comprehensive context from multiple tool results with smart truncation
    const contextParts: string[] = [];
    let totalEstimatedTokens = this.estimateTokens(systemContext);
    
    // Provider-specific token limits based on actual Groq rate limits
    // Groq llama-3.1-8b-instant: 6K TPM, 30 RPM - very restrictive!
    const isGroqProvider = responseProvider === 'groq';
    const MAX_CONTEXT_TOKENS = isGroqProvider ? 2000 : 120000; // Groq: stay under 2K to avoid TPM issues
    const MAX_DATA_TOKENS = isGroqProvider ? 1200 : 80000; // Groq: ultra-conservative for 6K TPM limit
    
    console.log(`📊 Starting context building with ${Object.keys(multiToolData).length} tool results`);
    
    for (const [toolName, result] of Object.entries(multiToolData)) {
      if (result && (result as any).success && (result as any).data) {
        let dataContent = (result as any).data;
        if (dataContent.content && Array.isArray(dataContent.content)) {
          try {
            const parsedContent = dataContent.content.map((item: any) => {
              if (item.type === 'text' && item.text) {
                try {
                  return JSON.parse(item.text);
                } catch {
                  return item.text;
                }
              }
              return item;
            });
            dataContent = parsedContent[0] || dataContent;
          } catch (e) {
            // Keep original if parsing fails
          }
        }
        
        // Process content for better media handling
        const processedContent = this.processContentForMediaHandling(dataContent);
        
        // Smart summarization with provider-specific limits
        // Groq: Ultra-compact due to 6K TPM limit, Others: Normal detailed summaries
        const perToolTokenLimit = isGroqProvider ? 
          Math.min(200, MAX_DATA_TOKENS / Object.keys(multiToolData).length) : // Groq: 200 tokens max per tool
          Math.min(15000, MAX_DATA_TOKENS / Object.keys(multiToolData).length);
          
        const summarizedContent = this.summarizeContentData(processedContent, perToolTokenLimit);
        const contextPart = `\n=== ${toolName.replace(/_/g, ' ').toUpperCase()} DATA ===\n${summarizedContent}`;
        
        const partTokens = this.estimateTokens(contextPart);
        if (totalEstimatedTokens + partTokens <= MAX_CONTEXT_TOKENS) {
          contextParts.push(contextPart);
          totalEstimatedTokens += partTokens;
          console.log(`✅ Added ${toolName} data (~${partTokens} tokens)`);
        } else {
          console.log(`⚠️ Skipping ${toolName} data (${partTokens} tokens) to prevent overflow`);
          const shortSummary = `[Large dataset available with ${processedContent.entries?.length || 0} entries and ${processedContent.assets?.length || 0} assets - ask specific questions for details]`;
          contextParts.push(`\n=== ${toolName.replace(/_/g, ' ').toUpperCase()} DATA ===\n${shortSummary}`);
        }
      } else if (result && (result as any).error) {
        contextParts.push(`\n=== ${toolName.replace(/_/g, ' ').toUpperCase()} (ERROR) ===\n${(result as any).error}`);
      }
    }

    if (contextParts.length > 0) {
      systemContext += `\n\n📊 WEBSITE CONTENT DATA:${contextParts.join('\n')}`;
    } else {
      systemContext += `\n\n⚠️ IMPORTANT: No specific website content data is currently available for this query. 
      
🚫 Since you don't have access to the actual website content, you should:
- Inform the user that you need more specific information to help them with this website
- Suggest they try asking about different topics or sections of the website
- Do NOT mention ContentStack, CMS, or technical details
- Focus on helping them find information that might be available on the website`;
    }

    // Log final token estimation
    console.log(`📊 Final context size: ~${this.estimateTokens(systemContext)} tokens (Target: <${MAX_CONTEXT_TOKENS})`);
    
    // Final safety check
    if (this.estimateTokens(systemContext) > MAX_CONTEXT_TOKENS) {
      console.warn(`⚠️ Context still too large, applying emergency truncation`);
      const targetLength = MAX_CONTEXT_TOKENS * 3; // Rough character count
      systemContext = systemContext.substring(0, targetLength) + '\n\n[Context truncated to prevent token overflow]';
    }

    systemContext += `\n\n📋 READ-ONLY RESPONSE GUIDELINES:
- Provide concise, accurate answers based EXCLUSIVELY on the website content above
- This is a READ-ONLY system - you can ONLY show existing content, NEVER create, update, or modify anything
- If users ask to create, update, edit, delete, or modify content, respond: "I can only help you find and view existing content on this website. I cannot create, update, or modify any content."
- Talk about the website's content, products, services, or information - NOT about ContentStack or CMS
- If asked about anything not related to this website's content, politely redirect: "I'm here to help with information about this website. What would you like to know about our content?"
- Reference specific details, links, or information found in the actual website data
- If asked about products, services, or content not in the data, say "I don't have that information available on this website"
- Keep responses conversational but professional - you're representing this website
- For general questions (math, weather, etc.), say: "I can only help with questions about this website's content"

🚫 STRICTLY FORBIDDEN ACTIONS:
- Do NOT suggest creating, editing, updating, or deleting any content
- Do NOT offer to publish, unpublish, or modify existing content
- Do NOT provide instructions on how to add or change website content
- Do NOT mention capabilities to modify the CMS or website structure
- ONLY focus on displaying and finding existing content

🔍 CONTENT DISPLAY PRIORITIES:
- **Images/Photos**: When users ask about images or visual content, ALWAYS display actual images using ![alt](url)
- **Media Content**: Show actual media files, not just descriptions or links
- **Rich Content**: Present formatted content with embedded media, not just text descriptions  
- **Asset Libraries**: When showing collections, display the actual files/images in viewable format
- **Content Entries**: If entries have _formatted_ fields, prioritize showing the formatted version over raw data

⚠️ CRITICAL: Never mention ContentStack, CMS, or technical details. Focus only on the website's actual content and services. Never guess, assume or create information.

📝 RESPONSE FORMATTING GUIDELINES:
- Use markdown formatting for better readability
- Structure information with headings (## for main topics, ### for subtopics)
- Use bullet points (-) for lists of items
- Use **bold** for important information or key terms

🖼️ MEDIA & CONTENT FORMATTING:
- **For Images**: When users ask about images or when image data is relevant, display actual images using: ![alt text](image_url)
- **For Assets**: Show downloadable files as: [📄 filename](download_url) or [📷 Image Name](image_url)
- **For Videos**: Use embedded format: [🎥 Video Title](video_url) 
- **For Documents**: Display as: [📄 Document Name](document_url)
- **For Links**: Format as [text](url) when available in the content
- **For Rich Content**: When content includes formatted text, images, or media, present the full formatted content, not just links

📸 IMAGE HANDLING RULES:
- If user asks "show me images" or "what images do you have", display actual images with ![](url)
- If content includes image references or asset URLs, render them as viewable images
- For image galleries or multiple images, display them in a grid-like format using multiple ![](url) tags
- Always include descriptive alt text for accessibility
- If an entry contains image fields, show the actual images, not just the field names

📄 ASSET & FILE HANDLING:
- For PDFs, documents, downloads: Use [📄 filename](url) format
- For image assets: Use ![description](url) format to show actual images
- For video assets: Use [🎥 title](url) format
- Include file sizes and types when available in the data

🔗 CONTENT ORGANIZATION:
- Use numbered lists (1. 2. 3.) for step-by-step instructions
- Keep responses well-organized and scannable
- Use line breaks to separate different topics or sections
- When showing multiple content items, organize them with clear headings and visual separation`;

    // Build messages array with conversation history - declare outside try block for fallback access
    const messages: CleanMessage[] = [
      { role: 'system' as const, content: systemContext }
    ];

    // Add conversation history if session exists
    if (sessionId) {
      const conversationHistory = conversationMemory.getFormattedConversation(sessionId, 8); // Last 8 messages for context
      console.log(`💭 Including ${conversationHistory.length} previous messages for streaming context`);
      
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      });
    }

    // Add current user query
    messages.push({ role: 'user' as const, content: userQuery });

    try {
      console.log(`🎯 Generating streaming response with ${responseProvider}:${responseModel}`);
      
      // Use streaming with fallback support
      await llm.sendMessageStreamWithFallback(
        messages,
        onChunk,
        responseProvider,
        responseModel
      );

    } catch (error) {
      console.error('Enhanced AI streaming response generation failed:', error);
      
      // Fallback to non-streaming response
      try {
        console.log('🔄 Attempting fallback to non-streaming response...');
        
        const result = await llm.sendMessageWithFallback(
          messages,
          responseProvider,
          responseModel
        );
        
        if (result?.content) {
          console.log('✅ Non-streaming fallback successful');
          onChunk(result.content);
        } else {
          throw new Error('Non-streaming fallback returned no content');
        }
        
      } catch (fallbackError) {
        console.error('Non-streaming fallback also failed:', fallbackError);
        onChunk('I apologize, but I\'m having trouble processing your request right now. Please try asking your question in a different way, or contact our support team if you need immediate assistance.');
      }
    }
  }

  /**
   * Generate AI response using Groq LLM with ContentStack context
   */
//   private static async generateAIResponse(
//     userQuery: string, 
//     contentData: any, 
//     additionalContext?: string
//   ): Promise<LLMResult> {
    
//     // Build context for the LLM - Professional website assistant
//     let systemContext = `You are an AI assistant for this website. Your role is to help visitors using only verified information from the website's content.

// 🔒 SAFETY GUARDRAILS:
// - Only provide information that exists in the actual website content
// - Never invent or assume details not present in the provided data
// - If information isn't available, clearly state this limitation
// - Maintain a professional, helpful tone as a website representative
// - Do NOT mention ContentStack, CMS, or any technical backend details
// - Focus ONLY on the website's actual content, products, and services`;
    
//     if (contentData?.success && contentData.data) {
//       systemContext += `\n\n📊 WEBSITE CONTENT DATA:\n${JSON.stringify(contentData.data, null, 2)}
      
// Use this content to answer the user's question about this website accurately and concisely. Talk about the website's content, not about ContentStack or CMS.`;
//     } else if (contentData?.error) {
//       systemContext += `\n\n⚠️ Content retrieval issue: ${contentData.error}
      
// Since specific website content isn't available, inform the user that you need more information to help them with this website.`;
//     }

//     if (additionalContext) {
//       systemContext += `\n\nAdditional verified context: ${additionalContext}`;
//     }

//     systemContext += `\n\n📝 RESPONSE REQUIREMENTS:
// - Be concise and directly address the user's question about this website
// - Reference specific website content when available  
// - If content is unavailable, suggest alternative topics about the website
// - Maintain a professional, website-appropriate tone
// - Never mention ContentStack, CMS, or technical details
// - For off-topic questions, redirect: "I'm here to help with information about this website"
// - Format your response using markdown for better readability
// - Use headings, bullet points, and bold text appropriately`;

//     const messages: CleanMessage[] = [
//       {
//         role: 'system',
//         content: systemContext
//       },
//       {
//         role: 'user',
//         content: userQuery
//       }
//     ];

//     // Use Groq LLM to generate response
//     try {
//       return await groq.sendToGroq(messages, 'llama-3.3-70b-versatile');
//     } catch (groqError) {
//       console.error('Groq LLM error:', groqError);
//       // NEVER expose raw data or technical details to end users
//       const fallbackResponse = 'I apologize, but I\'m having trouble accessing the website information right now. Please try again in a moment, or rephrase your question.';
      
//       return {
//         success: true,
//         content: fallbackResponse,
//         error: 'LLM service unavailable',
//         provider: 'groq'
//       };
//     }
//   }

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

      const aiResult = await groq.sendToGroq(
        aiMessages,
        "llama-3.1-8b-instant"
      );
      
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
