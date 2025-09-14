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
