import type { ChatAPIRequest } from '../types';

export class ContentstackChatAPI {
  private apiEndpoint: string;

  // constructor(apiEndpoint: string = 'http://localhost:5002/api/contentstack/query-stream') {
  constructor(apiEndpoint: string = 'http://localhost:5002/api/contentstack/query-stream') {
    this.apiEndpoint = apiEndpoint;
  }

  async sendMessageStream(
    request: ChatAPIRequest,
    onChunk: (chunk: string) => void,
    onComplete?: () => void,
    onError?: (error: string) => void,
    onStatus?: (status: string) => void,
    typingSpeed: number = 30, // milliseconds per character
    abortController?: AbortController // Add abort controller support
  ): Promise<void> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: abortController?.signal, // Support request cancellation
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let typingQueue: string[] = [];
      let isTyping = false;
      let isAborted = false;

      // Check if request was aborted
      const checkAborted = () => {
        if (abortController?.signal.aborted) {
          isAborted = true;
          typingQueue.length = 0; // Clear queue
          return true;
        }
        return false;
      };

      // Typing animation function with realistic delays
      const processTypingQueue = async () => {
        if (isTyping || typingQueue.length === 0 || isAborted) return;
        
        isTyping = true;
        
        while (typingQueue.length > 0 && !isAborted) {
          if (checkAborted()) break;
          
          const char = typingQueue.shift()!;
          onChunk(char);
          
          // Variable typing speed based on character type for realism
          let delay = typingSpeed;
          
          if (char === ' ') {
            delay = typingSpeed * 0.5; // Spaces are faster
          } else if (['.', '!', '?', ',', ';', ':'].includes(char)) {
            delay = typingSpeed * 2; // Punctuation is slower (natural pause)
          } else if (char === '\n') {
            delay = typingSpeed * 3; // Line breaks have longer pause
          }
          
          // Add small random variation for natural feel (±20%)
          const variation = delay * 0.2 * (Math.random() - 0.5);
          delay = Math.max(10, delay + variation);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        isTyping = false;
      };

      while (true) {
        if (checkAborted()) {
          reader.cancel();
          return; // Exit early if aborted
        }
        
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining characters in queue (only if not aborted)
          while (typingQueue.length > 0 && !isAborted) {
            if (checkAborted()) break;
            const char = typingQueue.shift()!;
            onChunk(char);
            await new Promise(resolve => setTimeout(resolve, typingSpeed));
          }
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Process any remaining characters in queue
              while (typingQueue.length > 0) {
                const char = typingQueue.shift()!;
                onChunk(char);
                await new Promise(resolve => setTimeout(resolve, typingSpeed));
              }
              onComplete?.();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                // Add characters to typing queue instead of sending immediately
                const chars = parsed.chunk.split('');
                typingQueue.push(...chars);
                
                // Start processing the queue
                processTypingQueue();
              } else if (parsed.type === 'status' && parsed.message) {
                // Handle status messages
                onStatus?.(parsed.message);
              } else if (parsed.type === 'complete') {
                // Handle completion
                while (typingQueue.length > 0) {
                  const char = typingQueue.shift()!;
                  onChunk(char);
                  await new Promise(resolve => setTimeout(resolve, typingSpeed));
                }
                onComplete?.();
                return;
              } else if (parsed.error) {
                onError?.(parsed.error);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          }
        }
      }

      if (!isAborted) {
        onComplete?.();
      }
    } catch (error) {
      // Don't report errors if the request was intentionally aborted
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled by user');
        return;
      }
      console.error('ContentStack Chat Streaming API Error:', error);
      onError?.(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // Utility method to create a properly formatted request
  createRequest(
    query: string,
    options: {
      tenantId?: string;
      apiKey?: string;
      projectId?: string;
      provider?: string;
      model?: string;
      sessionId?: string;
    } = {}
  ): ChatAPIRequest {
    return {
      query,
      tenantId: options.tenantId,
      apiKey: options.apiKey,
      projectId: options.projectId,
      provider: options.provider,
      model: options.model,
      sessionId: options.sessionId,
    };
  }
}

// Singleton instance for easy access
export const contentstackChatAPI = new ContentstackChatAPI();