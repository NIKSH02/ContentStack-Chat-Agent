import axios from 'axios';
import { CleanMessage, LLMResult } from '../../types';

// Simple Groq API functions
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'llama-3.3-70b-versatile',
  'mixtral-8x7b-32768',
  'gemma2-9b-it'
];

// Check if Groq is configured
export function isGroqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY;
}

// Get available Groq models
export function getGroqModels(): string[] {
  return GROQ_MODELS;
}

// Send chat message to Groq
export async function sendToGroq(messages: CleanMessage[], model: string = 'llama-3.1-8b-instant'): Promise<LLMResult> {
  if (!process.env.GROQ_API_KEY) {
    console.log("froq", process.env.GROQ_API_KEY);
    throw new Error('GROQ_API_KEY not configured');
  }

  try {
    // Clean messages to only include role and content (remove id, timestamp, metadata)
    const cleanMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await axios.post(
      `${GROQ_BASE_URL}/chat/completions`,
      {
        model,
        messages: cleanMessages,
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      content: response.data.choices[0]?.message?.content || 'No response',
      model,
      provider: 'groq'
    };
  } catch (error: any) {
    console.error('Groq API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      provider: 'groq'
    };
  }
}

// Estimate tokens in messages (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(messages: CleanMessage[]): number {
  const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
  return Math.ceil(totalChars / 4);
}

// Send streaming chat message to Groq
export async function sendToGroqStream(
  messages: CleanMessage[], 
  model: string = 'llama-3.1-8b-instant',
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  // Check payload size - Groq has limits around 8K tokens for most models
  const estimatedTokens = estimateTokens(messages);
  console.log(`🔍 Groq payload size check: ~${estimatedTokens} tokens`);
  
  if (estimatedTokens > 7000) {
    console.log(`⚠️ Payload too large for Groq streaming (${estimatedTokens} tokens > 7000), rejecting`);
    throw new Error(`Payload too large for Groq streaming: ${estimatedTokens} tokens`);
  }

  try {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
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

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              onChunk(delta);
            }
          } catch (e) {
            // Ignore parsing errors for individual chunks
          }
        }
      }
    }

  } catch (error) {
    console.error('Groq streaming error:', error);
    throw new Error(`Groq streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Test Groq connection
export async function testGroq(): Promise<LLMResult> {
  const testMessages: CleanMessage[] = [
    {
      role: 'user',
      content: 'Say "Groq connection successful" to test the API.'
    }
  ];

  return await sendToGroq(testMessages);
}
