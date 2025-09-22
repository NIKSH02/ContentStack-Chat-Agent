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

    if (!content || content === 'No response') {
      console.warn('⚠️ Empty or no content from Gemini:', response.data);
    }

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
    
    console.log(`🤖 Gemini streaming request for model: ${model}`);
    console.log(`📝 Formatted contents count: ${contents.length}`);
    
    const requestBody = {
      contents,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    };

    const response = await fetch(
      `${GEMINI_BASE_URL}/models/${model}:streamGenerateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error (${response.status}): ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let accumulator = '';
    let hasReceivedContent = false;

    console.log(`🔄 Starting Gemini stream processing...`);

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log(`✅ Gemini stream completed. Content received: ${hasReceivedContent}`);
        break;
      }
      
      accumulator += decoder.decode(value, { stream: true });
      
      // Split on potential JSON object boundaries
      const parts = accumulator.split(/(?<=})\s*,?\s*(?={)/);
      
      // Keep the last incomplete part in accumulator
      accumulator = parts.pop() || '';
      
      // Process complete JSON objects
      for (const part of parts) {
        let jsonStr = part.trim();
        if (jsonStr.endsWith(',')) {
          jsonStr = jsonStr.slice(0, -1);
        }
        
        if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
          try {
            const parsed = JSON.parse(jsonStr);
            
            // Check for errors first
            if (parsed.error) {
              console.error('❌ Gemini API error in stream:', parsed.error);
              throw new Error(`Gemini API error: ${parsed.error.message || 'Unknown error'}`);
            }
            
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (content) {
              hasReceivedContent = true;
              onChunk(content);
              // console.log(`📝 Gemini chunk: "${content.substring(0, 50).replace(/\n/g, '\\n')}..."`);
            } else if (parsed.candidates?.[0]?.finishReason) {
              console.log(`🏁 Gemini finish reason: ${parsed.candidates[0].finishReason}`);
            }
            
          } catch (e) {
            // If JSON parsing fails, don't log as invalid - it might be partial
            console.log(`⚠️ Could not parse JSON chunk (might be partial): ${jsonStr.substring(0, 50)}...`);
          }
        }
      }
    }
    
    // Process any remaining content in accumulator
    if (accumulator.trim()) {
      let jsonStr = accumulator.trim();
      if (jsonStr.endsWith(',')) {
        jsonStr = jsonStr.slice(0, -1);
      }
      
      if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (content) {
            hasReceivedContent = true;
            onChunk(content);
            console.log(`📝 Final Gemini chunk: "${content.substring(0, 50).replace(/\n/g, '\\n')}..."`);
          }
        } catch (e) {
          console.log(`⚠️ Could not parse final JSON chunk: ${jsonStr.substring(0, 50)}...`);
        }
      }
    }

    // If no content was received, this indicates an issue
    if (!hasReceivedContent) {
      console.error('❌ No content received from Gemini stream');
      throw new Error('Gemini stream completed but no content was received');
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
