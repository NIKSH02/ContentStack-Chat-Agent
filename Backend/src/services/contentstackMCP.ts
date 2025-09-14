import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface ContentStackMCPConfig {
  apiKey: string;
  projectId?: string;
  groups: 'launch' | 'cma' | 'both';
  region?: string; // Add region support
}

export interface MCPRequest {
  method: string;
  params: any;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * ContentStack MCP Service
 * Integrates with ContentStack's official MCP server
 */
export class ContentStackMCPService extends EventEmitter {
  private mcpProcess: ChildProcess | null = null;
  private config: ContentStackMCPConfig;
  private isConnected = false;

  constructor(config: ContentStackMCPConfig) {
    super();
    this.config = {
      ...config,
      region: config.region || 'EU' // Default to EU region as specified
    };
  }

  /**
   * Start the ContentStack MCP server
   */
  async startMCPServer(): Promise<void> {
    try {
      console.log('Starting ContentStack MCP server...');

      // Environment variables for the MCP server
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        CONTENTSTACK_API_KEY: this.config.apiKey,
        GROUPS: this.config.groups, // Use GROUPS instead of CONTENTSTACK_GROUPS
      };

      // Set region for EU (required for proper API endpoints)
      if (this.config.region) {
        env.CONTENTSTACK_REGION = this.config.region;
      }

      if (this.config.projectId) {
        env.CONTENTSTACK_LAUNCH_PROJECT_ID = this.config.projectId; // Use proper env var name
      }

      console.log('MCP Environment variables:');
      console.log('  API Key:', this.config.apiKey.substring(0, 8) + '...');
      console.log('  Groups:', this.config.groups);
      console.log('  Region:', this.config.region);
      console.log('  Project ID:', this.config.projectId || 'Not specified');

      // Start the MCP server process
      this.mcpProcess = spawn('npx', ['-y', '@contentstack/mcp'], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle process events
      this.mcpProcess.on('error', (error) => {
        console.error('MCP Process error:', error);
        this.emit('error', error);
      });

      this.mcpProcess.on('exit', (code) => {
        console.log(`MCP Process exited with code: ${code}`);
        this.isConnected = false;
        this.emit('disconnect');
      });

      // Handle stdout (responses from MCP server)
      if (this.mcpProcess.stdout) {
        this.mcpProcess.stdout.on('data', (data) => {
          const output = data.toString();
        //   console.log('MCP Server output:', output);  big o/p
          
          // Don't try to parse here - let sendRequest handle parsing
          // This is just for logging and monitoring
        });
      }

      // Handle stderr (errors and logs)
      if (this.mcpProcess.stderr) {
        this.mcpProcess.stderr.on('data', (data) => {
          console.error('MCP Server error:', data.toString());
        });
      }

      this.isConnected = true;
      console.log('✅ ContentStack MCP server started successfully');

    } catch (error) {
      console.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Send a request to the MCP server using proper JSON-RPC 2.0 protocol
   */
  async sendRequest(method: string, params: any = {}): Promise<MCPResponse> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.mcpProcess) {
        reject(new Error('MCP server not connected'));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      };

      let responseBuffer = '';
      let timeoutId: NodeJS.Timeout;

      // Set up response handler for this specific request
      const responseHandler = (data: Buffer) => {
        responseBuffer += data.toString();
        
        // Try to parse complete JSON messages
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || ''; // Keep incomplete line for next iteration
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line.trim());
              
              if (response.id === request.id) {
                // Clean up
                clearTimeout(timeoutId);
                if (this.mcpProcess?.stdout) {
                  this.mcpProcess.stdout.removeListener('data', responseHandler);
                }
                
                if (response.error) {
                  resolve({
                    success: false,
                    error: response.error.message || 'MCP request failed'
                  });
                } else {
                  resolve({
                    success: true,
                    data: response.result
                  });
                }
                return;
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete messages
              console.log('Parse error (ignoring):', parseError);
            }
          }
        }
      };

      // Set up stdout listener for this request
      if (this.mcpProcess.stdout) {
        this.mcpProcess.stdout.on('data', responseHandler);
      }

      // Send the request
      if (this.mcpProcess.stdin) {
        const requestString = JSON.stringify(request) + '\n';
        console.log('Sending MCP request:', requestString.trim());
        this.mcpProcess.stdin.write(requestString);
      } else {
        resolve({
          success: false,
          error: 'MCP server stdin not available'
        });
        return;
      }

      // Timeout after 30 seconds
      timeoutId = setTimeout(() => {
        if (this.mcpProcess?.stdout) {
          this.mcpProcess.stdout.removeListener('data', responseHandler);
        }
        resolve({
          success: false,
          error: 'Request timeout'
        });
      }, 30000);
    });
  }

  /**
   * Fetch content from ContentStack
   */
  async fetchContent(contentType: string = 'page'): Promise<MCPResponse> {
    try {
      // Use the MCP protocol to call the get_all_entries tool
      return await this.sendRequest('tools/call', {
        name: 'get_all_entries',
        arguments: {
          content_type_uid: contentType,
          limit: '10',
          include_count: true,
          branch: 'main'
        }
      });

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch content'
      };
    }
  }

  /**
   * Search content by type and term
   */
  async searchContent(contentType: string, searchTerm?: string): Promise<MCPResponse> {
    try {
      return await this.sendRequest('tools/call', {
        name: 'get_all_entries',
        arguments: {
          content_type_uid: contentType,
          limit: '10',
          include_count: true
        }
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search content'
      };
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listAvailableTools(): Promise<MCPResponse> {
    try {
      return await this.sendRequest('tools/list', {});
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to list tools'
      };
    }
  }

  /**
   * Get content types available in the stack
   */
  async getContentTypes(): Promise<MCPResponse> {
    try {
      // First, let's list available tools
      const toolsList = await this.listAvailableTools();
      console.log('Available tools:', toolsList);

      // Use the proper MCP tool calling protocol
      const result = await this.sendRequest('tools/call', {
        name: 'get_all_content_types',
        arguments: {
          branch: 'main'
        }
      });

      return result;

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get content types'
      };
    }
  }

  /**
   * Create new content entry
   */
  async createContent(contentType: string, data: any): Promise<MCPResponse> {
    try {
      return await this.sendRequest('tools/call', {
        name: 'contentstack_create_entry',
        arguments: {
          content_type: contentType,
          entry: data
        }
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create content'
      };
    }
  }

  /**
   * Update existing content entry
   */
  async updateContent(contentType: string, entryId: string, data: any): Promise<MCPResponse> {
    try {
      return await this.sendRequest('contentstack/update_entry', {
        content_type: contentType,
        entry_uid: entryId,
        entry: data
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update content'
      };
    }
  }

  /**
   * Stop the MCP server
   */
  async stopMCPServer(): Promise<void> {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
      this.isConnected = false;
      console.log('ContentStack MCP server stopped');
    }
  }

  /**
   * Check if MCP server is connected
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get the server process PID
   */
  getServerPID(): number | undefined {
    return this.mcpProcess?.pid;
  }

  /**
   * Get current configuration
   */
  getConfig(): ContentStackMCPConfig {
    return { ...this.config };
  }

  /**
   * Update configuration and restart server
   */
  async updateConfig(newConfig: Partial<ContentStackMCPConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isConnected) {
      await this.stopMCPServer();
      await this.startMCPServer();
    }
  }
}

// Singleton instance manager
class ContentStackMCPManager {
  private instances: Map<string, ContentStackMCPService> = new Map();

  /**
   * Get or create MCP instance for a tenant
   */
  getInstance(tenantId: string, config: ContentStackMCPConfig): ContentStackMCPService {
    const key = `${tenantId}-${config.apiKey}`;
    
    if (!this.instances.has(key)) {
      const instance = new ContentStackMCPService(config);
      this.instances.set(key, instance);
    }
    
    return this.instances.get(key)!;
  }

  /**
   * Remove instance for a tenant
   */
  async removeInstance(tenantId: string, apiKey: string): Promise<void> {
    const key = `${tenantId}-${apiKey}`;
    const instance = this.instances.get(key);
    
    if (instance) {
      await instance.stopMCPServer();
      this.instances.delete(key);
    }
  }

  /**
   * Get all active instances
   */
  getActiveInstances(): Map<string, ContentStackMCPService> {
    return this.instances;
  }
}

// Export singleton manager
export const contentStackMCPManager = new ContentStackMCPManager();
