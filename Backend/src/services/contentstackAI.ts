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
        onChunk('I apologize, but I\'m unable to access the content tools right now. Please try again later.');
        return;
      }

      // Step 4: Enhanced LLM-driven tool selection
      onStatus('🤖 Selecting relevant content sources...');
      const selectedTools = await this.selectToolsWithLLM(query.query, toolsResult.data.tools);
      console.log("tools: ", toolsResult.data.tools)
      console.log(`🤖 LLM selected ${selectedTools.length} tools:`, selectedTools.map(t => t.name));

      // Step 5: Execute selected tools and gather comprehensive data
      onStatus('📊 Gathering content data...');
      let multiToolData;
      try {
        multiToolData = await this.executeSelectedTools(selectedTools);
        console.log(`📊 Executed tools, results:`, Object.keys(multiToolData));
      } catch (error: any) {
        console.warn('Multi-tool execution failed, using fallback:', error.message);
        multiToolData = {
          'get_all_content_types': await mcpService.getContentTypes()
        };
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
      onChunk('I encountered an error while processing your request. Please try again.');
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
    console.log("tools:", toolDescriptions)
    const systemMessage = `You are an intelligent content retrieval system for a website powered by ContentStack CMS. Your role is to select the most efficient tools to answer visitor questions accurately.

🎯 OBJECTIVE: Choose the minimal set of tools needed to provide accurate, helpful information to website visitors.

Available ContentStack content tools:
${JSON.stringify(toolDescriptions, null, 2)}

🔍 TOOL SELECTION STRATEGY for query: "${userQuery}"

Priority Guidelines:
1. **Navigation/General Questions**: Start with content types to understand site structure
2. **Specific Content**: Get entries from relevant content types (blogs, products, pages)
3. **Media/Images**: Include assets only if explicitly about images, files, or downloads
4. **Technical/Admin**: Avoid environments unless specifically about publishing/deployment

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
  private static async generateEnhancedAIResponse(
    userQuery: string,
    multiToolData: any,
    tenantId: string,
    responseProvider: string = 'groq',
    responseModel: string = 'llama-3.3-70b-versatile',
    sessionId?: string
  ): Promise<string> {
    
    // Enhanced system context optimized for production website assistance
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
You have access to real, live content from this website. Use this data to provide accurate, helpful responses about what's available on this website - not about the technology behind it.`;
    
    // Build comprehensive context from multiple tool results
    const contextParts: string[] = [];
    
    for (const [toolName, result] of Object.entries(multiToolData)) {
      if (result && (result as any).success && (result as any).data) {
        // Parse the content to make it more readable for LLMs
        let dataContent = (result as any).data;
        if (dataContent.content && Array.isArray(dataContent.content)) {
          try {
            // Try to parse the nested JSON text content
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
        
        contextParts.push(`\n=== ${toolName.replace(/_/g, ' ').toUpperCase()} DATA ===\n${JSON.stringify(dataContent, null, 2)}`);
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

    systemContext += `\n\n📋 RESPONSE GUIDELINES:
- Provide concise, accurate answers based EXCLUSIVELY on the website content above
- Talk about the website's content, products, services, or information - NOT about ContentStack or CMS
- If asked about anything not related to this website's content, politely redirect: "I'm here to help with information about this website. What would you like to know about our content?"
- Reference specific details, links, or information found in the actual website data
- If asked about products, services, or content not in the data, say "I don't have that information available on this website"
- Keep responses conversational but professional - you're representing this website
- For general questions (math, weather, etc.), say: "I can only help with questions about this website's content"

⚠️ CRITICAL: Never mention ContentStack, CMS, or technical details. Focus only on the website's actual content and services. Never guess, assume or create information.

📝 RESPONSE FORMATTING GUIDELINES:
- Use markdown formatting for better readability
- Structure information with headings (## for main topics, ### for subtopics)
- Use bullet points (-) for lists of items
- Use **bold** for important information or key terms
- Format links as [text](url) when available in the content
- Use numbered lists (1. 2. 3.) for step-by-step instructions
- Keep responses well-organized and scannable
- Use line breaks to separate different topics or sections`;

    try {
      // Use user's chosen LLM provider for response generation
      console.log(`🎯 Generating response with ${responseProvider}:${responseModel}`);
      
      // Build messages array with conversation history
      const messages: CleanMessage[] = [
        { role: 'system' as const, content: systemContext }
      ];

      // Add conversation history if session exists
      if (sessionId) {
        const conversationHistory = conversationMemory.getFormattedConversation(sessionId, 8); // Last 8 messages for context
        console.log(`💭 Including ${conversationHistory.length} previous messages for context`);
        
        conversationHistory.forEach(msg => {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          });
        });
      }

      // Add current user query
      messages.push({ role: 'user' as const, content: userQuery });

      const result = await llm.sendMessageWithFallback(
        messages,
        responseProvider,
        responseModel
      );

      if (result.success) {
        return result.content || 'I apologize, but I couldn\'t generate a response based on the available data.';
      } else {
        throw new Error(`LLM response failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Enhanced AI response generation failed:', error);
      // NEVER expose raw data to end users - provide a clean, professional error message
      return `I apologize, but I'm having trouble processing your request right now. Please try asking your question in a different way, or contact our support team if you need immediate assistance.`;
    }
  }

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
You have access to real, live content from this website. Use this data to provide accurate, helpful responses about what's available on this website - not about the technology behind it.`;
    
    // Build comprehensive context from multiple tool results
    const contextParts: string[] = [];
    
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
        
        contextParts.push(`\n=== ${toolName.replace(/_/g, ' ').toUpperCase()} DATA ===\n${JSON.stringify(dataContent, null, 2)}`);
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

    systemContext += `\n\n📋 RESPONSE GUIDELINES:
- Provide concise, accurate answers based EXCLUSIVELY on the website content above
- Talk about the website's content, products, services, or information - NOT about ContentStack or CMS
- If asked about anything not related to this website's content, politely redirect: "I'm here to help with information about this website. What would you like to know about our content?"
- Reference specific details, links, or information found in the actual website data
- If asked about products, services, or content not in the data, say "I don't have that information available on this website"
- Keep responses conversational but professional - you're representing this website
- For general questions (math, weather, etc.), say: "I can only help with questions about this website's content"

⚠️ CRITICAL: Never mention ContentStack, CMS, or technical details. Focus only on the website's actual content and services. Never guess, assume or create information.

📝 RESPONSE FORMATTING GUIDELINES:
- Use markdown formatting for better readability
- Structure information with headings (## for main topics, ### for subtopics)
- Use bullet points (-) for lists of items
- Use **bold** for important information or key terms
- Format links as [text](url) when available in the content
- Use numbered lists (1. 2. 3.) for step-by-step instructions
- Keep responses well-organized and scannable
- Use line breaks to separate different topics or sections`;

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
  private static async generateAIResponse(
    userQuery: string, 
    contentData: any, 
    additionalContext?: string
  ): Promise<LLMResult> {
    
    // Build context for the LLM - Professional website assistant
    let systemContext = `You are an AI assistant for this website. Your role is to help visitors using only verified information from the website's content.

🔒 SAFETY GUARDRAILS:
- Only provide information that exists in the actual website content
- Never invent or assume details not present in the provided data
- If information isn't available, clearly state this limitation
- Maintain a professional, helpful tone as a website representative
- Do NOT mention ContentStack, CMS, or any technical backend details
- Focus ONLY on the website's actual content, products, and services`;
    
    if (contentData?.success && contentData.data) {
      systemContext += `\n\n📊 WEBSITE CONTENT DATA:\n${JSON.stringify(contentData.data, null, 2)}
      
Use this content to answer the user's question about this website accurately and concisely. Talk about the website's content, not about ContentStack or CMS.`;
    } else if (contentData?.error) {
      systemContext += `\n\n⚠️ Content retrieval issue: ${contentData.error}
      
Since specific website content isn't available, inform the user that you need more information to help them with this website.`;
    }

    if (additionalContext) {
      systemContext += `\n\nAdditional verified context: ${additionalContext}`;
    }

    systemContext += `\n\n📝 RESPONSE REQUIREMENTS:
- Be concise and directly address the user's question about this website
- Reference specific website content when available  
- If content is unavailable, suggest alternative topics about the website
- Maintain a professional, website-appropriate tone
- Never mention ContentStack, CMS, or technical details
- For off-topic questions, redirect: "I'm here to help with information about this website"
- Format your response using markdown for better readability
- Use headings, bullet points, and bold text appropriately`;

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
      // NEVER expose raw data or technical details to end users
      const fallbackResponse = 'I apologize, but I\'m having trouble accessing the website information right now. Please try again in a moment, or rephrase your question.';
      
      return {
        success: true,
        content: fallbackResponse,
        error: 'LLM service unavailable',
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
