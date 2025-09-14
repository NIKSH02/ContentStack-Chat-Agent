import axios from 'axios';
import { CleanMessage, LLMResult } from '../../types';

// Simple Groq API functions
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const GROQ_MODELS = [
  'llama-3.1-8b-instant',
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
