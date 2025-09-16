/**
 * In-Memory Conversation Memory Service
 * 
 * Manages short-term memory for chat sessions without database persistence.
 * Memory is cleared on server restart and page refresh, perfect for 
 * multi-website chat agents that need to scale.
 */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface SessionMemory {
  sessionId: string;
  tenantId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export class ConversationMemoryService {
  private static instance: ConversationMemoryService;
  private sessions: Map<string, SessionMemory> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  // Configuration
  private readonly MAX_MESSAGES_PER_SESSION = 50; // Prevent memory bloat
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Start automatic cleanup of expired sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL_MS);
    
    console.log('🧠 ConversationMemoryService initialized with in-memory storage');
  }

  public static getInstance(): ConversationMemoryService {
    if (!ConversationMemoryService.instance) {
      ConversationMemoryService.instance = new ConversationMemoryService();
    }
    return ConversationMemoryService.instance;
  }

  /**
   * Add a message to the conversation history
   */
  public addMessage(
    sessionId: string, 
    tenantId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): void {
    const now = new Date();
    
    if (!this.sessions.has(sessionId)) {
      // Create new session
      this.sessions.set(sessionId, {
        sessionId,
        tenantId,
        messages: [],
        createdAt: now,
        lastActivity: now
      });
    }

    const session = this.sessions.get(sessionId)!;
    
    // Add the message
    session.messages.push({
      role,
      content,
      timestamp: now
    });

    // Update last activity
    session.lastActivity = now;

    // Prevent memory bloat by limiting message count
    if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
      // Keep recent messages and remove oldest ones
      session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION);
    }

    console.log(`💬 Added ${role} message to session ${sessionId.slice(0, 8)}... (${session.messages.length} messages)`);
  }

  /**
   * Get conversation history for LLM context
   */
  public getConversationHistory(sessionId: string): ConversationMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    // Update last activity
    session.lastActivity = new Date();
    
    return [...session.messages]; // Return copy to prevent external modification
  }

  /**
   * Get formatted conversation for LLM (recent messages only)
   */
  public getFormattedConversation(sessionId: string, maxMessages: number = 10): ConversationMessage[] {
    const history = this.getConversationHistory(sessionId);
    
    // Return recent messages for context (exclude very old ones to save tokens)
    return history.slice(-maxMessages);
  }

  /**
   * Clear session memory (useful for testing or manual cleanup)
   */
  public clearSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`🗑️ Cleared session ${sessionId.slice(0, 8)}...`);
    }
    return deleted;
  }

  /**
   * Get current session count (for monitoring)
   */
  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session info for debugging
   */
  public getSessionInfo(sessionId: string): SessionMemory | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Clean up expired sessions automatically
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions. Active sessions: ${this.sessions.size}`);
    }
  }

  /**
   * Cleanup on server shutdown
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
    console.log('🧠 ConversationMemoryService shutdown complete');
  }
}

// Export singleton instance
export const conversationMemory = ConversationMemoryService.getInstance();