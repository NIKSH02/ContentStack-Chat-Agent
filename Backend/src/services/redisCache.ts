import { createClient, RedisClientType } from 'redis';

export class RedisCacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      this.client = createClient({
        url: 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        console.log('✅ Redis cache ready');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        console.warn('⚠️ Redis cache unavailable:', error.message);
      });

      await this.client.connect();
    } catch (error: any) {
      this.isConnected = false;
      console.warn('⚠️ Redis cache initialization failed:', error.message);
    }
  }

  private generateKey(tenantId: string, apiKey: string, tool: string, branch: string = 'main'): string {
    const shortApiKey = apiKey.substring(0, 10);
    const sanitizedTool = tool.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `mcp:${tenantId}:${shortApiKey}:${sanitizedTool}:${branch}`;
  }

  private getTTL(tool: string): number {
    if (tool.includes('tools') || tool.includes('list')) return 24 * 60 * 60; // 24 hours
    if (tool.includes('content_types')) return 45 * 60; // 45 minutes
    return 35 * 60; // 35 minutes for entries/assets
  }

  async get(tenantId: string, apiKey: string, tool: string, branch: string = 'main'): Promise<any | null> {
    if (!this.isConnected || !this.client) return null;

    try {
      const key = this.generateKey(tenantId, apiKey, tool, branch);
      const value = await this.client.get(key);
      
      if (value && typeof value === 'string') {
        console.log(`🎯 Cache HIT: ${tool}`);
        return JSON.parse(value);
      }
      
      return null;
    } catch (error) {
      console.warn(`Cache GET error for ${tool}:`, error);
      return null;
    }
  }

  // Set cached data - /
  async set(tenantId: string, apiKey: string, tool: string, data: any, branch: string = 'main'): Promise<void> {
    if (!this.isConnected || !this.client || !data) return;

    try {
      const key = this.generateKey(tenantId, apiKey, tool, branch);
      const ttl = this.getTTL(tool);
      
      await this.client.setEx(key, ttl, JSON.stringify(data));
      console.log(`💾 Cached: ${tool} (${ttl}s TTL)`);
    } catch (error) {
      console.warn(`Cache SET error for ${tool}:`, error);
    }
  }

  // Health check - /
  isReady(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const redisCacheService = new RedisCacheService();
