import OpenAI from 'openai';
import { CleanMessage, LLMResult } from '../../types';

// OpenRouter API functions (supports Mistral, OpenAI, and other models)
const OPENROUTER_MODELS = [
  // Mistral models (via OpenRouter)
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'mistralai/mistral-small-3.2-24b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'mistralai/mistral-7b-instruct:free',
  'mistralai/mixtral-8x7b-instruct:free',
  'mistralai/mistral-large-2407',
  // OpenAI models (via OpenRouter)
  'openai/gpt-oss-20b:free',
  // Other popular free models
  'meta-llama/llama-3.1-8b-instruct:free',
  'microsoft/phi-3-medium-128k-instruct:free'
];

// Initialize OpenRouter client
function createOpenRouterClient() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:3001",
      "X-Title": process.env.SITE_NAME || "Chat Agent Platform",
    },
  });
}

// Check if OpenRouter is configured
export function isOpenRouterAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

// Get available OpenRouter models
export function getOpenRouterModels(): string[] {
  return OPENROUTER_MODELS;
}

// Send chat message to OpenRouter (supports Mistral, OpenAI, and other models)
export async function sendToOpenRouter(
  messages: CleanMessage[], 
  model: string = 'openai/gpt-oss-20b:free'
): Promise<LLMResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  try {
    const openrouter = createOpenRouterClient();

    // Convert messages to OpenAI format (which OpenRouter uses)
    const openaiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const completion = await openrouter.chat.completions.create({
      model,
      messages: openaiMessages,
      max_tokens: 1000,
      temperature: 0.7,
    }, {
      headers: {
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3001",
        "X-Title": process.env.SITE_NAME || "Chat Agent Platform",
      }
    });

    return {
      success: true,
      content: completion.choices[0]?.message?.content || 'No response',
      model,
      provider: 'openrouter'
    };
  } catch (error: any) {
    console.error('OpenRouter API error:', error.message);
    return {
      success: false,
      error: error.message || 'OpenRouter API error',
      provider: 'openrouter'
    };
  }
}

// Send streaming chat message to OpenRouter
export async function sendToOpenRouterStream(
  messages: CleanMessage[], 
  model: string = 'openai/gpt-oss-20b:free',
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  try {
    const client = createOpenRouterClient();
    
    const stream = await client.chat.completions.create({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  } catch (error: any) {
    console.error('OpenRouter streaming error:', error);
    throw new Error(`OpenRouter streaming failed: ${error.message}`);
  }
}

// Test OpenRouter connection
export async function testOpenRouter(): Promise<LLMResult> {
  const testMessages: CleanMessage[] = [
    {
      role: 'user',
      content: 'Say "OpenRouter connection successful" to test the API.'
    }
  ];

  return await sendToOpenRouter(testMessages, 'openai/gpt-oss-20b:free');
}
