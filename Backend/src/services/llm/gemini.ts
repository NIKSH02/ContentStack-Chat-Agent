import axios from 'axios';
import { CleanMessage, LLMResult } from '../../types';

// Simple Gemini API functions
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const GEMINI_MODELS = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',     // some error need to fix after wards
  'gemini-pro'
];

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Check if Gemini is configured
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Get available Gemini models
export function getGeminiModels(): string[] {
  return GEMINI_MODELS;
}

// Convert messages to Gemini format
function formatMessagesForGemini(messages: CleanMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  let systemMessage = '';
  
  // Extract system message
  for (const message of messages) {
    if (message.role === 'system') {
      systemMessage = message.content;
      continue;
    }
    
    // For first user message, prepend system context
    if (message.role === 'user' && systemMessage && contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: `${systemMessage}\n\nUser Query: ${message.content}` }]
      });
      systemMessage = ''; // Clear it after using
    } else {
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      });
    }
  }
  
  return contents;
}

// Send chat message to Gemini
export async function sendToGemini(messages: CleanMessage[], model: string = 'gemini-1.5-flash'): Promise<LLMResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const contents = formatMessagesForGemini(messages);
    
    const response = await axios.post(
      `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    return {
      success: true,
      content,
      model,
      provider: 'gemini'
    };
  } catch (error: any) {
    console.error('Gemini API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      provider: 'gemini'
    };
  }
}

// Send streaming chat message to Gemini
export async function sendToGeminiStream(
  messages: CleanMessage[], 
  model: string = 'gemini-1.5-flash',
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const contents = formatMessagesForGemini(messages);
    
    const response = await fetch(
      `${GEMINI_BASE_URL}/models/${model}:streamGenerateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
          }
        })
      }
    );

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
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Gemini streaming error:', error);
    throw new Error(`Gemini streaming failed: ${error.message}`);
  }
}

// Test Gemini connection
export async function testGemini(): Promise<LLMResult> {
  const testMessages: CleanMessage[] = [
    {
      role: 'user',
      content: 'Say "Gemini connection successful" to test the API.'
    }
  ];

  return await sendToGemini(testMessages);
}
