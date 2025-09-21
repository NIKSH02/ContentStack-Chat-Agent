import { ContentStackMCPService, contentStackMCPManager } from './contentstackMCP';
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

      // Step 2: Start MCP server if not connected
      if (!mcpService.isServerConnected()) {
        onStatus('⚡ Starting content service...');
        await mcpService.startMCPServer();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 3: Get available tools for intelligent selection
      onStatus('🛠️ Loading content tools...');
      const toolsResult = await mcpService.listAvailableTools();
      if (!toolsResult.success) {
        const errorMsg = `I'm having trouble connecting to ContentStack. This might be due to an invalid Stack API key or network issues. Error: ${toolsResult.error || 'Unknown error'}. Please check your API key and try again.`;
        console.error('Tools list failed:', toolsResult.error);
        onChunk(errorMsg);
        return;
      }

      // Step 4: Enhanced LLM-driven tool selection
      onStatus('🤖 Selecting relevant content sources...');
      const selectedTools = await this.selectToolsWithLLM(query.query, toolsResult.data.tools);

      console.log(`🤖 LLM selected ${selectedTools.length} tools:`, selectedTools.map(t => t.name));

      // Step 5: Execute selected tools and gather comprehensive data
      onStatus('📊 Gathering content data...');
      let multiToolData;
      try {
        multiToolData = await this.executeSelectedTools(selectedTools);
        console.log(`📊 Executed tools, results:`, Object.keys(multiToolData));
      } catch (error: any) {
        console.warn('Multi-tool execution failed, trying fallback:', error.message);
        try {
          multiToolData = {
            'get_all_content_types': await mcpService.getContentTypes()
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

      console.log(`📊 Large content detected (${this.estimateTokens(jsonString)} tokens), summarizing...`);

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
   * Enhanced LLM-driven tool selection
   */
  private static async selectToolsWithLLM(userQuery: string, availableTools: any[]): Promise<any[]> {
    const toolDescriptions = availableTools.map(tool => ({
      name: tool.name,
      description: tool.description
    }));
    console.log("tools:", toolDescriptions) //tools
    const systemMessage = `You are an intelligent content retrieval system for a website powered by ContentStack CMS. Your role is to select the most efficient tools to answer visitor questions accurately.

🎯 OBJECTIVE: Choose the minimal set of tools needed to provide accurate, helpful information to website visitors.

Available ContentStack content tools:
${JSON.stringify(toolDescriptions, null, 2)}

🔍 TOOL SELECTION STRATEGY for query: "${userQuery}"

Priority Guidelines:
1. **Navigation/General Questions**: Start with content types to understand site structure
2. **Specific Content**: Get entries from relevant content types (blogs, products, pages)
3. **Visual/Media Queries**: ALWAYS include assets when users ask about: images, photos, gallery, pictures, media, files, downloads, or visual content
4. **Content Display**: Include both entries AND assets when users want to "see" or "show" content
5. **Technical/Admin**: Avoid environments unless specifically about publishing/deployment

⚡ EFFICIENCY RULES:
- Select only 1-3 most relevant tools
- Prioritize tools that directly answer the user's question
- Avoid redundant data collection
- Focus on visitor-facing content, not technical backend details

Return ONLY a JSON array of tool names: ["tool1", "tool2", "tool3"]`;

    try {
      const result = await groq.sendToGroq(
        [
          { role: "system", content: systemMessage },
          { role: "user", content: userQuery },
        ],
        "llama-3.1-8b-instant"
      );

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
    
    // Same enhanced system context as non-streaming version
    let systemContext = `You are a helpful AI assistant for this website. Your role is to help visitors find information and answer questions using only the actual content and data from this website.

🔒 GUARDRAILS:
- ONLY use information from the provided website content data
- NEVER invent, assume, or hallucinate information not present in the data
- If information is not available in the provided data, clearly state this limitation
- Do not make up product details, prices, availability, or contact information
- Always base your responses on factual content from the website
- Do NOT discuss ContentStack, CMS, or technical backend details
- Focus ONLY on the website's actual content, products, services, or information

🎯 YOUR MISSION:
You have access to real, live content from this website. Use this data to provide accurate, helpful responses about what's available on this website - not about the technology behind it.

🖼️ MEDIA CONTENT HANDLING:
- When users ask about images, photos, or visual content - SHOW the actual images using ![alt](url) format
- When entries contain image fields or asset references - DISPLAY the visual content, not just describe it
- When users ask "show me [content]" - provide the actual content (images, documents, etc.) not just links
- For galleries or image collections - display multiple images in sequence
- For videos, documents, or downloadable assets - use appropriate icons and direct links`;
    
    // Build comprehensive context from multiple tool results with smart truncation
    const contextParts: string[] = [];
    let totalEstimatedTokens = this.estimateTokens(systemContext);
    const MAX_CONTEXT_TOKENS = 120000; // Leave room for response and conversation history
    const MAX_DATA_TOKENS = 80000; // Reserve most space for content data
    
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
        
        // Smart summarization instead of raw JSON dump
        const summarizedContent = this.summarizeContentData(processedContent, Math.min(15000, MAX_DATA_TOKENS / Object.keys(multiToolData).length));
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

    systemContext += `\n\n📋 RESPONSE GUIDELINES:
- Provide concise, accurate answers based EXCLUSIVELY on the website content above
- Talk about the website's content, products, services, or information - NOT about ContentStack or CMS
- If asked about anything not related to this website's content, politely redirect: "I'm here to help with information about this website. What would you like to know about our content?"
- Reference specific details, links, or information found in the actual website data
- If asked about products, services, or content not in the data, say "I don't have that information available on this website"
- Keep responses conversational but professional - you're representing this website
- For general questions (math, weather, etc.), say: "I can only help with questions about this website's content"

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

    try {
      console.log(`🎯 Generating streaming response with ${responseProvider}:${responseModel}`);
      
      // Build messages array with conversation history
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

      // Use streaming with fallback support
      await llm.sendMessageStreamWithFallback(
        messages,
        onChunk,
        responseProvider,
        responseModel
      );

    } catch (error) {
      console.error('Enhanced AI streaming response generation failed:', error);
      onChunk('I apologize, but I\'m having trouble processing your request right now. Please try asking your question in a different way, or contact our support team if you need immediate assistance.');
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
