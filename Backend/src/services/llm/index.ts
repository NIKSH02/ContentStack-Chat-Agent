import * as groq from './groq';
import * as gemini from './gemini';
import * as openrouter from './openrouter';
import { LLMProvider, CleanMessage, LLMResult } from '../../types';

// Simple LLM provider manager using functions
export function getAvailableProviders(): LLMProvider[] {

  const providers: LLMProvider[] = [];
  
  if (groq.isGroqAvailable()) {
    providers.push({
      name: 'groq',
      models: groq.getGroqModels(),
      available: true
    });
  }
  
  if (gemini.isGeminiAvailable()) {
    providers.push({
      name: 'gemini',
      models: gemini.getGeminiModels(),
      available: true
    });
  }
  
  if (openrouter.isOpenRouterAvailable()) {
    providers.push({
      name: 'openrouter',
      models: openrouter.getOpenRouterModels(),
      available: true
    });
  }
  
  return providers;
}

// Get default provider (first available)
export function getDefaultProvider(): string | null {
  const providers = getAvailableProviders();
  return providers.length > 0 ? providers[0].name : null;
}

// Send message to specific provider
export async function sendMessage(provider: string, messages: CleanMessage[], model?: string): Promise<LLMResult> {
  switch (provider) {
    case 'groq':
      return await groq.sendToGroq(messages, model);
    case 'gemini':
      return await gemini.sendToGemini(messages, model);
    case 'openrouter':
      return await openrouter.sendToOpenRouter(messages, model);
    default:
      return {
        success: false,
        error: `Provider '${provider}' not supported`,
        provider
      };
  }
}

// Send streaming message to specific provider
export async function sendMessageStream(
  provider: string, 
  messages: CleanMessage[], 
  onChunk: (chunk: string) => void,
  model?: string
): Promise<void> {
  switch (provider) {
    case 'groq':
      const { sendToGroqStream } = await import('./groq');
      return await sendToGroqStream(messages, model, onChunk);
    case 'gemini':
      const { sendToGeminiStream } = await import('./gemini');
      return await sendToGeminiStream(messages, model, onChunk);
    case 'openrouter':
      const { sendToOpenRouterStream } = await import('./openrouter');
      return await sendToOpenRouterStream(messages, model, onChunk);
    default:
      throw new Error(`Streaming not supported for provider '${provider}'`);
  }
}

// Send streaming message with fallback to other providers
export async function sendMessageStreamWithFallback(
  messages: CleanMessage[],
  onChunk: (chunk: string) => void,
  preferredProvider?: string,
  model?: string
): Promise<void> {
  const providers = getAvailableProviders();
  
  if (providers.length === 0) {
    throw new Error('No LLM providers available');
  }
  
  // Try preferred provider first
  if (preferredProvider) {
    try {
      await sendMessageStream(preferredProvider, messages, onChunk, model);
      return; // Success
    } catch (error: any) {
      console.log(`Streaming provider ${preferredProvider} failed, trying fallback...`, error.message);
    }
  }
  
  // Try other providers
  for (const provider of providers) {
    if (provider.name === preferredProvider) continue; // Already tried
    
    try {
      await sendMessageStream(provider.name, messages, onChunk, model);
      return; // Success
    } catch (error: any) {
      console.log(`Streaming provider ${provider.name} failed:`, error.message);
    }
  }
  
  throw new Error('All streaming providers failed');
}

// Send message with fallback to other providers
export async function sendMessageWithFallback(
  messages: CleanMessage[], 
  preferredProvider?: string, 
  model?: string
): Promise<LLMResult> {
  const providers = getAvailableProviders();
  
  if (providers.length === 0) {
    return {
      success: false,
      error: 'No LLM providers available',
      provider: 'none'
    };
  }
  
  // Try preferred provider first
  if (preferredProvider) {
    const result = await sendMessage(preferredProvider, messages, model);
    if (result.success) {
      return result;
    }
    console.log(`Provider ${preferredProvider} failed, trying fallback...`);
  }
  
  // Try other providers
  for (const provider of providers) {
    if (provider.name === preferredProvider) continue; // Already tried
    
    try {
      const result = await sendMessage(provider.name, messages, model);
      if (result.success) {
        return result;
      }
    } catch (error: any) {
      console.log(`Provider ${provider.name} failed:`, error.message);
    }
  }
  
  return {
    success: false,
    error: 'All providers failed',
    provider: 'fallback'
  };
}

// Test all available providers
export async function testAllProviders(): Promise<Record<string, LLMResult>> {
  const results: Record<string, LLMResult> = {};
  
  if (groq.isGroqAvailable()) {
    results.groq = await groq.testGroq();
  }
  
  if (gemini.isGeminiAvailable()) {
    results.gemini = await gemini.testGemini();
  }
  
  if (openrouter.isOpenRouterAvailable()) {
    results.openrouter = await openrouter.testOpenRouter();
  }
  
  return results;
}
